import { Request, Response } from "express";
import { syncOneStudent } from "../../services/progressSync.service";


export async function manualSync(req: Request, res: Response) {
  try {
    const studentId = Number(req.params.id);

    const result = await syncOneStudent(studentId);

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      message: error.message
    });
  }
}