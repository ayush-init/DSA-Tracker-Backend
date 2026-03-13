import { Request, Response } from "express";
import { StudentRequest } from "../middlewares/student.middleware";
import { getStudentProfileService,  } from "../services/studentProfile.service";

export const getStudentProfile = async (req: StudentRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    
    if (!studentId) {
      return res.status(401).json({ error: "Student ID not found" });
    }

    const profile = await getStudentProfileService(studentId);
    res.json(profile);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to get student profile" 
    });
  }
};
