import { Request, Response } from "express";
import prisma from "../config/prisma";
import { getCityWiseStats } from "../services/admin.service";
import { createAdminService, getAllAdminsService, updateAdminService, deleteAdminService } from "../services/admin.service";
import { syncOneStudent } from "../services/progressSync.service";

export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const { batch_id } = req.body;

        // Validate batch_id
        if (!batch_id || isNaN(parseInt(batch_id))) {
            return res.status(400).json({
                success: false,
                message: "Valid batch_id is required"
            });
        }

        const batchId = parseInt(batch_id);

        // Check if batch exists
        const batch = await prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                city: {
                    select: { 
                        city_name: true 
                    }
                }
            }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: "Batch not found"
            });
        }

        // Get total classes for this batch
        const totalClasses = await prisma.class.count({
            where: { batch_id: batchId }
        });

        // Get total students for this batch
        const totalStudents = await prisma.student.count({
            where: { batch_id: batchId }
        });

        // Get all questions assigned to this batch's classes
        const assignedQuestions = await prisma.questionVisibility.findMany({
            where: {
                class: {
                    batch_id: batchId
                }
            },
            include: {
                question: {
                    select: {
                        level: true,
                        platform: true,
                        type: true
                    }
                }
            }
        });

        const totalQuestions = assignedQuestions.length;

        // Calculate questions by type
        const questionsByType = {
            homework: assignedQuestions.filter((qc: any) => qc.question.type === 'HOMEWORK').length,
            classwork: assignedQuestions.filter((qc: any) => qc.question.type === 'CLASSWORK').length
        };

        // Calculate questions by level
        const questionsByLevel = {
            easy: assignedQuestions.filter((qc: any) => qc.question.level === 'EASY').length,
            medium: assignedQuestions.filter((qc: any) => qc.question.level === 'MEDIUM').length,
            hard: assignedQuestions.filter((qc: any) => qc.question.level === 'HARD').length
        };

        // Calculate questions by platform
        const questionsByPlatform = {
            leetcode: assignedQuestions.filter((qc: any) => qc.question.platform === 'LEETCODE').length,
            gfg: assignedQuestions.filter((qc: any) => qc.question.platform === 'GFG').length,
            other: assignedQuestions.filter((qc: any) => qc.question.platform === 'OTHER').length,
            interviewbit: assignedQuestions.filter((qc: any) => qc.question.platform === 'INTERVIEWBIT').length
        };

        // Get total topics discussed for this batch
        const totalTopicsDiscussed = await prisma.topic.count({
            where: {
                classes: {
                    some: {
                        batch_id: batchId
                    }
                }
            }
        });

        return res.status(200).json({
            success: true,
            data: {
                batch_id: batchId,
                batch_name: batch.batch_name,
                city: batch.city.city_name,
                year: batch.year,
                total_classes: totalClasses,
                total_questions: totalQuestions,
                total_students: totalStudents,
                questions_by_type: questionsByType,
                questions_by_level: questionsByLevel,
                questions_by_platform: questionsByPlatform,
                total_topics_discussed: totalTopicsDiscussed
            }
        });

    } catch (error) {
        console.error("Batch stats error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch batch statistics"
        });
    }
};

export const createAdminController = async (req: Request, res: Response) => {
    try {
        const adminData = req.body;

        // Validate required fields (removed username)
        if (!adminData.name || !adminData.email || !adminData.password) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, password"
            });
        }

        const newAdmin = await createAdminService(adminData);

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: newAdmin
        });

    } catch (error) {
        console.error("Create admin error:", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create admin"
        });
    }
};

export const getAllAdminsController = async (req: Request, res: Response) => {
    try {
        const filters = req.query;
        const admins = await getAllAdminsService(filters);

        return res.status(200).json({
            success: true,
            data: admins
        });

    } catch (error) {
        console.error("Get admins error:", error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch admins"
        });
    }
};

export const updateAdminController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "Valid admin ID is required"
            });
        }

        const updatedAdmin = await updateAdminService(parseInt(id as string), updateData);

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            data: updatedAdmin
        });

    } catch (error: any) {
        console.error("Update admin error:", error);
        const statusCode = error.message === 'Admin not found' ? 404 : 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to update admin"
        });
    }
};

export const deleteAdminController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "Valid admin ID is required"
            });
        }

        const result = await deleteAdminService(parseInt(id as string));

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error: any) {
        console.error("Delete admin error:", error);
        const statusCode = error.message === 'Admin not found' ? 404 : 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to delete admin"
        });
    }
};

export const forceSyncStudent = async (req: Request, res: Response) => {
    try {
        const { student_id } = req.body;

        // Validate student_id
        if (!student_id || isNaN(parseInt(student_id))) {
            return res.status(400).json({
                success: false,
                message: "Valid student_id is required"
            });
        }

        const studentId = parseInt(student_id);

        // Check if student exists
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                name: true,
                leetcode_id: true,
                gfg_id: true,
                lc_total_solved: true,
                gfg_total_solved: true,
                last_synced_at: true
            }
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found"
            });
        }

        console.log(`🔄 Force syncing student: ${student.name} (ID: ${studentId})`);

        // Force sync the student
        const result = await syncOneStudent(studentId, true);

        console.log(`✅ Force sync completed for ${student.name}:`, result);

        return res.status(200).json({
            success: true,
            message: "Force sync completed successfully",
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    leetcode_id: student.leetcode_id,
                    gfg_id: student.gfg_id
                },
                sync_result: result
            }
        });

    } catch (error: any) {
        console.error("Force sync error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to force sync student"
        });
    }
};
