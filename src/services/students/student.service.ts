/**
 * Student Service - Core student data management
 * Handles student CRUD operations, authentication, and profile updates
 * Provides database operations for student lifecycle management
 */

import prisma from "../../config/prisma";
import bcrypt from "bcryptjs";
import { generateUsername } from "../../utils/usernameGenerator";
import { Prisma } from "@prisma/client";
import { HTTP_STATUS } from '../../utils/errorMapper';
import { ApiError } from "../../utils/ApiError";
import { CacheInvalidation } from "../../utils/cacheInvalidation";
import { StudentData, StudentUpdateData, PrismaKnownError } from '../../types/common.types';
import redis from "../../config/redis";
import { CACHE_TTL } from "../../config/cache.config";
import { buildCacheKey, setWithTTL } from "../../utils/redisUtils";

export const createStudentService = async (data: StudentData) => {
    try {

        const {
            name,
            email,
            username,
            password,
            enrollment_id,
            batch_id,
            leetcode_id,
            gfg_id
        } = data;

        // Only require name and email, username will be generated if not provided
        if (!name || !email) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Name and email are required");
        }

        // Generate username if not provided or empty
        let finalUsername = username;
        if (!finalUsername || finalUsername === "") {
            const usernameResult = await generateUsername(name, enrollment_id);
            finalUsername = usernameResult.finalUsername;
        }

        // batch exist check karo
        const batch = await prisma.batch.findUnique({
            where: { id: batch_id },
            select: {
                id: true,
                city_id: true
            }
        });

        if (!batch) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, "Batch not found");
        }

        let password_hash = null;

        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }

        const student = await prisma.student.create({
            data: {
                name,
                email,
                username: finalUsername,
                password_hash,
                enrollment_id,
                batch_id,
                city_id: batch.city_id, // city automatically batch se
                leetcode_id,
                gfg_id
            }
        });

        return student;

    } catch (error: unknown) {

        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2002") {

                const field = error.meta?.target as string[] | undefined;

                if (field?.includes("email"))
                    throw new ApiError(HTTP_STATUS.CONFLICT, "Email already exists", [], "EMAIL_ALREADY_EXISTS");

                if (field?.includes("username"))
                    throw new ApiError(HTTP_STATUS.CONFLICT, "Username already exists");

                if (field?.includes("enrollment_id"))
                    throw new ApiError(HTTP_STATUS.CONFLICT, "Enrollment ID already exists");

                if (field?.includes("google_id"))
                    throw new ApiError(HTTP_STATUS.CONFLICT, "Google account already linked");

                throw new ApiError(HTTP_STATUS.CONFLICT, "Duplicate field detected");
            }

            if (error.code === "P2003") {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid batch reference");
            }
        }

        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to create student");
    }
};

export const updateStudentDetailsService = async (id: number, body: StudentUpdateData) => {
    try {

        const student = await prisma.student.findUnique({
            where: { id }
        });

        if (!student) {
            throw new ApiError(400, "Student not found");
        }

        const updateData: StudentUpdateData = { ...body };

        const updatedStudent = await prisma.student.update({
            where: { id },
            data: updateData
        });

        // Invalidate caches when student profile data changes
        await CacheInvalidation.invalidateAllLeaderboards();
        
        // Invalidate getCurrentStudent cache
        const cacheKey = buildCacheKey(`student:me:${id}`, {});
        await redis.del(cacheKey);

        return updatedStudent;

    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student not found");
            }
            if (error.code === "P2002") {
                throw new ApiError(HTTP_STATUS.CONFLICT, "Email, Username or Enrollment ID already exists");
            }
            if (error.code === "P2003") {
                throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid city or batch reference");
            }
        }
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to update student");
    }
};

export const deleteStudentDetailsService = async (id: number) => {
    try {

        const student = await prisma.student.findUnique({
            where: { id }
        });

        if (!student) {
            throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student not found");
        }

        await prisma.student.delete({
            where: { id }
        });

        return true;

    } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                throw new ApiError(HTTP_STATUS.NOT_FOUND, "Student not found");
            }
        }
        throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to delete student");
    }
};

export const getCurrentStudentService = async (studentId: number) => {
  // Generate stable deterministic cache key
  const cacheKey = buildCacheKey(`student:me:${studentId}`, {});
  
  // 1. Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log('=== REDIS CACHE HIT ===');
    console.log(`[CACHE HIT] student_me for student ${studentId}`);
    console.log(`Cache Key: ${cacheKey}`);
    console.log(`Data Source: Redis Cache`);
    console.log('========================');
    return JSON.parse(cached);
  }
  
  console.log('=== DATABASE FETCH ===');
  console.log(`[CACHE MISS] student_me for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`Data Source: Database Query`);
  console.log('===================');

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      username: true,
      city: {
        select: {
          id: true,
          city_name: true
        }
      },
      batch: {
        select: {
          id: true,
          batch_name: true,
          year: true
        }
      },
      email: true,
      profile_image_url: true,
      leetcode_id: true,
      gfg_id: true
    }
  });

  if (!student) {
    throw new ApiError(404, "Student not found", [], "STUDENT_NOT_FOUND");
  }

  // Cache result with optimized TTL
  const serializedResult = JSON.stringify(student);
  await setWithTTL(cacheKey, serializedResult, CACHE_TTL.studentProfile);
  
  console.log('=== CACHE STORAGE ===');
  console.log(`[CACHE STORE] student_me for student ${studentId}`);
  console.log(`Cache Key: ${cacheKey}`);
  console.log(`TTL: ${CACHE_TTL.studentProfile} seconds (${CACHE_TTL.studentProfile/60} minutes)`);
  console.log(`Data Source: Database Query -> Cached in Redis`);
  console.log('====================');

  return student;
};
