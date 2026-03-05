import slugify from "slugify";
import prisma from "../config/prisma";

interface GetClassesByTopicInput {
  batchId: number;
  topicSlug: string;
}

export const getClassesByTopicService = async ({
  batchId,
  topicSlug,
}: GetClassesByTopicInput) => {

  if (!topicSlug) {
    throw new Error("Invalid topic slug");
  }

  const classes = await prisma.class.findMany({
    where: {
      batch_id: batchId,
      topic: {
        slug: topicSlug,
      },
    },
    include: {
      topic: true, // so we can validate topic existence
      _count: {
        select: {
          questionVisibility: true,
        },
      },
    },
    orderBy: {
      class_date: "asc",
    },
  });

  // If no classes found, we must check whether topic exists
  if (classes.length === 0) {
    const topicExists = await prisma.topic.findUnique({
      where: { slug: topicSlug },
    });

    if (!topicExists) {
      throw new Error("Topic not found");
    }
  }

  const formatted = classes.map((cls) => ({
    id: cls.id,
    class_name: cls.class_name,
    slug: cls.slug,
    description: cls.description,
    pdf_url: cls.pdf_url,
    duration_minutes: cls.duration_minutes,
    class_date: cls.class_date,
    questionCount: cls._count.questionVisibility,
    created_at: cls.created_at,
  }));

  return formatted;
};

interface CreateClassInput {
  batchId: number;
  topicSlug: string;
  class_name: string;
  description?: string;
  pdf_url?: string;
  duration_minutes?: number;
  class_date?: string;
}

export const createClassInTopicService = async ({
  batchId,
  topicSlug,
  class_name,
  description,
  pdf_url,
  duration_minutes,
  class_date,
}: CreateClassInput) => {

  console.log("Creating class with:", { batchId, topicSlug, class_name, class_date });

  if (!topicSlug) {
    throw new Error("Invalid topic slug");
  }

  if (!class_name) {
    throw new Error("Class name is required");
  }

  // 1️⃣ Find Topic
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  console.log("Found topic:", topic);

  if (!topic) {
    throw new Error(`Topic not found with slug: ${topicSlug}`);
  }

  // 2️⃣ Check duplicate inside same topic + batch (unique across both)
  const duplicateName = await prisma.class.findFirst({
    where: {
      topic_id: topic.id,
      batch_id: batchId,
      class_name,
    },
  });

  if (duplicateName) {
    throw new Error(
      "Class with same name already exists in this topic"
    );
  }

  // 3️⃣ Generate slug unique across topic + batch
  const baseSlug = slugify(class_name, {
    lower: true,
    strict: true,
  });

  let finalSlug = baseSlug;
  let counter = 1;

  while (
    await prisma.class.findFirst({
      where: {
        slug: finalSlug,       // ✅ Global slug uniqueness
      },
    })
  ) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  // 4️⃣ Create class
  let processedDate = null;
  if (class_date) {
    try {
      processedDate = new Date(class_date);
      
      // Validate date
      if (isNaN(processedDate.getTime())) {
        throw new Error("Invalid date format");
      }
      
      console.log("Processed date:", processedDate);
    } catch (error) {
      throw new Error("Invalid date format. Use valid date string");
    }
  }

  const newClass = await prisma.class.create({
    data: {
      class_name,
      slug: finalSlug,
      description,
      pdf_url,
      duration_minutes,
      class_date: processedDate,
      topic_id: topic.id,
      batch_id: batchId,
    },
  });

  return newClass;
};


interface GetClassDetailsInput {
  batchId: number;
  classSlug: string;
}

export const getClassDetailsService = async ({
  batchId,
  classSlug,
}: GetClassDetailsInput) => {

  if (!classSlug) {
    throw new Error("Invalid class slug");
  }

  const cls = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
    },
    include: {
      topic: {
        select: {
          id: true,
          topic_name: true,
          slug: true,
        },
      },
      questionVisibility: {
        include: {
          question: {
            select: {
              id: true,
              question_name: true,
              level: true,
              platform: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!cls) {
    throw new Error("Class not found in this batch");
  }

  const formatted = {
    id: cls.id,
    class_name: cls.class_name,
    slug: cls.slug,
    description: cls.description,
    pdf_url: cls.pdf_url,
    duration_minutes: cls.duration_minutes,
    class_date: cls.class_date,
    created_at: cls.created_at,
    topic: cls.topic,
    questions: cls.questionVisibility.map((qv) => qv.question),
    questionCount: cls.questionVisibility.length,
  };

  return formatted;
};

interface UpdateClassInput {
  batchId: number;
  classSlug: string;
  class_name?: string;
  description?: string;
  pdf_url?: string;
  duration_minutes?: number;
  class_date?: string;
}

export const updateClassService = async ({
  batchId,
  classSlug,
  class_name,
  description,
  pdf_url,
  duration_minutes,
  class_date,
}: UpdateClassInput) => {

  if (!classSlug) {
    throw new Error("Invalid class slug");
  }

  const existingClass = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
    },
  });

  if (!existingClass) {
    throw new Error("Class not found in this batch");
  }

  const finalClassName = class_name ?? existingClass.class_name;

  // Prevent duplicate name in same topic + batch
  const duplicate = await prisma.class.findFirst({
    where: {
      topic_id: existingClass.topic_id,
      batch_id: batchId,
      class_name: finalClassName,
      NOT: { id: existingClass.id },
    },
  });

  if (duplicate) {
    throw new Error(
      "Class with same name already exists in this topic"
    );
  }

  let newSlug = existingClass.slug;

  if (class_name) {
    const baseSlug = slugify(class_name, {
      lower: true,
      strict: true,
    });

    newSlug = baseSlug;
    let counter = 1;

    while (
      await prisma.class.findFirst({
        where: {
          batch_id: batchId,
          slug: newSlug,
          NOT: { id: existingClass.id },
        },
      })
    ) {
      newSlug = `${baseSlug}-${counter++}`;
    }
  }

  const updatedClass = await prisma.class.update({
    where: { id: existingClass.id },
    data: {
      class_name: finalClassName,
      slug: newSlug,
      description: description ?? existingClass.description,
      pdf_url: pdf_url ?? existingClass.pdf_url,
      duration_minutes:
        duration_minutes ?? existingClass.duration_minutes,
      class_date: class_date
        ? new Date(class_date)
        : existingClass.class_date,
    },
  });

  return updatedClass;
};

interface DeleteClassInput {
  batchId: number;
  classSlug: string;
}

export const deleteClassService = async ({
  batchId,
  classSlug,
}: DeleteClassInput) => {

  const existingClass = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
    },
  });

  if (!existingClass) {
    throw new Error("Class not found in this batch");
  }

  const questionCount = await prisma.questionVisibility.count({
    where: { class_id: existingClass.id },
  });

  if (questionCount > 0) {
    throw new Error(
      "Cannot delete class with assigned questions"
    );
  }

  await prisma.class.delete({
    where: { id: existingClass.id },
  });

  return true;
};
