const prisma = require("../config/prisma").default;

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

  // Check if username exists, if so append random digits
  let finalUsername = baseUsername;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existingUser = await prisma.student.findUnique({
      where: { username: finalUsername }
    });

    if (!existingUser) {
      break; // Username is available
    }

    // If username exists, append random 2-3 digits
    const randomSuffix = Math.floor(Math.random() * (999 - 10 + 1)) + 10;
    finalUsername = `${baseUsername}_${randomSuffix}`;
    attempts++;
  }

  if (attempts >= maxAttempts) {
    // Fallback: use timestamp
    finalUsername = `${baseUsername}_${Date.now() % 10000}`;
  }

  return finalUsername;
}

/**
 * Updates all existing students with null usernames
 */
async function fixExistingNullUsernames() {
  const studentsWithNullUsername = await prisma.student.findMany({
    where: { username: null }
  });

  console.log(`Found ${studentsWithNullUsername.length} students with null usernames`);

  for (const student of studentsWithNullUsername) {
    try {
      const newUsername = await generateUsername(student.name, student.enrollment_id || undefined);
      
      await prisma.student.update({
        where: { id: student.id },
        data: { username: newUsername }
      });

      console.log(`Updated student ${student.name} (${student.id}) with username: ${newUsername}`);
    } catch (error) {
      console.error(`Failed to update username for student ${student.id}:`, error);
    }
  }

  console.log("Username migration completed");
}

module.exports = {
  generateUsername,
  fixExistingNullUsernames
};
