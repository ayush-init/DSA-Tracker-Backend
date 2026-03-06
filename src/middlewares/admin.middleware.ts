import { Request, Response, NextFunction } from "express";
import { AccessTokenPayload } from "../utils/jwt.util";

export interface AdminRequest extends Request {
  admin?: AccessTokenPayload;
  defaultBatchId?: number;
  defaultBatchName?: string;
  defaultBatchSlug?: string;
  defaultCityId?: number;
  defaultCityName?: string;
}

export const extractAdminInfo = (req: AdminRequest, res: Response, next: NextFunction) => {
  const user = req.user as AccessTokenPayload;
  
  if (user?.userType === 'admin') {
    // 🔑 Extract admin-specific info from token
    req.admin = user;
    req.defaultBatchId = user.batchId;
    req.defaultBatchName = user.batchName;
    req.defaultBatchSlug = user.batchSlug;
    req.defaultCityId = user.cityId;
    req.defaultCityName = user.cityName;
    
    console.log('Admin middleware extracted defaults:', {
      defaultBatchId: req.defaultBatchId,
      defaultBatchName: req.defaultBatchName,
      defaultBatchSlug: req.defaultBatchSlug,
      defaultCityId: req.defaultCityId,
      defaultCityName: req.defaultCityName
    });
  }
  
  next();
};
