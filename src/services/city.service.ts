import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

interface CreateCityInput {
  city_name: string;
}

export const createCityService = async ({
  city_name,
}: CreateCityInput) => {

  if (!city_name) {
    throw new ApiError(400, "City name is required", [], "REQUIRED_FIELD");
  }

  const existingName = await prisma.city.findUnique({
    where: { city_name },
  });

  if (existingName) {
    throw new ApiError(400, "City already exists", [], "CITY_EXISTS");
  }

  const city = await prisma.city.create({
    data: {
      city_name,
    },
  });

  return city;
};


//  GET ALL CITIES

export const getAllCitiesService = async () => {
  const cities = await prisma.city.findMany({
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      city_name: true,
      created_at: true,
      _count: {
        select: {
          batches: true,
          students: true
        }
      }
    }
  });

  // Transform the response to include counts directly
  return cities.map(city => ({
    id: city.id,
    city_name: city.city_name,
    created_at: city.created_at,
    total_batches: city._count.batches,
    total_students: city._count.students
  }));
};

//  UPDATE CITY
interface UpdateCityInput {
  id: number;
  city_name: string;
}

export const updateCityService = async ({
  id,
  city_name,
}: UpdateCityInput) => {

  if (!city_name) {
    throw new ApiError(400, "City name is required", [], "VALIDATION_ERROR");
  }

  const existingCity = await prisma.city.findUnique({
    where: { id },
  });

  if (!existingCity) {
    throw new ApiError(404, "City not found", [], "CITY_NOT_FOUND");
  }

  const duplicateName = await prisma.city.findUnique({
    where: { city_name },
  });

  if (duplicateName && duplicateName.id !== existingCity.id) {
    throw new ApiError(400, "City name already in use", [], "CITY_EXISTS");
  }

  const updatedCity = await prisma.city.update({
    where: { id: existingCity.id },
    data: {
      city_name,
    },
  });

  return updatedCity;
};

//  DELETE CITY
interface DeleteCityInput {
  id: number;
}
export const deleteCityService = async ({
  id,
}: DeleteCityInput) => {

  const city = await prisma.city.findUnique({
    where: { id },
  });

  if (!city) {
    throw new ApiError(404, "City not found", [], "CITY_NOT_FOUND");
  }

  const batchCount = await prisma.batch.count({
    where: { city_id: city.id },
  });

  if (batchCount > 0) {
    throw new ApiError(400, "Cannot delete city with active batches", [], "VALIDATION_ERROR");
  }

  const studentCount = await prisma.student.count({
    where: { city_id: city.id },
  });

  if (studentCount > 0) {
    throw new ApiError(400, "Cannot delete city with active students", [], "VALIDATION_ERROR");
  }

  await prisma.city.delete({
    where: { id: city.id },
  });

  return true;
};