import slugify from "slugify";
import prisma from "../config/prisma";


interface CreateTopicInput {
  topic_name: string;
}

export const createTopicService = async ({
  topic_name,
}: CreateTopicInput) => {

  if (!topic_name) {
    throw new Error("Topic name is required");
  }

  const baseSlug = slugify(topic_name, {
    lower: true,
    strict: true,
  });

  let finalSlug = baseSlug;
  let counter = 1;

  // Ensure global unique slug
  while (
    await prisma.topic.findUnique({
      where: { slug: finalSlug },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  try {
    const topic = await prisma.topic.create({
      data: {
        topic_name,
        slug: finalSlug,
      },
    });

    return topic;

  } catch (error: any) {
    if (error.code === "P2002") {
      throw new Error("Topic already exists");
    }

    throw new Error("Failed to create topic");
  }
};


export const getAllTopicsService = async () => {

  const topics = await prisma.topic.findMany({
    orderBy: { created_at: "desc" },
  });

  return topics;
};

interface GetTopicsForBatchInput {
  batchId: number;
}

export const getTopicsForBatchService = async ({
  batchId,
}: GetTopicsForBatchInput) => {

  const topics = await prisma.topic.findMany({
    include: {
      classes: {
        where: {
          batch_id: batchId
        },
        include: {
          questionVisibility: {
            include: {
              question: {
                select: {
                  id: true
                }
              }
            }
          }
        }
      }
    }
  });

  const formatted = topics.map(topic => {

    const uniqueQuestions = new Set<number>();

    topic.classes.forEach(cls => {
      cls.questionVisibility.forEach(qv => {
        uniqueQuestions.add(qv.question.id);
      });
    });

    return {
      id: topic.id,
      topic_name: topic.topic_name,
      slug: topic.slug,
      classCount: topic.classes.length,
      questionCount: uniqueQuestions.size
    };
  });

  return formatted;
};

interface UpdateTopicInput {
  id: number;
  topic_name: string;
}

export const updateTopicService = async ({
  id,
  topic_name,
}: UpdateTopicInput) => {

  if (!topic_name) {
    throw new Error("Topic name is required");
  }

  const existingTopic = await prisma.topic.findUnique({
    where: { id },
  });

  if (!existingTopic) {
    throw new Error("Topic not found");
  }

  const duplicate = await prisma.topic.findUnique({
    where: { topic_name },
  });

  if (duplicate && duplicate.id !== existingTopic.id) {
    throw new Error("Topic already exists");
  }

  const baseSlug = slugify(topic_name, {
    lower: true,
    strict: true,
  });

  let finalSlug = baseSlug;
  let counter = 1;

  while (
    await prisma.topic.findFirst({
      where: {
        slug: finalSlug,
        NOT: { id: existingTopic.id },
      },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const updatedTopic = await prisma.topic.update({
    where: { id },
    data: {
      topic_name,
      slug: finalSlug,
    },
  });

  return updatedTopic;
};

interface DeleteTopicInput {
  id: number;
}

export const deleteTopicService = async ({ id }: DeleteTopicInput) => {

  const topic = await prisma.topic.findUnique({
    where: { id },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const classCount = await prisma.class.count({
    where: { topic_id: id },
  });

  if (classCount > 0) {
    throw new Error("Cannot delete topic with existing classes");
  }

  const questionCount = await prisma.question.count({
    where: { topic_id: id },
  });

  if (questionCount > 0) {
    throw new Error("Cannot delete topic with existing questions");
  }

  await prisma.topic.delete({
    where: { id },
  });

  return true;
};