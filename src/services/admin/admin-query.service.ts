import prisma from "../../config/prisma";
import { AdminRole } from "@prisma/client";
import { ApiError } from "../../utils/ApiError";

export const getAllAdminsService = async (filters: any = {}) => {
    try {
        const { city_id, batch_id, role, search } = filters;

        // Build search filter
        let searchFilter = {};
        if (search) {
            searchFilter = {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ]
            };
        }

        const admins = await prisma.admin.findMany({
            where: {
                ...(city_id && { city_id: parseInt(city_id) }),
                ...(batch_id && { batch_id: parseInt(batch_id) }),
                ...(role && { role: role as AdminRole }),
                ...searchFilter
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                created_at: true,
                updated_at: true,
                city: {
                    select: {
                        id: true,
                        city_name: true
                    }
                },
                batch: {
                    select: {
                        id: true,
                        batch_name: true,
                        year: true,
                        city_id: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return admins;

    } catch (error) {
        console.error("Get admins error:", error);
        throw error;
    }
};

export const getCurrentAdminService = async (adminId: number) => {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      city_id: true,
      batch_id: true,
      city: {
        select: {
          id: true,
          city_name: true
        }
      },
      batch: {
        select: {
          id: true,
          batch_name: true,
          year: true
        }
      },
      created_at: true
    }
  });

  if (!admin) {
    throw new ApiError(404, "Admin not found", [], "ADMIN_NOT_FOUND");
  }

  return admin;
};
