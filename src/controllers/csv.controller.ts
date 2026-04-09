import { Request, Response } from "express";
import { generateBatchReportCSV } from "../services/admin/csv.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const downloadBatchReportController = asyncHandler(async (req: Request, res: Response) => {
            try {
                const { batch_id } = req.body;
                
                // Generate CSV report (service handles validation)
                const { csvContent, filename } = await generateBatchReportCSV(batch_id);

                // Set headers for CSV download
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');

                return res.status(200).json({
                    success: true,
                    filename: filename,
                    csvContent: csvContent
                });

            } catch (error) {
    if (error instanceof ApiError) throw error;
                console.error("Download batch report error:", error);
                
                // Handle different error types
                if (error instanceof Error) {
                    if (error.message.includes("Valid batch_id is required")) {
                        return res.status(400).json({
                            success: false,
                            message: error.message
                        });
                    }
                    if (error.message.includes("Batch not found")) {
                        return res.status(404).json({
                            success: false,
                            message: error.message
                        });
                    }
                }
                
                return res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to generate batch report"
                });
            }
        });
