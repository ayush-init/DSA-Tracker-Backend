import { bulkStudentUploadService } from "../services/bulk.service";

export const bulkStudentUploadController = async (req: any, res: any) => {

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

        res.status(500).json({
            message: "Bulk upload failed",
            error: error.message || "Unknown error"
        });
    }
};