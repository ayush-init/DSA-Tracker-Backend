import { Request, Response } from "express";
import { getPublicStudentProfileService } from "../services/studentProfile.service";

export const getStudentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as any).user?.id; // From optional auth middleware
    
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: "Student ID is required" });
    }

    // First get student by ID to find their username
    const prisma = require("../config/prisma").default;
    const student = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      select: { username: true }
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    if (!student.username) {
      return res.status(404).json({ error: "Student profile not accessible - username not set" });
    }

    // Use existing service with the username
    const profile = await getPublicStudentProfileService(student.username);
    
    // Add canEdit flag if current user is viewing their own profile
    const canEdit = currentUserId && profile.student.id === currentUserId;
    
    res.json({ ...profile, canEdit });
  } catch (error) {
    console.error("Student by ID error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to get student profile by ID" 
    });
  }
};
