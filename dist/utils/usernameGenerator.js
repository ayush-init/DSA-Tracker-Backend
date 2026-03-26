"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUsername = generateUsername;
exports.validateUsernameFormat = validateUsernameFormat;
exports.generateUsernameSuggestions = generateUsernameSuggestions;
exports.fixExistingNullUsernames = fixExistingNullUsernames;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * Generates a username from student's name and enrollment ID
 * Format: first3_lastname_enrollmentId
 * Example: "Ayush Chaurasiya" + "375" → "ayu_cha_375"
 */
async function generateUsername(name, enrollmentId) {
    if (!name) {
        throw new Error("Name is required for username generation");
    }
    // Split name into parts
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts[1] || "";
    // Take first 3 letters of first name (lowercase)
    const firstNamePart = firstName.toLowerCase().slice(0, 3);
    // Take first 3 letters of last name (lowercase)
    const lastNamePart = lastName.toLowerCase().slice(0, 3);
    // Clean enrollment ID (remove non-alphanumeric, take last 3 digits if longer)
    let enrollmentPart = "";
    if (enrollmentId) {
        const cleanEnrollment = enrollmentId.replace(/[^a-zA-Z0-9]/g, "");
        enrollmentPart = cleanEnrollment.slice(-3); // Take last 3 characters
    }
    // Generate base username
    let baseUsername = `${firstNamePart}_${lastNamePart}`;
    if (enrollmentPart) {
        baseUsername += `_${enrollmentPart}`;
    }
    // Check if username already exists
    const existingUser = await prisma_1.default.student.findFirst({
        where: {
            username: baseUsername,
        },
        select: {
            username: true,
        },
    });
    let finalUsername = baseUsername;
    let isDuplicate = false;
    // If username exists, append a number
    if (existingUser) {
        isDuplicate = true;
        let counter = 1;
        // Find the next available username
        while (true) {
            const candidateUsername = `${baseUsername}${counter}`;
            const candidateExists = await prisma_1.default.student.findFirst({
                where: {
                    username: candidateUsername,
                },
                select: {
                    username: true,
                },
            });
            if (!candidateExists) {
                finalUsername = candidateUsername;
                break;
            }
            counter++;
            // Safety check to prevent infinite loop
            if (counter > 999) {
                throw new Error("Unable to generate unique username after 999 attempts");
            }
        }
    }
    return {
        baseUsername,
        finalUsername,
        isDuplicate,
    };
}
/**
 * Validates a generated username format
 */
function validateUsernameFormat(username) {
    // Username should be 3-30 characters, lowercase letters, numbers, and underscores only
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    return usernameRegex.test(username);
}
/**
 * Generates multiple username suggestions for a given name
 */
async function generateUsernameSuggestions(name, enrollmentId, count = 5) {
    const suggestions = [];
    try {
        const primary = await generateUsername(name, enrollmentId);
        suggestions.push(primary.finalUsername);
        // Generate variations if we need more suggestions
        if (suggestions.length < count) {
            const nameParts = name.trim().split(/\s+/);
            const firstName = nameParts[0] || "";
            const lastName = nameParts[nameParts.length - 1] || "";
            // Variation 1: Full first name + last initial
            const variation1 = `${firstName.toLowerCase()}_${lastName.toLowerCase().slice(0, 1)}`;
            if (validateUsernameFormat(variation1)) {
                suggestions.push(variation1);
            }
            // Variation 2: First initial + full last name
            const variation2 = `${firstName.toLowerCase().slice(0, 1)}_${lastName.toLowerCase()}`;
            if (validateUsernameFormat(variation2)) {
                suggestions.push(variation2);
            }
            // Variation 3: Numbers based on enrollment
            if (enrollmentId) {
                const cleanEnrollment = enrollmentId.replace(/[^a-zA-Z0-9]/g, "");
                const variation3 = `${firstName.toLowerCase().slice(0, 3)}_${cleanEnrollment.slice(-4)}`;
                if (validateUsernameFormat(variation3)) {
                    suggestions.push(variation3);
                }
            }
        }
    }
    catch (error) {
        console.error("Error generating username suggestions:", error);
    }
    return suggestions.slice(0, count);
}
/**
 * Updates all existing students with empty usernames
 */
async function fixExistingNullUsernames() {
    const studentsWithNullUsername = await prisma_1.default.student.findMany({
        where: {
            username: ""
        }
    });
    console.log(`Found ${studentsWithNullUsername.length} students with null usernames`);
    for (const student of studentsWithNullUsername) {
        try {
            const result = await generateUsername(student.name, student.enrollment_id || undefined);
            await prisma_1.default.student.update({
                where: { id: student.id },
                data: { username: result.finalUsername }
            });
            console.log(`Updated student ${student.name} (${student.id}) with username: ${result.finalUsername}`);
        }
        catch (error) {
            console.error(`Failed to update username for student ${student.id}:`, error);
        }
    }
    console.log("Username migration completed");
}
