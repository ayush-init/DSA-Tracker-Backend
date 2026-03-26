"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentQuestionsService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getRecentQuestionsService = async ({ batchId, days = 7 }) => {
    // Get recently assigned questions for this batch
    const recentQuestions = await prisma_1.default.questionVisibility.findMany({
        where: {
            class: {
                batch_id: batchId
            },
            assigned_at: {
                gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) // days ago
            }
        },
        include: {
            question: {
                include: {
                    topic: {
                        select: {
                            slug: true
                        }
                    }
                }
            },
            class: {
                select: {
                    slug: true
                }
            }
        },
        orderBy: {
            assigned_at: 'desc'
        },
        distinct: ['question_id'] // Avoid duplicate questions
    });
    // Format response
    return recentQuestions.map((qv) => ({
        question_id: qv.question.id,
        question_name: qv.question.question_name,
        difficulty: qv.question.level,
        topic_slug: qv.question.topic.slug,
        class_slug: qv.class.slug,
        assigned_at: qv.assigned_at
    }));
};
exports.getRecentQuestionsService = getRecentQuestionsService;
