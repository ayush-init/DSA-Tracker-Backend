import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";
import { detectPlatform } from "./question-utils.service";
import { CreateQuestionDTO, UpdateQuestionDTO } from "../../types/question.types";

// Alias for compatibility with existing code
type CreateQuestionInput = CreateQuestionDTO;
type UpdateQuestionInput = UpdateQuestionDTO & { id: number; };

export const createQuestionService = async ({
  question_name,
  question_link,
  topic_id,
  platform,
  level = "MEDIUM",
}: CreateQuestionInput) => {

  if (!question_name || !question_link || !topic_id) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Validate topic
  const topic = await prisma.topic.findUnique({
    where: { id: topic_id },
  });

  if (!topic) {
    throw new ApiError(400, "Topic not found");
  }

  // Auto detect platform if not provided
  const finalPlatform =
    platform ?? detectPlatform(question_link);

  // Prevent duplicate question link (must be unique across all topics)
  const duplicate = await prisma.question.findFirst({
    where: {
      question_link,
    },
  });

  if (duplicate) {
    throw new ApiError(400, "Question link already exists", [], "QUESTION_LINK_EXISTS");
  }

  const question = await prisma.question.create({
    data: {
      question_name,
      question_link,
      topic_id,
      platform: finalPlatform,
      level,
    },
  });

  return question;
};

export const updateQuestionService = async ({
  id,
  question_name,
  question_link,
  topic_id,
  level,
  platform,
}: UpdateQuestionInput) => {

  const existing = await prisma.question.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(400, "Question not found");
  }

  const finalTopicId = topic_id ?? existing.topic_id;

  // Validate topic if changed
  if (topic_id) {
    const topic = await prisma.topic.findUnique({
      where: { id: topic_id },
    });

    if (!topic) {
      throw new ApiError(400, "Topic not found");
    }
  }

  const finalLink = question_link ?? existing.question_link;

  // Prevent duplicate link (must be unique across all topics)
  const duplicate = await prisma.question.findFirst({
    where: {
      question_link: finalLink,
      NOT: { id: existing.id },
    },
  });

  if (duplicate) {
    throw new ApiError(400, "Question link already exists", [], "QUESTION_LINK_EXISTS");
  }

  const updated = await prisma.question.update({
    where: { id },
    data: {
      question_name: question_name ?? existing.question_name,
      question_link: finalLink,
      topic_id: finalTopicId,
      level: level ?? existing.level,
      platform: platform ?? existing.platform,
    },
  });

  return updated;
};

interface DeleteQuestionInput {
  id: number;
}

export const deleteQuestionService = async ({
  id,
}: DeleteQuestionInput) => {

  const existing = await prisma.question.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(400, "Question not found");
  }

  const visibilityCount = await prisma.questionVisibility.count({
    where: { question_id: id },
  });

  if (visibilityCount > 0) {
    throw new ApiError(400, 
                "Cannot delete question assigned to classes"
              );
  }

  const progressCount = await prisma.studentProgress.count({
    where: { question_id: id },
  });

  if (progressCount > 0) {
    throw new ApiError(400, 
                "Cannot delete question with student progress"
              );
  }

  await prisma.question.delete({
    where: { id },
  });

  return true;
};
