import prisma from '../src/config/prisma';

async function backfillBatchQuestionCounts() {
  console.log("🔄 Starting backfill of batch question counts...");

  try {
    // Get all batches
    const batches = await prisma.batch.findMany({
      include: {
        classes: {
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
        }
      }
    });

    console.log(`📊 Found ${batches.length} batches to process`);

    let updatedBatches = 0;

    for (const batch of batches) {
      // Count all questions assigned to this batch across all classes
      let hardCount = 0;
      let mediumCount = 0;
      let easyCount = 0;

      for (const classItem of batch.classes) {
        for (const qv of classItem.questionVisibility) {
          switch (qv.question.level) {
            case 'HARD':
              hardCount++;
              break;
            case 'MEDIUM':
              mediumCount++;
              break;
            case 'EASY':
              easyCount++;
              break;
          }
        }
      }

      // Update the batch with the counts
      await prisma.batch.update({
        where: { id: batch.id },
        data: {
          hard_assigned: hardCount,
          medium_assigned: mediumCount,
          easy_assigned: easyCount
        }
      });

      console.log(`✅ Updated batch ${batch.batch_name} (${batch.year}): H=${hardCount}, M=${mediumCount}, E=${easyCount}`);
      updatedBatches++;
    }

    console.log(`🎉 Successfully backfilled ${updatedBatches} batches`);
    
    return {
      success: true,
      totalBatches: batches.length,
      updatedBatches
    };

  } catch (error) {
    console.error("❌ Backfill failed:", error);
    throw error;
  }
}

// Run the backfill
backfillBatchQuestionCounts()
  .then((result) => {
    console.log("✅ Backfill completed:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  });
