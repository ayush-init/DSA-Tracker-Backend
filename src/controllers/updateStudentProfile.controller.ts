import { Request, Response } from "express";
import prisma from "../config/prisma";

export const updateStudentProfile = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { leetcode_id, gfg_id, github, linkedin, username } = req.body;

    // Get current student to check if they already have city and batch
    const currentStudent = await prisma.student.findUnique({
      where: { id: studentId },
      select: { city_id: true, batch_id: true }
    });

    if (!currentStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Build update data - only include fields that are provided
    const updateData: any = {};
    
    if (leetcode_id !== undefined) updateData.leetcode_id = leetcode_id;
    if (gfg_id !== undefined) updateData.gfg_id = gfg_id;
    if (github !== undefined) updateData.github = github;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (username !== undefined && username.trim()) updateData.username = username;

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        leetcode_id: true,
        gfg_id: true,
        github: true,
        linkedin: true,
        city_id: true,
        batch_id: true,
        created_at: true
      }
    });

    res.json({
      message: "Profile updated successfully",
      student: updated,
    });
  } catch (error: any) {
    // Handle unique constraint errors
    if (error.code === "P2002") {
      const field = error.meta?.target as string[] | undefined;
      if (field?.includes("username")) {
        return res.status(400).json({ error: "Username already exists" });
      }
      if (field?.includes("email")) {
        return res.status(400).json({ error: "Email already exists" });
      }
    }
    
    res.status(500).json({ error: "Failed to update profile" });
  }
};
