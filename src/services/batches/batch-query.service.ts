import prisma from "../../config/prisma";
import { ApiError } from "../../utils/ApiError";

interface GetAllBatchesInput {
  city?: string;
  year?: number;
}

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
