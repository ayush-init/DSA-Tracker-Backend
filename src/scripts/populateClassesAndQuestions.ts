import prisma from "../config/prisma";
import { createClassInTopicService } from "../services/topics/class.service";
import { assignQuestionsToClassService } from "../services/questions/visibility.service";
import { ClassCreationResult } from "../types/utility.types";

// Add progress tracking
let processedCount = 0;
let totalCombinations = 0;

async function main() {
  console.log("🚀 Starting population of classes and questions...");
  
  const results: ClassCreationResult[] = [];
  let totalClassesCreated = 0;
  let totalQuestionsAssigned = 0;

  try {
    // 1. Get all batches and topics
    const batches = await prisma.batch.findMany({
      include: {
        city: {
          select: { city_name: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    const topics = await prisma.topic.findMany({
      orderBy: { id: 'asc' }
    });

    totalCombinations = batches.length * topics.length;
    console.log(`📊 Found ${batches.length} batches and ${topics.length} topics`);
    console.log(`📈 Total combinations to process: ${totalCombinations}`);

    // 2. Process each batch-topic combination with better error handling
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n🎯 Processing batch ${batchIndex + 1}/${batches.length}: ${batch.batch_name} (${batch.city.city_name})`);
      
      for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
        const topic = topics[topicIndex];
        processedCount++;
        
        const result: ClassCreationResult = {
          batchId: batch.id,
          batchName: batch.batch_name,
          topicId: topic.id,
          topicName: topic.topic_name,
          classesCreated: 0,
          questionsAssigned: 0,
          errors: []
        };

        try {
          console.log(`   📚 [${processedCount}/${totalCombinations}] Processing topic: ${topic.topic_name}`);

          // Check if classes already exist for this batch-topic combination
          const existingClasses = await prisma.class.count({
            where: {
              batch_id: batch.id,
              topic_id: topic.id
            }
          });

          if (existingClasses > 0) {
            console.log(`   ⚠️  Skipping - ${existingClasses} classes already exist for this topic`);
            result.errors?.push(`Classes already exist (${existingClasses} found)`);
            results.push(result);
            continue;
          }

          // Get available questions for this topic
          const topicQuestions = await prisma.question.findMany({
            where: { topic_id: topic.id },
            select: { id: true, question_name: true, level: true }
          });

          if (topicQuestions.length === 0) {
            console.log(`   ⚠️  No questions found for topic: ${topic.topic_name}`);
            result.errors?.push("No questions available for this topic");
            results.push(result);
            continue;
          }

          console.log(`   📚 Found ${topicQuestions.length} questions for ${topic.topic_name}`);

          // Calculate optimal number of classes (3-5)
          const numClasses = Math.floor(Math.random() * 3) + 3; // 3-5 classes
          
          // Determine question distribution strategy
          let questionsPerClass: number;
          let distributionStrategy: string;

          if (topicQuestions.length >= 5 * numClasses) {
            // Enough questions for 5-7 per class
            questionsPerClass = Math.floor(Math.random() * 3) + 5; // 5-7 questions
            distributionStrategy = "random (5-7 per class)";
          } else if (topicQuestions.length >= numClasses) {
            // Distribute evenly
            questionsPerClass = Math.floor(topicQuestions.length / numClasses);
            distributionStrategy = `even distribution (${questionsPerClass} per class)`;
          } else {
            // Not enough questions, assign all to each class
            questionsPerClass = topicQuestions.length;
            distributionStrategy = `all questions (${questionsPerClass} per class)`;
          }

          console.log(`   📋 Creating ${numClasses} classes with ${distributionStrategy}`);

          // Create classes and assign questions
          const createdClasses = [];
          for (let i = 1; i <= numClasses; i++) {
            try {
              // Generate class name
              const className = `${topic.topic_name} Class ${i}`;
              
              console.log(`     ➕ Creating class ${i}/${numClasses}: ${className}`);
              
              // Create class using existing service
              const newClass = await createClassInTopicService({
                batchId: batch.id,
                topicSlug: topic.slug,
                class_name: className,
                description: `Auto-generated class for ${topic.topic_name} in batch ${batch.batch_name}`,
                duration_minutes: 60,
                class_date: new Date().toISOString()
              });

              createdClasses.push(newClass);
              result.classesCreated++;
              totalClassesCreated++;

              console.log(`     ✅ Created: ${className} (slug: ${newClass.slug})`);

              // Assign questions to this class
              let questionsToAssign: number[] = [];

              if (topicQuestions.length >= 5 * numClasses) {
                // Random selection of 5-7 questions
                const shuffled = [...topicQuestions].sort(() => 0.5 - Math.random());
                questionsToAssign = shuffled.slice(0, questionsPerClass).map(q => q.id);
              } else {
                // Distribute questions evenly or assign all
                const startIndex = (i - 1) * questionsPerClass;
                const endIndex = Math.min(startIndex + questionsPerClass, topicQuestions.length);
                questionsToAssign = topicQuestions.slice(startIndex, endIndex).map(q => q.id);
              }

              if (questionsToAssign.length > 0) {
                console.log(`     📝 Assigning ${questionsToAssign.length} questions to ${className}`);
                
                await assignQuestionsToClassService({
                  batchId: batch.id,
                  topicSlug: topic.slug,
                  classSlug: newClass.slug,
                  questions: questionsToAssign.map(questionId => ({
                    question_id: questionId,
                    type: "HOMEWORK" as const
                  }))
                });

                result.questionsAssigned += questionsToAssign.length;
                totalQuestionsAssigned += questionsToAssign.length;

                console.log(`     ✅ Assigned ${questionsToAssign.length} questions`);
              } else {
                console.log(`     ⚠️  No questions to assign`);
              }

              // Add small delay to prevent overwhelming the database
              await new Promise(resolve => setTimeout(resolve, 100));

            } catch (classError: any) {
              const errorMsg = `Failed to create class ${i}: ${classError.message}`;
              console.log(`     ❌ ${errorMsg}`);
              result.errors?.push(errorMsg);
            }
          }

        } catch (topicError: any) {
          const errorMsg = `Failed to process topic: ${topicError.message}`;
          console.log(`   ❌ ${errorMsg}`);
          result.errors?.push(errorMsg);
        }

        results.push(result);

        // Progress update every 10 combinations
        if (processedCount % 10 === 0) {
          console.log(`\n📊 Progress: ${processedCount}/${totalCombinations} (${Math.round(processedCount/totalCombinations * 100)}%)`);
          console.log(`   Classes created so far: ${totalClassesCreated}`);
          console.log(`   Questions assigned so far: ${totalQuestionsAssigned}`);
        }
      }
    }

    // 3. Summary report
    console.log("\n" + "=".repeat(80));
    console.log("🎉 POPULATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`📊 Total Combinations Processed: ${processedCount}/${totalCombinations}`);
    console.log(`📊 Total Classes Created: ${totalClassesCreated}`);
    console.log(`📝 Total Questions Assigned: ${totalQuestionsAssigned}`);
    
    // Error summary
    const errorsCount = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
    if (errorsCount > 0) {
      console.log(`⚠️  Total Errors: ${errorsCount}`);
      
      console.log("\n❌ Error Details:");
      results.forEach(result => {
        if (result.errors && result.errors.length > 0) {
          console.log(`   Batch: ${result.batchName}, Topic: ${result.topicName}`);
          result.errors.forEach(error => {
            console.log(`     - ${error}`);
          });
        }
      });
    }

    // Success details by batch
    console.log("\n✅ Success Details by Batch:");
    const batchSummary = new Map<number, { name: string; classes: number; questions: number }>();
    
    results.forEach(result => {
      if (!batchSummary.has(result.batchId)) {
        batchSummary.set(result.batchId, { 
          name: result.batchName, 
          classes: 0, 
          questions: 0 
        });
      }
      const summary = batchSummary.get(result.batchId)!;
      summary.classes += result.classesCreated;
      summary.questions += result.questionsAssigned;
    });

    batchSummary.forEach((summary, batchId) => {
      console.log(`   ${summary.name}: ${summary.classes} classes, ${summary.questions} questions`);
    });

    console.log("\n🎯 Script completed successfully!");

  } catch (error: any) {
    console.error("❌ Fatal error during population:", error);
    console.error("Stack trace:", error.stack);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => {
    console.log("🔄 Disconnecting from database...");
    prisma.$disconnect();
  });
