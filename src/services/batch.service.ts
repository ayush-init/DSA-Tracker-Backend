import prisma from "../config/prisma";
import { generateBatchSlug } from "../utils/slug";
import { ApiError } from "../utils/ApiError";

interface CreateBatchInput {
  batch_name: string;
  year: number;
  city_id: number;
}

interface GetAllBatchesInput {
  city?: string;
  year?: number;
}

export const createBatchService = async ({
  batch_name,
  year,
  city_id,
}: CreateBatchInput) => {

  if (!batch_name || !year || !city_id) {
    throw new ApiError(400, "All fields are required", [], "REQUIRED_FIELD");
  }

  const city = await prisma.city.findUnique({
    where: { id: city_id },
  });

  if (!city) {
    throw new ApiError(404, "City not found");
  }

  // Prevent duplicate batch name + year in same city
  const duplicate = await prisma.batch.findFirst({
    where: {
      city_id,
      year,
      batch_name,
    },
  });

  if (duplicate) {
    throw new ApiError(409, 
                "Batch with same name and year already exists in this city"
              );
  }

  if (!city.city_name) {
    throw new ApiError(500, "City name is missing", [], "SERVER_ERROR");
  }

  const batch = await prisma.batch.create({
    data: {
      batch_name,
      year,
      city_id,
      slug: generateBatchSlug(city.city_name, batch_name, year),
    },
  });

  return batch;
};


export const getAllBatchesService = async ({
  city,
  year,
}: {
  city?: string;
  year?: number;
}) => {

  const filters: any = {};

  if (city) {
    const cityData = await prisma.city.findUnique({
      where: { city_name: city },
    });

    if (!cityData) {
      throw new ApiError(400, "City not found");
    }

    filters.city_id = cityData.id;
  }

  if (year) {
    filters.year = year;
  }

  const batches = await prisma.batch.findMany({
    where: filters,
    include: {
      city: true,
      _count: {
        select: {
          students: true,
          classes: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return batches;
};

interface UpdateBatchInput {
  id: number;
  batch_name?: string;
  year?: number;
  city_id?: number;
}

export const updateBatchService = async ({
  id,
  batch_name,
  year,
  city_id,
}: UpdateBatchInput) => {

  const existingBatch = await prisma.batch.findUnique({
    where: { id },
  });

  if (!existingBatch) {
    throw new ApiError(400, "Batch not found");
  }

  const finalBatchName = batch_name ?? existingBatch.batch_name;
  const finalYear = year ?? existingBatch.year;
  const finalCityId = city_id ?? existingBatch.city_id;

  const city = await prisma.city.findUnique({
    where: { id: finalCityId },
  });

  if (!city) {
    throw new ApiError(404, "City not found", [], "CITY_NOT_FOUND");
  }

  // Prevent duplicate inside same city
  const duplicate = await prisma.batch.findFirst({
    where: {
      city_id: finalCityId,
      year: finalYear,
      batch_name: finalBatchName,
      NOT: { id: existingBatch.id },
    },
  });

  if (duplicate) {
    throw new ApiError(400, 
                "Batch with same name and year already exists in this city"
              );
  }

  // Detect if relevant fields changed
  const batchNameChanged = batch_name && batch_name !== existingBatch.batch_name;
  const yearChanged = year && year !== existingBatch.year;
  const cityIdChanged = city_id && city_id !== existingBatch.city_id;
  const shouldRegenerateSlug = batchNameChanged || yearChanged || cityIdChanged;

  // Prepare update data
  const updateData: any = {
    batch_name: finalBatchName,
    year: finalYear,
    city_id: finalCityId,
  };

  // Regenerate slug only if relevant fields changed
  if (shouldRegenerateSlug) {
    updateData.slug = generateBatchSlug(city.city_name, finalBatchName, finalYear);
  }

  const updatedBatch = await prisma.batch.update({
    where: { id: existingBatch.id },
    data: updateData,
  });

  return updatedBatch;
};


interface DeleteBatchInput {
  id: number;
}

export const deleteBatchService = async ({ id }: DeleteBatchInput) => {

  const batch = await prisma.batch.findUnique({
    where: { id },
  });

  if (!batch) {
    throw new ApiError(400, "Batch not found");
  }

  const studentCount = await prisma.student.count({
    where: { batch_id: batch.id },
  });

  if (studentCount > 0) {
    throw new ApiError(400, "Cannot delete batch with active students");
  }

  await prisma.batch.delete({
    where: { id: batch.id },
  });

  return true;
};