import { Request, Response } from "express";
import {
    updateStudentDetailsService,
    deleteStudentDetailsService,
    getAllStudentsService,
    getStudentReportService
} from "../../services/student.service";

import { createStudentService } from "../../services/student.service";
export const updateStudentDetails = async (req: Request, res: Response) => {
    try {

        const { id } = req.params;

        const student = await updateStudentDetailsService(
            Number(id),
            req.body
        );

        return res.json({
            message: "Student updated successfully",
            data: student
        });

    } catch (error: any) {

        if (error.message === "Student not found") {
            return res.status(404).json({ message: error.message });
        }

        return res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};


export const deleteStudentDetails = async (req: Request, res: Response) => {
    try {

        const { id } = req.params;

        const studentId = Number(id);

        if (isNaN(studentId)) {
            return res.status(400).json({
                message: "Invalid student id"
            });
        }

        await deleteStudentDetailsService(studentId);

        return res.status(200).json({
            message: "Student deleted permanently"
        });

    } catch (error: any) {

        if (error.message === "Student not found") {
            return res.status(404).json({ message: error.message });
        }

        return res.status(500).json({
            message: "Something went wrong",
            error: error.message
        });
    }
};


export const getAllStudentsController = async (req: Request, res: Response) => {
    try {

        const result = await getAllStudentsService(req.query);

        return res.status(200).json(result);

    } catch (error: any) {

        return res.status(500).json({
            message: "Failed to fetch students",
            error: error.message
        });
    }
};


export const getStudentReportController = async (
    req: Request,
    res: Response
) => {
    try {

        const { username } = req.params;

        const result = await getStudentReportService(username);

        return res.status(200).json(result);

    } catch (error: any) {

        return res.status(500).json({
            message: "Failed to fetch student report",
            error: error.message
        });
    }
};



export const createStudentController = async (req: Request, res: Response) => {
    try {
        const student = await createStudentService(req.body);

        return res.status(201).json({
            message: "Student created successfully",
            data: student
        });

    } catch (error: any) {
        return res.status(400).json({
            message: error.message
        });
    }
};