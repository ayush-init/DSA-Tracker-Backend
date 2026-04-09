import { ApiError } from "../../utils/ApiError";
import { StudentResponseData } from "../../types/student.types";

export const formatStudentResponse = (student: StudentResponseData) => {
  return {
    success: true,
    data: {
      id: student.id,
      name: student.name,
      username: student.username,
      city: student.city,
      batch: student.batch,
      email: student.email,
      profileImageUrl: student.profile_image_url || undefined,
      leetcode: student.leetcode_id || undefined,
      gfg: student.gfg_id || undefined
    }
  };
};

export const validateStudentId = (idParam: any): number => {
  if (!idParam) {
    throw new ApiError(400, "Student ID is required", [], "VALIDATION_ERROR");
  }

  const studentId = Number(idParam);
  if (isNaN(studentId) || studentId <= 0) {
    throw new ApiError(400, "Invalid student ID", [], "VALIDATION_ERROR");
  }

  return studentId;
};

export const validateAuthenticatedStudent = (user: any): number => {
  const studentId = user?.id;
  
  if (!studentId) {
    throw new ApiError(401, "Student not authenticated", [], "UNAUTHORIZED");
  }

  return studentId;
};
