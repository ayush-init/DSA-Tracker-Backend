"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUploadQuestionsService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../config/prisma"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const bulkUploadQuestionsService = async (fileBuffer, topicId) => {
    const rows = [];
    const stream = stream_1.Readable.from(fileBuffer);
    await new Promise((resolve, reject) => {
        stream
            .pipe((0, csv_parser_1.default)())
            .on("data", (data) => rows.push(data))
            .on("end", resolve)
            .on("error", reject);
    });
    if (rows.length === 0) {
        throw new Error("CSV file is empty");
    }
    // Validate topic exists
    const topic = await prisma_1.default.topic.findUnique({
        where: { id: topicId },
    });
    if (!topic) {
        throw new Error("Topic not found");
    }
    const dataToInsert = [];
    for (const row of rows) {
        const level = client_1.Level[row.level];
        const type = client_1.QuestionType[row.type];
        if (!level || !type) {
            console.log(`Skipping invalid enum row → ${row.question_name}`);
            continue;
        }
        const link = row.question_link.toLowerCase();
        let platform;
        if (link.includes("leetcode.com")) {
            platform = client_1.Platform.LEETCODE;
        }
        else if (link.includes("geeksforgeeks.org")) {
            platform = client_1.Platform.GFG;
        }
        else if (link.includes("interviewbit.com")) {
            platform = client_1.Platform.INTERVIEWBIT;
        }
        else {
            platform = client_1.Platform.OTHER;
        }
        dataToInsert.push({
            question_name: row.question_name,
            question_link: row.question_link,
            level,
            type,
            topic_id: topicId,
            platform,
        });
    }
    await prisma_1.default.question.createMany({
        data: dataToInsert,
        skipDuplicates: true,
    });
    return {
        totalRows: rows.length,
        inserted: dataToInsert.length,
    };
};
exports.bulkUploadQuestionsService = bulkUploadQuestionsService;
