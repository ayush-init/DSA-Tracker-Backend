import { Request, Response } from "express";
import { createBatchService, updateBatchService, deleteBatchService } from "../services/batches/batch-crud.service";
import { getAllBatchesService } from "../services/batches/batch-query.service";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { CreateBatchDTO, UpdateBatchDTO, DeleteBatchInput, BatchQueryParams } from "../types/admin.types";

//  CREATE BATCH

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
            const { batch_name, year, city_id } = req.body;

            const batch = await createBatchService({
              batch_name,
              year: Number(year),
              city_id: Number(city_id),
            });
         
            return res.status(201).json({
              message: "Batch created successfully",
              batch,
            });
        });

// 📋 GET ALL BATCHES 

export const getAllBatches = asyncHandler(async (req: Request, res: Response) => {
            const { city, year } = req.query;

            const batches = await getAllBatchesService({
              city: city as string | undefined,
              year: year ? Number(year) : undefined,
            });
            
            return res.json(batches);
        });

//  UPDATE BATCH

export const updateBatch = asyncHandler(async (req: Request, res: Response) => {
            const { id } = req.params;
            const { batch_name, year, city_id } = req.body;

            const updatedBatch = await updateBatchService({
              id: Number(id),
              batch_name,
              year: year ? Number(year) : undefined,
              city_id: city_id ? Number(city_id) : undefined,
            });

            return res.json({
              message: "Batch updated successfully",
              batch: updatedBatch,
            });
        });

//  DELETE BATCH

export const deleteBatch = asyncHandler(async (req: Request, res: Response) => {
            const id = Number(req.params.id);

            await deleteBatchService({ id });

            return res.json({
              message: "Batch deleted successfully",
            });
        });

