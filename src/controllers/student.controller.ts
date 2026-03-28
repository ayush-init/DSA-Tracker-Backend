import { Request, Response } from "express";
import { addStudentProgressService } from "../services/student.service";
import {
    updateStudentDetailsService,
    deleteStudentDetailsService,
    getAllStudentsService,
    getStudentReportService
} from "../services/student.service";

import { createStudentService } from "../services/student.service";
import prisma from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

export const getCurrentStudent = asyncHandler(async (req: Request, res: Response) => {
  const studentId = (req as any).user?.id;
  
  if (!studentId) {
    throw new ApiError(401, "Student not authenticated");
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      name: true,
      username: true,
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
      email: true,
      profile_image_url: true,
      leetcode_id: true,
      gfg_id: true
    }
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  return res.status(200).json({
    success: true,
    data: {
      id: student.id,
      name: student.name,
      username: student.username,
      city: student.city,
      batch: student.batch,
      email: student.email,
      profileImageUrl: student.profile_image_url,
      leetcode: student.leetcode_id,
      gfg: student.gfg_id
    }
  });
});

export const updateStudentDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await updateStudentDetailsService(
    Number(id),
    req.body
  );

  return res.json({
    message: "Student updated successfully",
    data: student
  });
});


export const deleteStudentDetails = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const studentId = Number(id);

  if (isNaN(studentId)) {
    throw new ApiError(400, "Invalid student id");
  }

  await deleteStudentDetailsService(studentId);

  return res.status(200).json({
    message: "Student deleted permanently"
  });
});

export const getAllStudentsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAllStudentsService(req.query);

  return res.status(200).json(result);
});

export const getStudentReportController = asyncHandler(async (
  req: Request,
  res: Response
) => {
  const { username } = req.params;

  const usernameStr = Array.isArray(username) ? username[0] : username;

  const result = await getStudentReportService(usernameStr);

  return res.status(200).json(result);
});

export const createStudentController = asyncHandler(async (req: Request, res: Response) => {
  const student = await createStudentService(req.body);

  return res.status(201).json({
    message: "Student created successfully",
    data: student
  });
});


export const addStudentProgressController = asyncHandler(async (
  req: Request,
  res: Response
) => {
  const { student_id, question_id } = req.body;

  if (!student_id || !question_id) {
    throw new ApiError(400, "student_id and question_id are required");
  }

  const progress = await addStudentProgressService(
    Number(student_id),
    Number(question_id)
  );

  return res.status(201).json({
    message: "Student progress added successfully",
    data: progress
  });
});