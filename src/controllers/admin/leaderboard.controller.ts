import { Request, Response } from "express";
import { getLeaderboardService, recalculateLeaderboardService } from "../../services/leaderboard.service";

export const getLeaderboard = async (req: Request, res: Response) => {
    try {

        const leaderboard = await getLeaderboardService(req.query);

        return res.status(200).json({
            success: true,
            data: leaderboard
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};

export const getLeaderboardPost = async (req: Request, res: Response) => {
    try {
        const { city, year, type } = req.body;
        
        const query = {
            type: type || 'all',
            city: city || 'all',
            year: year || new Date().getFullYear()
        };

        const leaderboard = await getLeaderboardService(query);

        return res.status(200).json({
            success: true,
            data: leaderboard
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "An error occurred"
        });
    }
};


export const recalculateLeaderboard = async (req: Request, res: Response) => {
    try {

        await recalculateLeaderboardService();

        res.status(200).json({
            success: true,
            message: "Leaderboard recalculated successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Failed to recalculate leaderboard"
        });

    }
};