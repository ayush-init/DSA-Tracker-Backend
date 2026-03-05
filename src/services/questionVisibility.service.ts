import prisma from "../config/prisma";

interface AssignQuestionsInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  questionIds: number[];
}

export const assignQuestionsToClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  questionIds,
}: AssignQuestionsInput) => {

  if (!questionIds || questionIds.length === 0) {
    throw new Error("No questions provided");
  }

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,  // Add topic validation
    },
  });

  if (!cls) {
    throw new Error("Class not found in this topic and batch");
  }

  const data = questionIds.map((qid) => ({
    class_id: cls.id,
    question_id: qid,
  }));

  await prisma.questionVisibility.createMany({
    data,
    skipDuplicates: true,
  });

  return { assignedCount: questionIds.length };
};

interface GetAssignedInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
}

export const getAssignedQuestionsOfClassService = async ({
  batchId,
  topicSlug,
  classSlug,
}: GetAssignedInput) => {

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,  // Add topic validation
    },
  });

  if (!cls) {
    throw new Error("Class not found in this topic and batch");
  }

  const assigned = await prisma.questionVisibility.findMany({
    where: {
      class_id: cls.id,
    },
    include: {
      question: {
        include: {
          topic: {
            select: { topic_name: true, slug: true },
          },
        },
      },
    },
    orderBy: {
      assigned_at: "desc",
    },
  });

  return assigned.map((qv) => qv.question);
};

interface RemoveQuestionInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  questionId: number;
}

export const removeQuestionFromClassService = async ({
  batchId,
  topicSlug,
  classSlug,
  questionId,
}: RemoveQuestionInput) => {

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,  // Add topic validation
    },
  });

  if (!cls) {
    throw new Error("Class not found in this topic and batch");
  }

  await prisma.questionVisibility.deleteMany({
    where: {
      class_id: cls.id,
      question_id: questionId,
    },
  });

  return true;
};