import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';

const prisma = new PrismaClient();

// Configuration - Optimized for 761 questions across 8 batches
const CONFIG = {
  // Reduced numbers to fit 761 questions efficiently
  CLASSES_PER_TOPIC: { min: 2, max: 4 },      // 2-4 classes per topic
  QUESTIONS_PER_CLASS: { min: 4, max: 8 },      // 4-8 questions per class
  
  // Topic range (1-48 as specified)
  TOPIC_RANGE: { min: 1, max: 48 },
  
  // Batch range (3-10 as specified)
  BATCH_RANGE: { min: 3, max: 10 },
  
  // Class duration in minutes
  CLASS_DURATION: { min: 60, max: 120 },
  
  // Days between classes for the same topic/batch
  DAYS_BETWEEN_CLASSES: { min: 7, max: 21 },
  
  // Question difficulty distribution weights
  DIFFICULTY_WEIGHTS: {
    EASY: 0.4,
    MEDIUM: 0.4,
    HARD: 0.2
  }
};

// Utility functions
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomDate(startDate: Date, endDate: Date): Date {
  return new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
}

function generateClassNumber(topicId: number, batchId: number, classIndex: number): string {
  return `Topic-${topicId}-Batch-${batchId}-Class-${classIndex + 1}`;
}

function generateClassSlug(topicName: string, batchName: string, classIndex: number): string {
  return slugify(`${topicName}-${batchName}-class-${classIndex + 1}`, { lower: true, strict: true });
}

function generateDescription(topicName: string, batchName: string, classNumber: string): string {
  const templates = [
    `Comprehensive coverage of ${topicName} concepts for ${batchName}`,
    `Deep dive into ${topicName} problem-solving techniques`,
    `${topicName} fundamentals and advanced topics`,
    `Practice session for ${topicName} with ${batchName}`,
    `${topicName} workshop and problem analysis`
  ];
  return getRandomChoice(templates);
}

// Shuffle array utility
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Main data generation function
async function generateTestData() {
  console.log('🚀 Starting efficient test data generation...');
  
  try {
    // Fetch existing data
    console.log('📊 Fetching existing data...');
    const [cities, batches, topics, questions] = await Promise.all([
      prisma.city.findMany(),
      prisma.batch.findMany({
        where: {
          id: {
            gte: CONFIG.BATCH_RANGE.min,
            lte: CONFIG.BATCH_RANGE.max
          }
        }
      }),
      prisma.topic.findMany({
        where: {
          id: {
            gte: CONFIG.TOPIC_RANGE.min,
            lte: CONFIG.TOPIC_RANGE.max
          }
        }
      }),
      prisma.question.findMany()
    ]);

    console.log(`✅ Found: ${cities.length} cities, ${batches.length} batches, ${topics.length} topics, ${questions.length} questions`);

    if (cities.length === 0 || batches.length === 0 || topics.length === 0 || questions.length === 0) {
      throw new Error('Insufficient data in database. Please ensure you have cities, batches, topics, and questions.');
    }

    // Group questions by topic and difficulty
    const questionsByTopicAndDifficulty = new Map<number, { EASY: any[], MEDIUM: any[], HARD: any[] }>();
    
    topics.forEach(topic => {
      questionsByTopicAndDifficulty.set(topic.id, { EASY: [], MEDIUM: [], HARD: [] });
    });

    questions.forEach(question => {
      const topicQuestions = questionsByTopicAndDifficulty.get(question.topic_id);
      if (topicQuestions) {
        topicQuestions[question.level as keyof typeof topicQuestions].push(question);
      }
    });

    // Generate classes and question assignments
    let totalClassesCreated = 0;
    let totalQuestionAssignments = 0;

    console.log('🏗️  Generating classes and question assignments...');

    // Process each batch independently
    for (const batch of batches) {
      console.log(`\n📚 Processing batch: ${batch.batch_name} (Year: ${batch.year}, City: ${batch.city_id})`);
      
      // Reset question tracking for this batch
      const batchAssignedQuestions = new Set<number>();
      
      // Shuffle questions for random distribution in this batch
      const shuffledQuestions = shuffleArray(questions);
      
      for (const topic of topics) {
        const numClasses = getRandomInt(CONFIG.CLASSES_PER_TOPIC.min, CONFIG.CLASSES_PER_TOPIC.max);
        const topicQuestions = shuffledQuestions.filter(q => q.topic_id === topic.id);
        
        if (!topicQuestions || topicQuestions.length === 0) {
          console.warn(`⚠️  No questions found for topic ${topic.id} (${topic.topic_name})`);
          continue;
        }

        console.log(`  📖 Topic ${topic.id}: Creating ${numClasses} classes with ${topicQuestions.length} questions`);

        // Generate base date for this topic's classes
        const baseDate = getRandomDate(
          new Date(batch.year - 1, 0, 1),
          new Date(batch.year, 11, 31)
        );

        // Distribute questions evenly across classes for this topic
        const questionsPerClass = Math.ceil(topicQuestions.length / numClasses);
        let questionIndex = 0;

        for (let classIndex = 0; classIndex < numClasses; classIndex++) {
          // Create class
          const classDate = new Date(baseDate);
          classDate.setDate(classDate.getDate() + (classIndex * getRandomInt(CONFIG.DAYS_BETWEEN_CLASSES.min, CONFIG.DAYS_BETWEEN_CLASSES.max)));
          
          const className = generateClassNumber(topic.id, batch.id, classIndex);
          
          const classData = {
            topic_id: topic.id,
            batch_id: batch.id,
            class_name: className,
            slug: generateClassSlug(topic.topic_name, batch.batch_name, classIndex),
            description: generateDescription(topic.topic_name, batch.batch_name, className),
            duration_minutes: getRandomInt(CONFIG.CLASS_DURATION.min, CONFIG.CLASS_DURATION.max),
            class_date: classDate,
            pdf_url: null
          };

          const createdClass = await prisma.class.create({ data: classData });
          totalClassesCreated++;

          // Assign questions to this class (no duplication within batch)
          const numQuestionsForClass = Math.min(questionsPerClass, topicQuestions.length - questionIndex);
          const selectedQuestions = topicQuestions.slice(questionIndex, questionIndex + numQuestionsForClass);
          
          // Mark questions as assigned within this batch
          selectedQuestions.forEach(q => batchAssignedQuestions.add(q.id));
          questionIndex += numQuestionsForClass;

          // Create question visibility records
          if (selectedQuestions.length > 0) {
            const visibilityData = selectedQuestions.map(question => ({
              class_id: createdClass.id,
              question_id: question.id,
              assigned_at: new Date()
            }));

            await prisma.questionVisibility.createMany({ data: visibilityData });
            totalQuestionAssignments += selectedQuestions.length;

            // Update batch question counts
            const easyAssigned = selectedQuestions.filter(q => q.level === 'EASY').length;
            const mediumAssigned = selectedQuestions.filter(q => q.level === 'MEDIUM').length;
            const hardAssigned = selectedQuestions.filter(q => q.level === 'HARD').length;

            await prisma.batch.update({
              where: { id: batch.id },
              data: {
                easy_assigned: { increment: easyAssigned },
                medium_assigned: { increment: mediumAssigned },
                hard_assigned: { increment: hardAssigned }
              }
            });
          }

          if (classIndex % 10 === 0) {
            console.log(`    ✅ Created ${classIndex + 1}/${numClasses} classes for topic ${topic.id}`);
          }
        }

        console.log(`  ✅ Topic ${topic.id}: Used ${questionIndex}/${topicQuestions.length} questions`);
      }

      // Report batch usage
      console.log(`  📊 Batch ${batch.batch_name}: Used ${batchAssignedQuestions.size} unique questions`);
    }

    // Generate summary report
    console.log('\n📈 EFFICIENT DATA GENERATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`🏢 Cities processed: ${cities.length}`);
    console.log(`📚 Batches processed: ${batches.length}`);
    console.log(`📖 Topics processed: ${topics.length}`);
    console.log(`🎯 Total questions available: ${questions.length}`);
    console.log(`📝 Classes created: ${totalClassesCreated}`);
    console.log(`❓ Question assignments created: ${totalQuestionAssignments}`);
    console.log(`📊 Average questions per class: ${(totalQuestionAssignments / totalClassesCreated).toFixed(2)}`);
    console.log(`🔄 Question reuse efficiency: ${((totalQuestionAssignments / questions.length) * 100).toFixed(1)}%`);
    
    // Calculate batch statistics
    const batchStats = await prisma.batch.findMany({
      where: { id: { gte: CONFIG.BATCH_RANGE.min, lte: CONFIG.BATCH_RANGE.max } },
      select: {
        id: true,
        batch_name: true,
        year: true,
        easy_assigned: true,
        medium_assigned: true,
        hard_assigned: true,
        classes: {
          select: { id: true }
        }
      }
    });

    console.log('\n📊 BATCH STATISTICS');
    console.log('='.repeat(50));
    batchStats.forEach(batch => {
      const totalQuestions = batch.easy_assigned + batch.medium_assigned + batch.hard_assigned;
      console.log(`${batch.batch_name} (${batch.year}): ${batch.classes.length} classes, ${totalQuestions} questions (E:${batch.easy_assigned}, M:${batch.medium_assigned}, H:${batch.hard_assigned})`);
    });

    console.log('\n🎉 Efficient test data generation completed successfully!');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script can be run with: tsx scripts/generate-test-data-efficient.ts
generateTestData()
  .then(() => {
    console.log('\n✨ Script completed successfully');
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
  });

export { generateTestData, CONFIG };
