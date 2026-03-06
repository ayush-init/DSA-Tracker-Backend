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
        topic_id: topic.id,    // ✅ Same topic
        batch_id: batchId,     // ✅ Same batch  
        slug: finalSlug,       // ✅ Same slug
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
  topicSlug: string;
  classSlug: string;
}

export const getClassDetailsService = async ({
  batchId,
  topicSlug,
  classSlug,
}: GetClassDetailsInput) => {

  if (!classSlug) {
    throw new Error("Invalid class slug");
  }

  if (!topicSlug) {
    throw new Error("Invalid topic slug");
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
    include: {
      topic: {
        select: {
          id: true,
          topic_name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          questionVisibility: true,
        },
      },
    },
  });

  if (!cls) {
    throw new Error("Class not found in this topic and batch");
  }

  return {
    id: cls.id,
    class_name: cls.class_name,
    slug: cls.slug,
    description: cls.description,
    pdf_url: cls.pdf_url,
    duration_minutes: cls.duration_minutes,
    class_date: cls.class_date,
    questionCount: cls._count.questionVisibility,
    topic: cls.topic,
    created_at: cls.created_at,
  };
};

interface UpdateClassInput {
  batchId: number;
  topicSlug: string;
  classSlug: string;
  class_name?: string;
  description?: string;
  pdf_url?: string;
  duration_minutes?: number;
  class_date?: string;
}

export const updateClassService = async ({
  batchId,
  topicSlug,
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

  if (!topicSlug) {
    throw new Error("Invalid topic slug");
  }

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const existingClass = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,
    },
  });

  if (!existingClass) {
    throw new Error("Class not found in this topic and batch");
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
  topicSlug: string;
  classSlug: string;
}

export const deleteClassService = async ({
  batchId,
  topicSlug,
  classSlug,
}: DeleteClassInput) => {

  if (!topicSlug) {
    throw new Error("Invalid topic slug");
  }

  // Find topic first
  const topic = await prisma.topic.findUnique({
    where: { slug: topicSlug },
  });

  if (!topic) {
    throw new Error("Topic not found");
  }

  const existingClass = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic_id: topic.id,
    },
  });

  if (!existingClass) {
    throw new Error("Class not found in this topic and batch");
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

// Student-specific service - get class details with full questions array
interface GetClassDetailsWithFullQuestionsInput {
  studentId: number;
  batchId: number;
  topicSlug: string;
  classSlug: string;
}

export const getClassDetailsWithFullQuestionsService = async ({
  studentId,
  batchId,
  topicSlug,
  classSlug,
}: GetClassDetailsWithFullQuestionsInput) => {
  
  // Get class with topic and batch validation
  const classData = await prisma.class.findFirst({
    where: {
      slug: classSlug,
      batch_id: batchId,
      topic: {
        slug: topicSlug
      }
    },
    include: {
      topic: {
        select: {
          id: true,
          topic_name: true,
          slug: true
        }
      },
      questionVisibility: {
        include: {
          question: {
            include: {
              topic: {
                select: {
                  id: true,
                  topic_name: true,
                  slug: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!classData) {
    throw new Error("Class not found");
  }

  // Get student's solved questions for this class
  const questionIds = classData.questionVisibility.map(qv => qv.question_id);
  
  const studentProgress = await prisma.studentProgress.findMany({
    where: {
      student_id: studentId,
      question_id: { in: questionIds }
    },
    select: {
      question_id: true,
      sync_at: true
    }
  });

  // Create a Set of solved question IDs for quick lookup
  const solvedQuestionIds = new Set(
    studentProgress.map(progress => progress.question_id)
  );

  // Format questions with full details and solved status
  const questionsWithProgress = classData.questionVisibility.map((qv: any) => {
    const question = qv.question;
    return {
      id: question.id,
      questionName: question.question_name,
      questionLink: question.question_link,
      platform: question.platform,
      level: question.level,
      type: question.type,
      topic: question.topic,
      isSolved: solvedQuestionIds.has(question.id),
      syncAt: solvedQuestionIds.has(question.id) 
        ? studentProgress.find(p => p.question_id === question.id)?.sync_at
        : null
    };
  });

  // Calculate progress stats
  const totalQuestions = questionsWithProgress.length;
  const solvedQuestions = questionsWithProgress.filter(q => q.isSolved).length;

  return {
    id: classData.id,
    class_name: classData.class_name,
    slug: classData.slug,
    description: classData.description,
    duration_minutes: classData.duration_minutes,
    pdf_url: classData.pdf_url,
    class_date: classData.class_date,
    created_at: classData.created_at,
    topic: classData.topic,
    totalQuestions,
    solvedQuestions,
    questions: questionsWithProgress
  };
};
