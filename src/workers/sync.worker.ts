import prisma from "../config/prisma";
import { syncOneStudent } from "../services/progressSync/sync-core.service";

export async function runStudentSyncWorker() {

  console.log("Student sync worker started");

  // Get all students in batches (no timing logic - sync everyone every 4 hours)
  const students = await prisma.student.findMany({
    where: {
      batch_id: { not: null }
    },
    select: {
      id: true
    }
  });

  console.log(`Total students to sync: ${students.length}`);

  const BATCH_SIZE = 5;

  for (let i = 0; i < students.length; i += BATCH_SIZE) {

    const batch = students.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(student =>
        syncOneStudent(student.id).catch(err => {
          console.error(`❌ Failed syncing student ${student.id}`, err);
        })
      )
    );

    console.log(`Processed ${Math.min(i + BATCH_SIZE, students.length)} students`);
  }

  console.log("✅ Student sync worker finished");
}