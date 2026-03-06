import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../utils/jwt.util";

export interface StudentRequest extends Request {
  student?: AccessTokenPayload;
  batchId?: number;
  batchName?: string;
  batchSlug?: string;
  cityId?: number;
  cityName?: string;
}

export const extractStudentInfo = (req: StudentRequest, res: Response, next: NextFunction) => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.userType === 'student') {
    // 🔑 Extract student-specific info from token
    req.student = user;
    req.batchId = user.batchId;
    req.batchName = user.batchName;
    req.batchSlug = user.batchSlug;
    req.cityId = user.cityId;
    req.cityName = user.cityName;
    
    console.log('Student middleware extracted:', {
      batchId: req.batchId,
      batchName: req.batchName,
      batchSlug: req.batchSlug,
      cityId: req.cityId,
      cityName: req.cityName
    });
  }
  
  next();
};
