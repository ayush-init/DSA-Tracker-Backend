import { Request, Response } from "express";
import { createClassInTopicService } from "../services/topics/class.service";
import { assignQuestionsToClassService } from "../services/questions/visibility.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import prisma from "../config/prisma";
import csv from "csv-parser";
import { ExtendedRequest } from "../types";

interface BulkUploadResult {
  message: string;
  summary: {
    totalRows: number;
    classesCreated: number;
    duplicateClassesSkipped: number;
    questionsAssigned: number;
    questionsNotFound: number;
  };
  errors: Array<{
    row: number;
    issue: string;
    action?: string;
    question?: string;
  }>;
}

interface CSVRow {
  topic_slug: string;
  class_date: string;
  class_name: string;
  duration: string;
  description_html: string;
  question_links: string;
  notes: string;
  types: string;
}

export const bulkUploadClassesAndQuestions = asyncHandler(async (req: ExtendedRequest, res: Response) => {
  const { batchSlug } = req.params;
  
  if (!batchSlug || typeof batchSlug !== 'string') {
    throw new ApiError(400, "Batch slug is required");
  }

  // Find batch by slug
  const batch = await prisma.batch.findUnique({
    where: { slug: batchSlug }
  });

  if (!batch) {
    throw new ApiError(404, `Batch not found with slug: ${batchSlug}`);
  }

  if (!req.file) {
    throw new ApiError(400, "CSV file is required");
  }

  const results: BulkUploadResult = {
    message: "Bulk upload completed",
    summary: {
      totalRows: 0,
      classesCreated: 0,
      duplicateClassesSkipped: 0,
      questionsAssigned: 0,
      questionsNotFound: 0
    },
    errors: []
  };

  const csvData: CSVRow[] = [];
  
  // Parse CSV
  await new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file!.buffer);
    
    bufferStream
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        csvData.push(row);
      })
      .on('end', () => {
        resolve(csvData);
      })
      .on('error', (error: any) => {
        reject(error);
      });
  });

  results.summary.totalRows = csvData.length;

  // Process each row
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNum = i + 2; // +2 because header is row 1 and array is 0-indexed

    try {
      // Find topic by slug
      const topic = await prisma.topic.findUnique({
        where: { slug: row.topic_slug.trim() }
      });

      if (!topic) {
        results.errors.push({
          row: rowNum,
          issue: `Topic '${row.topic_slug}' not found`,
          action: "skipped"
        });
        continue;
      }

      // Parse date (DD/MM/YYYY format)
      let classDate: Date | null = null;
      if (row.class_date && row.class_date.trim()) {
        const dateParts = row.class_date.trim().split('/');
        if (dateParts.length === 3) {
          const [day, month, year] = dateParts;
          classDate = new Date(`${year}-${month}-${day}`);
          
          if (isNaN(classDate.getTime())) {
            results.errors.push({
              row: rowNum,
              issue: `Invalid date format: ${row.class_date}`,
              action: "used null date"
            });
            classDate = null;
          }
        } else {
          results.errors.push({
            row: rowNum,
            issue: `Invalid date format: ${row.class_date}`,
            action: "used null date"
          });
        }
      }

      // Parse duration
      let duration: number | null = null;
      if (row.duration && row.duration.trim()) {
        const parsedDuration = parseInt(row.duration.trim(), 10);
        if (!isNaN(parsedDuration)) {
          duration = parsedDuration;
        }
      }

      // Check if class already exists
      const existingClass = await prisma.class.findFirst({
        where: {
          topic_id: topic.id,
          batch_id: batch.id,
          class_name: row.class_name.trim()
        }
      });

      let createdClass;
      if (existingClass) {
        results.summary.duplicateClassesSkipped++;
        results.errors.push({
          row: rowNum,
          issue: `Class '${row.class_name}' already exists in topic '${row.topic_slug}'`,
          action: "skipped"
        });
        createdClass = existingClass;
      } else {
        // Create class
        try {
          createdClass = await createClassInTopicService({
            batchId: batch.id,
            topicSlug: row.topic_slug.trim(),
            class_name: row.class_name.trim(),
            description: row.description_html?.trim() || '',
            pdf_url: row.notes?.trim() || '',
            duration_minutes: duration || undefined,
            class_date: classDate?.toISOString() || undefined
          });
          results.summary.classesCreated++;
        } catch (error: any) {
          results.errors.push({
            row: rowNum,
            issue: `Failed to create class: ${error.message}`,
            action: "skipped"
          });
          continue;
        }
      }

      // Parse question links and types
      const questionLinks = row.question_links
        .split(',')
        .map(link => link.trim())
        .filter(link => link.length > 0);

      const types = row.types
        .split(',')
        .map(type => type.trim().toUpperCase())
        .filter(type => type.length > 0);

      // Validate arrays have same length
      if (questionLinks.length !== types.length) {
        results.errors.push({
          row: rowNum,
          issue: `Question links count (${questionLinks.length}) doesn't match types count (${types.length})`,
          action: "skipped questions"
        });
        continue;
      }

      // Process each question
      for (let j = 0; j < questionLinks.length; j++) {
        const questionLink = questionLinks[j];
        const type = types[j];

        // Validate type
        if (type !== 'HOMEWORK' && type !== 'CLASSWORK') {
          results.errors.push({
            row: rowNum,
            question: questionLink,
            issue: `Invalid type: ${type}. Must be HOMEWORK or CLASSWORK`,
            action: "skipped"
          });
          continue;
        }

        // Find question by link
        const question = await prisma.question.findUnique({
          where: { question_link: questionLink }
        });

        if (!question) {
          results.summary.questionsNotFound++;
          results.errors.push({
            row: rowNum,
            question: questionLink,
            issue: "Question not found in database",
            action: "skipped"
          });
          continue;
        }

        // Assign question to class
        try {
          await assignQuestionsToClassService({
            batchId: batch.id,
            topicSlug: row.topic_slug.trim(),
            classSlug: createdClass.slug,
            questions: [{
              question_id: question.id,
              type: type as 'HOMEWORK' | 'CLASSWORK'
            }]
          });
          results.summary.questionsAssigned++;
        } catch (error: any) {
          results.errors.push({
            row: rowNum,
            question: questionLink,
            issue: `Failed to assign question: ${error.message}`,
            action: "skipped"
          });
        }
      }

    } catch (error: any) {
      results.errors.push({
        row: rowNum,
        issue: `Row processing failed: ${error.message}`,
        action: "skipped"
      });
    }
  }

  return res.json(results);
});
