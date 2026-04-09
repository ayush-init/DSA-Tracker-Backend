import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { ExtendedRequest } from "../types";

export const resolveBatch = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction
) => {
  const { batchSlug } = req.params;

  if (!batchSlug || Array.isArray(batchSlug)) {
    return res.status(400).json({ error: "Invalid batch slug" });
  }

  const batch = await prisma.batch.findUnique({
    where: { slug: batchSlug },
  });

  if (!batch) {
    return res.status(404).json({ error: "Batch not found" });
  }

  // Map database result to ExtendedRequest batch type
  req.batch = {
    id: batch.id,
    name: batch.batch_name,
    year: batch.year,
    city_id: batch.city_id,
    slug: batch.slug,
    created_at: batch.created_at.toISOString(),
    updated_at: batch.created_at.toISOString(), // Use created_at as updated_at since it's not in DB
  };

  next();
};