import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AdminRole } from "@prisma/client";
import { getAdminStatsService, getCityWiseStats, getCurrentAdminService } from "../services/admin.service";
import { createAdminService, getAllAdminsService, updateAdminService, deleteAdminService } from "../services/admin.service";
import { syncOneStudent } from "../services/progressSync.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";


export const getCurrentAdminController = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Get admin info from middleware (extracted from token)
        const adminInfo = (req as any).admin;

        if (!adminInfo) {
            throw new ApiError(401, "Admin not authenticated", [], "AUTH_ERROR");
        }

        const admin = await getCurrentAdminService(adminInfo.id);

        return res.status(200).json({
            success: true,
            data: admin
        });

    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to fetch current admin", [], "INTERNAL_SERVER_ERROR");
    }
});
export const getAdminStats = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { batch_id } = req.body;

        // Validate batch_id
        if (!batch_id || isNaN(parseInt(batch_id))) {
            throw new ApiError(400, "Valid batch_id is required", [], "VALIDATION_ERROR");
        }

        const batchId = parseInt(batch_id);
        const stats = await getAdminStatsService(batchId);

        return res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to fetch batch statistics", [], "SERVER_ERROR");
    }
});

export const createAdminController = asyncHandler(async (req: Request, res: Response) => {
    try {
        const adminData = req.body;

        // Validate required fields (removed username)
        if (!adminData.name || !adminData.email || !adminData.password) {
            throw new ApiError(400, "Missing required fields: name, email, password", [], "VALIDATION_ERROR");
        }

        const newAdmin = await createAdminService(adminData);

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: newAdmin
        });

    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(400, "Failed to create admin", [], "ADMIN_CREATE_ERROR");
    }
});

export const getAllAdminsController = asyncHandler(async (req: Request, res: Response) => {
    try {
        const filters = req.query;

        // Default to TEACHER role if no role filter is provided (SuperAdmin context)
        if (!filters.role) {
            filters.role = 'TEACHER';
        }

        const admins = await getAllAdminsService(filters);

        return res.status(200).json({
            success: true,
            data: admins
        });

    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to fetch admins", [], "SERVER_ERROR");
    }
});

export const updateAdminController = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id || isNaN(parseInt(id as string))) {
            throw new ApiError(400, "Valid admin ID is required", [], "VALIDATION_ERROR");
        }

        const updatedAdmin = await updateAdminService(parseInt(id as string), updateData);

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            data: updatedAdmin
        });

    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        const statusCode = error.message === 'Admin not found' ? 404 : 400;
        const errorCode = error.message === 'Admin not found' ? 'ADMIN_NOT_FOUND' : 'ADMIN_UPDATE_ERROR';
        throw new ApiError(statusCode, error.message || "Failed to update admin", [], errorCode);
    }
});

export const deleteAdminController = asyncHandler(async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(parseInt(id as string))) {
            throw new ApiError(400, "Valid admin ID is required", [], "VALIDATION_ERROR");
        }

        const result = await deleteAdminService(parseInt(id as string));

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        const statusCode = error.message === 'Admin not found' ? 404 : 500;
        const errorCode = error.message === 'Admin not found' ? 'ADMIN_NOT_FOUND' : 'ADMIN_DELETE_ERROR';
        throw new ApiError(statusCode, error.message || "Failed to delete admin", [], errorCode);
    }
});

export const getRolesController = asyncHandler(async (req: Request, res: Response) => {
    try {
        const roles = Object.values(AdminRole);
        return res.status(200).json({
            success: true,
            data: roles
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to fetch roles", [], "SERVER_ERROR");
    }
});
