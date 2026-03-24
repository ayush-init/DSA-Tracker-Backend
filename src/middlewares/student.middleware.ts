import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../utils/jwt.util";

export interface StudentRequest extends Request {
  student?: AccessTokenPayload;  // 🔑 Added student property
  studentId?: number;           // 🔑 Add studentId property
  batchId?: number;
  batchName?: string;
  batchSlug?: string;
  cityId?: number;
  cityName?: string;
}

export const extractStudentInfo = (req: StudentRequest, res: Response, next: NextFunction) => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.role === 'STUDENT') {
    // 🔑 Extract student-specific info from token
    req.student = user; // Set the entire user object
    req.studentId = user.id; // Set studentId explicitly
    req.batchId = user.batchId;
    req.batchName = user.batchName;
    req.batchSlug = user.batchSlug;
    req.cityId = user.cityId;
    req.cityName = user.cityName;
    
    console.log('Student middleware extracted:', {
      studentId: req.studentId,
      batchId: req.batchId,
      batchName: req.batchName,
      batchSlug: req.batchSlug,
      cityId: req.cityId,
      cityName: req.cityName
    });
  }
  
  next();
};
