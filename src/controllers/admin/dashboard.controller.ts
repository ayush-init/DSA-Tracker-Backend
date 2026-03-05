import { Request, Response } from "express";
import { getDashboardService } from "../../services/dashboard.service";

export const getDashboardController = async (req: Request, res: Response) => {
    try {

        const data = await getDashboardService(req.query);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error: any) {

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch dashboard data"
        });

    }
};