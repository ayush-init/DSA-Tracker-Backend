import { Request, Response } from "express";
import prisma from "../config/prisma";
import { hashPassword } from "../utils/hashPassword";
import { AdminRole } from "@prisma/client";

export const createSuperAdminController = async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, batch_id } = req.body;

        // Validate required fields
        if (!name || !email || !password || !role || !batch_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, password, role, batch_id"
            });
        }

        // Check if email already exists (removed username check)
        const existingAdmin = await prisma.admin.findFirst({
            where: {
                email
            }
        });

        if (existingAdmin) {
            return res.status(409).json({
                success: false,
                message: 'Email already exists'
            });
        }

        // Validate batch exists and get city_id
        const batch = await prisma.batch.findUnique({
            where: { id: parseInt(batch_id) },
            include: {
                city: {
                    select: {
                        id: true,
                        city_name: true
                    }
                }
            }
        });

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create admin with city_id from batch
        const newAdmin = await prisma.admin.create({
            data: {
                name,
                email,
                password_hash: hashedPassword,
                role: role as AdminRole,
                city_id: batch.city_id,  // Get city_id from batch
                batch_id: parseInt(batch_id)
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
                        batch_name: true
                    }
                }
            }
        });

        // Remove password_hash from response
        const { password_hash, ...adminResponse } = newAdmin;

        return res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: adminResponse
        });

    } catch (error) {
        console.error("Create SuperAdmin admin error:", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create admin"
        });
    }
};

export const updateSuperAdminController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { role, batch_id } = req.body;

        // Validate admin ID
        if (!id || isNaN(parseInt(id as string))) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Check if admin exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { id: parseInt(id as string) }
        });

        if (!existingAdmin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Only allow role and batch_id updates (major changes only)
        const updateData: any = {};
        
        if (role) {
            updateData.role = role as AdminRole;
        }
        
        if (batch_id) {
            // Validate batch exists and get city_id
            const batch = await prisma.batch.findUnique({
                where: { id: parseInt(batch_id) },
                include: {
                    city: {
                        select: {
                            id: true,
                            city_name: true
                        }
                    }
                }
            });

            if (!batch) {
                return res.status(404).json({
                    success: false,
                    message: 'Batch not found'
                });
            }

            updateData.batch_id = parseInt(batch_id);
            updateData.city_id = batch.city_id;  // Auto-update city_id from batch
        }

        // Don't allow name, email, username updates
        if (req.body.name || req.body.email || req.body.username) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and username cannot be updated. Only role and batch_id can be updated.'
            });
        }

        // Update admin
        const updatedAdmin = await prisma.admin.update({
            where: { id: parseInt(id as string) },
            data: updateData,
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
                        batch_name: true
                    }
                }
            }
        });

        // Remove password_hash from response
        const { password_hash, ...adminResponse } = updatedAdmin;

        return res.status(200).json({
            success: true,
            message: "Admin updated successfully",
            data: adminResponse
        });

    } catch (error) {
        console.error("Update SuperAdmin admin error:", error);
        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to update admin"
        });
    }
};


