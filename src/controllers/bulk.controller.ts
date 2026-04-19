import { bulkStudentUploadService, publicBulkStudentUploadService } from "../services/bulk.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const bulkStudentUploadController = asyncHandler(async (req: any, res: any) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "CSV file required"
            });
        }
        // Get batch_id from request body
        const { batch_id } = req.body;

        if (!batch_id) {
            return res.status(400).json({
                message: "batch_id is required in request body"
            });
        }
        const result = await bulkStudentUploadService(req.file.buffer, { batch_id: Number(batch_id) });
        res.status(201).json({
            message: "Students upload successful",
            ...(typeof result === 'object' && result !== null ? result : {})
        });

    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        res.status(500).json({
            message: "Bulk upload failed",
            error: error.message || "Unknown error"
        });
    }
});

export const publicBulkStudentUploadController = asyncHandler(async (req: any, res: any) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "CSV file required"
            });
        }

        // Get batch_id and city_id from req.batch (set by resolveBatch middleware)
        const { id: batch_id, city_id } = req.batch;

        if (!batch_id || !city_id) {
            return res.status(400).json({
                message: "Batch information not found"
            });
        }

        const result = await publicBulkStudentUploadService(req.file.buffer, { batch_id, city_id });
        res.status(201).json({
            message: "Students upload successful",
            ...(typeof result === 'object' && result !== null ? result : {})
        });

    } catch (error: any) {
        if (error instanceof ApiError) throw error;
        res.status(500).json({
            message: "Bulk upload failed",
            error: error.message || "Unknown error"
        });
    }
});