import csv from "csv-parser";

import { Readable } from "stream";

import bcryptjs from "bcryptjs";

import prisma from "../config/prisma";



export const bulkStudentUploadService = async (

  fileBuffer: Buffer,

  { batch_id }: { batch_id: number }

) => {



  const rows: any[] = [];



  const stream = Readable.from(fileBuffer);



  return new Promise((resolve, reject) => {



    stream

      .pipe(csv())

      .on("data", (data) => rows.push(data))

      .on("end", async () => {



        // batch check

        const batch = await prisma.batch.findUnique({

          where: { id: batch_id },

          select: { city_id: true }

        });



        if (!batch) {

          return reject("Batch not found");

        }



        const studentsData: any[] = [];

        let skippedCount = 0;



        for (const row of rows) {



          // Validate required fields from CSV

          if (!row.name || !row.email || !row.enrollment_id) {

            console.log("Missing required fields for:", row.name || 'Unknown');

            skippedCount++;

            continue;

          }



          // Generate username from email (take only word before first '.') + last 4 digits of enrollment_id

          const namePart = row.email.split("@")[0].split(".")[0];

          const enrollmentLast4 = row.enrollment_id.slice(-4);

          const username = `${namePart}_${enrollmentLast4}`;





          studentsData.push({

            name: row.name,

            email: row.email,

            username,

            enrollment_id: row.enrollment_id,

            batch_id,

            city_id: batch.city_id,

            created_at: new Date(),

            updated_at: new Date()

          });

        }



        if (studentsData.length === 0) {

          resolve({

            inserted: 0,

            totalRows: rows.length,

            skipped: skippedCount,

            message: "No valid students to upload"

          });

          return;

        }



        const created = await prisma.student.createMany({

          data: studentsData,

          skipDuplicates: true

        });



        resolve({

          inserted: created.count,

          totalRows: rows.length,

          skipped: skippedCount,

          message: `Successfully uploaded ${created.count} students`

        });

      })

      .on("error", reject);

  });

};

export const publicBulkStudentUploadService = async (
  fileBuffer: Buffer,
  { batch_id, city_id }: { batch_id: number; city_id: number }
) => {
  const rows: any[] = [];
  const stream = Readable.from(fileBuffer);
  const defaultPassword = "bruteforce@123";
  const password_hash = await bcryptjs.hash(defaultPassword, 10);

  return new Promise((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", async () => {
        const studentsData: any[] = [];
        let skippedCount = 0;

        for (const row of rows) {
          // Validate required fields from CSV
          if (!row.name || !row.email || !row.enrollment_id) {
            console.log("Missing required fields for:", row.name || 'Unknown');
            skippedCount++;
            continue;
          }

          // Generate username from email (take only word before first '.') + last 4 digits of enrollment_id
          const namePart = row.email.split("@")[0].split(".")[0];
          const enrollmentLast4 = row.enrollment_id.slice(-4);
          const username = `${namePart}_${enrollmentLast4}`;

          studentsData.push({
            name: row.name,
            email: row.email,
            username,
            enrollment_id: row.enrollment_id,
            leetcode_id: row.leetcode_id || null,
            gfg_id: row.gfg_id || null,
            password_hash,
            batch_id,
            city_id,
            created_at: new Date(),
            updated_at: new Date()
          });
        }

        if (studentsData.length === 0) {
          resolve({
            inserted: 0,
            totalRows: rows.length,
            skipped: skippedCount,
            message: "No valid students to upload"
          });
          return;
        }

        const created = await prisma.student.createMany({
          data: studentsData,
          skipDuplicates: true
        });

        resolve({
          inserted: created.count,
          totalRows: rows.length,
          skipped: skippedCount,
          message: `Successfully uploaded ${created.count} students`
        });
      })
      .on("error", reject);
  });
};