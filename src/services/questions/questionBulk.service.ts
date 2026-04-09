import { Level, Platform } from "@prisma/client";
import prisma from "../../config/prisma";
import csv from "csv-parser";
import { Readable } from "stream";
import { ApiError } from "../../utils/ApiError";

interface CSVRow {
  question_name: string;
  question_link: string;
  level: "EASY" | "MEDIUM" | "HARD";
}

export const bulkUploadQuestionsService = async (
  fileBuffer: Buffer,
  topicId: number
) => {
  const rows: CSVRow[] = [];

  const stream = Readable.from(fileBuffer);

  await new Promise<void>((resolve, reject) => {
    stream
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", resolve)
      .on("error", reject);
  });

  if (rows.length === 0) {
    throw new ApiError(400, "CSV file is empty");
  }

  // Validate topic exists
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
  });

  if (!topic) {
    throw new ApiError(400, "Topic not found");
  }

  const dataToInsert = [];

  for (const row of rows) {
    const level = Level[row.level as keyof typeof Level];

    if (!level) {
      console.log(
        `Skipping invalid enum row → ${row.question_name}`
      );
      continue;
    }

    const link = row.question_link.toLowerCase();

    let platform: Platform;

    if (link.includes("leetcode.com")) {
      platform = Platform.LEETCODE;
    } else if (link.includes("geeksforgeeks.org")) {
      platform = Platform.GFG;
    } else if (link.includes("interviewbit.com")) {
      platform = Platform.INTERVIEWBIT;
    } else {
      platform = Platform.OTHER;
    }

    dataToInsert.push({
      question_name: row.question_name,
      question_link: row.question_link,
      level,
      topic_id: topicId,
      platform,
    });
  }

  await prisma.question.createMany({
    data: dataToInsert,
    skipDuplicates: true,
  });

  return {
    totalRows: rows.length,
    inserted: dataToInsert.length,
  };
};