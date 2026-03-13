import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Script to update batch table with counts of easy, medium, and hard questions
async function updateBatchQuestionCounts() {
  console.log('🔄 Starting batch question count update...');
  
  try {
    // Get all batches
    const batches = await prisma.batch.findMany();
    console.log(`📊 Found ${batches.length} batches`);

    for (const batch of batches) {
      console.log(`\n📚 Processing batch: ${batch.batch_name} (ID: ${batch.id})`);
      
      // Get all classes for this batch
      const classes = await prisma.class.findMany({
        where: { batch_id: batch.id },
        include: {
          questionVisibility: {
            include: {
              question: {
                select: {
                  level: true
                }
              }
            }
          }
        }
      });

      console.log(`  📝 Found ${classes.length} classes`);

      // Count questions by difficulty
      let easyCount = 0;
      let mediumCount = 0;
      let hardCount = 0;

      classes.forEach(cls => {
        cls.questionVisibility.forEach((qv: any) => {
          if (qv.question.level === 'EASY') easyCount++;
          else if (qv.question.level === 'MEDIUM') mediumCount++;
          else if (qv.question.level === 'HARD') hardCount++;
        });
      });

      console.log(`  📊 Question counts: EASY=${easyCount}, MEDIUM=${mediumCount}, HARD=${hardCount}`);

      // Update the batch with the counts
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          easy_assigned: easyCount,
          medium_assigned: mediumCount,
          hard_assigned: hardCount
        }
      });

      console.log(`  ✅ Updated batch ${batch.batch_name}`);
    }

    // Generate summary report
    console.log('\n📈 BATCH QUESTION COUNT SUMMARY');
    console.log('='.repeat(60));
    
    const updatedBatches = await prisma.batch.findMany({
      select: {
        id: true,
        batch_name: true,
        year: true,
        easy_assigned: true,
        medium_assigned: true,
        hard_assigned: true
      },
      orderBy: { id: 'asc' }
    });

    let totalEasy = 0;
    let totalMedium = 0;
    let totalHard = 0;

    updatedBatches.forEach(batch => {
      const batchTotal = batch.easy_assigned + batch.medium_assigned + batch.hard_assigned;
      console.log(`${batch.batch_name} (Year ${batch.year}): E=${batch.easy_assigned}, M=${batch.medium_assigned}, H=${batch.hard_assigned}, TOTAL=${batchTotal}`);
      
      totalEasy += batch.easy_assigned;
      totalMedium += batch.medium_assigned;
      totalHard += batch.hard_assigned;
    });

    console.log('='.repeat(60));
    console.log(`📊 TOTALS: EASY=${totalEasy}, MEDIUM=${totalMedium}, HARD=${totalHard}, GRAND_TOTAL=${totalEasy + totalMedium + totalHard}`);
    console.log('\n🎉 Batch question count update completed successfully!');

  } catch (error) {
    console.error('❌ Error updating batch question counts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Alternative fast method using raw SQL
async function updateBatchQuestionCountsFast() {
  console.log('🚀 Starting fast batch question count update...');
  
  try {
    // Use raw SQL for better performance
    const updateQuery = `
      UPDATE "Batch" b
      SET 
        easy_assigned = COALESCE(subquery.easy_count, 0),
        medium_assigned = COALESCE(subquery.medium_count, 0),
        hard_assigned = COALESCE(subquery.hard_count, 0)
      FROM (
        SELECT 
          c.batch_id,
          COUNT(CASE WHEN q.level = 'EASY' THEN 1 END) as easy_count,
          COUNT(CASE WHEN q.level = 'MEDIUM' THEN 1 END) as medium_count,
          COUNT(CASE WHEN q.level = 'HARD' THEN 1 END) as hard_count
        FROM "Class" c
        JOIN "QuestionVisibility" qv ON qv.class_id = c.id
        JOIN "Question" q ON q.id = qv.question_id
        GROUP BY c.batch_id
      ) subquery
      WHERE b.id = subquery.batch_id
    `;

    await prisma.$executeRawUnsafe(updateQuery);
    console.log('✅ Fast update completed!');

    // Show results
    const batches = await prisma.batch.findMany({
      select: {
        id: true,
        batch_name: true,
        year: true,
        easy_assigned: true,
        medium_assigned: true,
        hard_assigned: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('\n📈 UPDATED BATCH COUNTS');
    console.log('='.repeat(60));
    
    let totalEasy = 0;
    let totalMedium = 0;
    let totalHard = 0;

    batches.forEach(batch => {
      const batchTotal = batch.easy_assigned + batch.medium_assigned + batch.hard_assigned;
      console.log(`${batch.batch_name} (Year ${batch.year}): E=${batch.easy_assigned}, M=${batch.medium_assigned}, H=${batch.hard_assigned}, TOTAL=${batchTotal}`);
      
      totalEasy += batch.easy_assigned;
      totalMedium += batch.medium_assigned;
      totalHard += batch.hard_assigned;
    });

    console.log('='.repeat(60));
    console.log(`📊 TOTALS: EASY=${totalEasy}, MEDIUM=${totalMedium}, HARD=${totalHard}, GRAND_TOTAL=${totalEasy + totalMedium + totalHard}`);

  } catch (error) {
    console.error('❌ Error in fast update:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Choose which method to run
// updateBatchQuestionCounts();        // Slower but more detailed logging
updateBatchQuestionCountsFast();      // Fast SQL method

export { updateBatchQuestionCounts, updateBatchQuestionCountsFast };
