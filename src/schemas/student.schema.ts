import { z } from "zod";

/**
 * Create Student Schema (Admin creates student)
 * POST /api/admin/students
 */
export const createStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  enrollment_id: z.string().min(1, "Enrollment ID is required"),
  batch_id: z.number().int().positive("Batch ID is required"),
  leetcode_id: z.string().optional(),
  gfg_id: z.string().optional(),
});

/**
 * Update Student Schema
 * PATCH /api/admin/students/:id
 */
export const updateStudentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
  enrollment_id: z.string().optional(),
  leetcode_id: z.string().optional(),
  gfg_id: z.string().optional(),
});

/**
 * Update Student Profile Schema (Student updates own profile)
 * PUT /api/students/me
 */
export const updateProfileSchema = z.object({
  leetcode_id: z.string().optional(),
  gfg_id: z.string().optional(),
});

/**
 * Update Username Schema
 * PATCH /api/students/username
 */
export const updateUsernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
});

/**
 * Student ID Param Schema
 * For routes with :id param
 */
export const studentIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

/**
 * Student Query Schema (for listing students)
 * GET /api/admin/students
 */
export const studentQuerySchema = z.object({
  page: z.string().optional().transform(Number).default("1"),
  limit: z.string().optional().transform(Number).default("10"),
  search: z.string().optional(),
  batch_id: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
});

// Type exports
type CreateStudentInput = z.infer<typeof createStudentSchema>;
type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type UpdateUsernameInput = z.infer<typeof updateUsernameSchema>;
