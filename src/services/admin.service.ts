import prisma from "../config/prisma";
import { hashPassword } from "../utils/hashPassword";
import { validatePasswordForAuth } from "../utils/passwordValidator.util";
import { AdminRole } from "@prisma/client";
import { ApiError } from "../utils/ApiError";

export const getCityWiseStats = async () => {
    try {
        const cities = await prisma.city.findMany({
            include: {
                batches: {
                    select: {
                        id: true,
                        _count: {
                            select: {
                                students: true
                            }
                        }
                    }
                }
            }
        });

        const cityWiseDistribution = await Promise.all(
            cities.map(async (city) => {
                const batchIds = city.batches.map((batch: any) => batch.id);
                
                const [activeBatches, totalStudents] = await Promise.all([
                    prisma.batch.count({
                        where: {
                            city_id: city.id,
                            id: { in: batchIds }
                        }
                    }),
                    prisma.student.count({
                        where: {
                            batch_id: { in: batchIds }
                        }
                    })
                ]);

                return {
                    cityId: city.id,
                    cityName: city.city_name,
                    activeBatches,
                    totalStudents,
                    status: "Active"
                };
            })
        );

        return cityWiseDistribution;
    } catch (error) {
        console.error("City-wise stats error:", error);
        throw error;
    }
};

export const createAdminService = async (adminData: any) => {
    try {
        // Check if email already exists (removed username check)
        const existingAdmin = await prisma.admin.findFirst({
            where: {
                email: adminData.email
            }
        });

        if (existingAdmin) {
            throw new ApiError(400, 'Email already exists', [], "USER_EXISTS");
        }

        // Validate city_id if provided
        if (adminData.city_id) {
            const city = await prisma.city.findUnique({
                where: { id: adminData.city_id }
            });
            if (!city) {
                throw new ApiError(404, 'City not found', [], "CITY_NOT_FOUND");
            }
        }

        // Validate batch_id if provided and derive city_id
        if (adminData.batch_id) {
            const batch = await prisma.batch.findUnique({
                where: { id: adminData.batch_id }
            });
            if (!batch) {
                throw new ApiError(404, 'Batch not found', [], "BATCH_NOT_FOUND");
            }
            // Automatically set city_id from batch if not explicitly provided
            if (!adminData.city_id) {
                adminData.city_id = batch.city_id;
            }
        }

        // Validate password strength
        validatePasswordForAuth(adminData.password);

        // Hash password
        const hashedPassword = await hashPassword(adminData.password);

        // Create admin
        const newAdmin = await prisma.admin.create({
            data: {
                name: adminData.name,
                email: adminData.email,
                password_hash: hashedPassword,
                role: adminData.role as AdminRole,
                city_id: adminData.city_id || null,
                batch_id: adminData.batch_id || null
            },
            include: {
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
            }
        });

        // Remove password_hash from response
        const { password_hash, ...adminResponse } = newAdmin;
        return adminResponse;
    } catch (error) {
        console.error("Create admin error:", error);
        throw error;
    }
};

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

export const updateAdminService = async (id: number, updateData: any) => {
    try {
        // Check if admin exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { id }
        });

        if (!existingAdmin) {
            throw new ApiError(404, 'Admin not found', [], "ADMIN_NOT_FOUND");
        }

        // Only allow specific field updates (name, email, role, batch_id, city_id)
        // Remove username from allowed updates
        const allowedUpdates = ['name', 'email', 'role', 'batch_id', 'city_id'];
        const invalidUpdates = Object.keys(updateData).filter(key => !allowedUpdates.includes(key));
        
        if (invalidUpdates.length > 0) {
            throw new ApiError(400, `Only ${allowedUpdates.join(', ')} can be updated. Invalid fields: ${invalidUpdates.join(', ')}`, [], "VALIDATION_ERROR");
        }

        // Check for duplicate email if updating email
        if (updateData.email) {
            const duplicateCheck = await prisma.admin.findFirst({
                where: {
                    AND: [
                        { id: { not: id } },
                        { email: updateData.email }
                    ]
                }
            });

            if (duplicateCheck) {
                throw new ApiError(400, 'Email already exists', [], "USER_EXISTS");
            }
        }

        // Validate city_id if provided
        if (updateData.city_id) {
            const city = await prisma.city.findUnique({
                where: { id: updateData.city_id }
            });
            if (!city) {
                throw new ApiError(400, 'City not found');
            }
        }

        // Validate batch_id if provided and derive city_id
        if (updateData.batch_id) {
            const batch = await prisma.batch.findUnique({
                where: { id: updateData.batch_id }
            });
            if (!batch) {
                throw new ApiError(400, 'Batch not found');
            }
            // Automatically set city_id from batch
            updateData.city_id = batch.city_id;
        }

        // Hash password if provided
        if (updateData.password) {
            // Validate password strength
            validatePasswordForAuth(updateData.password);
            updateData.password_hash = await hashPassword(updateData.password);
            delete updateData.password; // Remove plain password
        }

        // Update admin
        const updatedAdmin = await prisma.admin.update({
            where: { id },
            data: {
                ...updateData,
                ...(updateData.role && { role: updateData.role as AdminRole })
            },
            include: {
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
            }
        });

        // Remove password_hash from response
        const { password_hash, ...adminResponse } = updatedAdmin;
        return adminResponse;

    } catch (error) {
        console.error("Update admin error:", error);
        throw error;
    }
};

export const deleteAdminService = async (id: number) => {
    try {
        // Check if admin exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { id }
        });

        if (!existingAdmin) {
            throw new ApiError(400, 'Admin not found');
        }

        // Delete admin
        await prisma.admin.delete({
            where: { id }
        });

        return { message: 'Admin deleted successfully' };

    } catch (error) {
        console.error("Delete admin error:", error);
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






export const getAdminStatsService = async (batchId: number) => {
  // Check if batch exists
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      city: {
        select: {
          city_name: true
        }
      }
    }
  });

  if (!batch) {
    throw new ApiError(404, "Batch not found", [], "BATCH_NOT_FOUND");
  }

  // Get total classes for this batch
  const totalClasses = await prisma.class.count({
    where: { batch_id: batchId }
  });

  // Get total students for this batch
  const totalStudents = await prisma.student.count({
    where: { batch_id: batchId }
  });

  // Get all questions assigned to this batch's classes
  const assignedQuestions = await prisma.questionVisibility.findMany({
    where: {
      class: {
        batch_id: batchId
      }
    },
    include: {
      question: {
        select: {
          level: true,
          platform: true,
          type: true
        }
      }
    }
  });

  const totalQuestions = assignedQuestions.length;

  // Calculate questions by type
  const questionsByType = {
    homework: assignedQuestions.filter((qc: any) => qc.question.type === 'HOMEWORK').length,
    classwork: assignedQuestions.filter((qc: any) => qc.question.type === 'CLASSWORK').length
  };

  // Calculate questions by level
  const questionsByLevel = {
    easy: assignedQuestions.filter((qc: any) => qc.question.level === 'EASY').length,
    medium: assignedQuestions.filter((qc: any) => qc.question.level === 'MEDIUM').length,
    hard: assignedQuestions.filter((qc: any) => qc.question.level === 'HARD').length
  };

  // Calculate questions by platform
  const questionsByPlatform = {
    leetcode: assignedQuestions.filter((qc: any) => qc.question.platform === 'LEETCODE').length,
    gfg: assignedQuestions.filter((qc: any) => qc.question.platform === 'GFG').length,
    other: assignedQuestions.filter((qc: any) => qc.question.platform === 'OTHER').length,
    interviewbit: assignedQuestions.filter((qc: any) => qc.question.platform === 'INTERVIEWBIT').length
  };

  // Get total topics discussed for this batch
  const totalTopicsDiscussed = await prisma.topic.count({
    where: {
      classes: {
        some: {
          batch_id: batchId
        }
      }
    }
  });

  return {
    batch_id: batchId,
    batch_name: batch.batch_name,
    city: batch.city.city_name,
    year: batch.year,
    total_classes: totalClasses,
    total_questions: totalQuestions,
    total_students: totalStudents,
    questions_by_type: questionsByType,
    questions_by_level: questionsByLevel,
    questions_by_platform: questionsByPlatform,
    total_topics_discussed: totalTopicsDiscussed
  };
};