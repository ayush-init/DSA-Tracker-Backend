import { Request, Response } from "express";
import prisma from "../config/prisma";
import { getCurrentSuperAdminService, getSuperAdminStatsService } from "../services/superadminStats.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getCurrentSuperAdminController = asyncHandler(async (req: Request, res: Response) => {
    try {
        // Get superadmin info from middleware (extracted from token)
        const superadminInfo = (req as any).admin;

        if (!superadminInfo) {
            return res.status(401).json({
                success: false,
                message: "SuperAdmin not authenticated"
            });
        }

        const superadmin = await getCurrentSuperAdminService(superadminInfo.id);

        return res.status(200).json({
            success: true,
            data: {
                id: superadmin.id,
                name: superadmin.name,
                email: superadmin.email,
                role: superadmin.role
            }
        });

    } catch (error) {
        if (error instanceof ApiError) throw error;
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch current superadmin"
        });
    }
});


export const getSuperAdminStats = asyncHandler(async (req: Request, res: Response) => {
    try {
        const stats = await getSuperAdminStatsService();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("System stats controller error:", error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch system statistics"
        });
    }
});
