import { z } from "zod";

/**
 * Question Type enum for assignments
 */
export const QuestionTypeEnum = z.enum(["HOMEWORK", "CLASSWORK"]);

/**
 * Create Topic Schema
 * POST /api/admin/topics
 */
export const createTopicSchema = z.object({
  topic_name: z.string().min(1, "Topic name is required"),
  description: z.string().optional(),
  photo: z.any().optional(), // File upload handled by multer
});

/**
 * Update Topic Schema
 * PUT /api/admin/topics/:slug
 */
export const updateTopicSchema = z.object({
  topic_name: z.string().min(1, "Topic name is required").optional(),
  description: z.string().optional(),
  photo: z.any().optional(),
  removePhoto: z.union([z.boolean(), z.string()]).optional(),
});

/**
 * Create Class Schema
 * POST /api/admin/topics/:topicSlug/classes
 */
export const createClassSchema = z.object({
  class_name: z.string().min(1, "Class name is required"),
  duration_minutes: z.string().optional(),
  description: z.string().optional(),
  pdf_url: z.string().optional(),
});

/**
 * Update Class Schema
 * PUT /api/admin/classes/:id
 */
export const updateClassSchema = z.object({
  class_name: z.string().min(1, "Class name is required").optional(),
  duration_minutes: z.string().optional(),
  description: z.string().optional(),
  pdf_url: z.string().optional(),
});

/**
 * Assign Questions to Class Schema
 * POST /api/admin/assign-questions
 */
export const assignQuestionsSchema = z.object({
  question_ids: z.array(z.number().int().positive()).min(1, "At least one question is required"),
  class_id: z.number().int().positive("Class ID is required"),
  type: QuestionTypeEnum,
});

/**
 * Topic Slug Param Schema
 */
export const topicSlugParamSchema = z.object({
  topicSlug: z.string().min(1, "Topic slug is required"),
});

/**
 * Class ID Param Schema
 */
export const classIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, "ID must be a number").transform(Number),
});

/**
 * Class Slug Param Schema
 */
export const classSlugParamSchema = z.object({
  topicSlug: z.string().min(1, "Topic slug is required"),
  classSlug: z.string().min(1, "Class slug is required"),
});

// Type exports
type CreateTopicInput = z.infer<typeof createTopicSchema>;
type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
type CreateClassInput = z.infer<typeof createClassSchema>;
type UpdateClassInput = z.infer<typeof updateClassSchema>;
type AssignQuestionsInput = z.infer<typeof assignQuestionsSchema>;
