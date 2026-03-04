import prisma  from "../config/prisma";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
export const getAllStudentsService = async (query: any) => {
    const {
        page = 1,
        limit = 10,
        search,
        city,
        batchSlug,
        sortBy = "created_at",
        order = "desc",
    } = query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    // 🔎 Search filter
    if (search) {
        where.OR = [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
        ];
    }

    // 🏙 City filter (via slug)
    if (city) {
        where.city = {
            slug: city,
        };
    }

    // 🎓 Batch filter (via slug)
    if (batchSlug) {
        where.batch = {
            slug: batchSlug,
        };
    }

    const students = await prisma.student.findMany({
        where,
        include: {
            city: true,
            batch: true,
            _count: {
                select: {
                    progress: true,
                },
            },
        },
        skip,
        take: Number(limit),
        orderBy: {
            [sortBy]: order === "asc" ? "asc" : "desc",
        },
    });

    const totalRecords = await prisma.student.count({ where });

    return {
        page: Number(page),
        totalPages: Math.ceil(totalRecords / Number(limit)),
        totalRecords,
        data: students,
    };
};



export const getStudentReportService = async (username: string) => {
    const student = await prisma.student.findUnique({
        where: { username },
        include: {
            city: true,
            batch: true,
            progress: {
                include: {
                    question: {
                        select: {
                            platform: true,
                            level: true,
                            question_name: true,
                        },
                    },
                },
                orderBy: {
                    solved_at: "desc",
                },
                take: 5, // recent 5 solves
            },
        },
    });

    if (!student) {
        throw new Error("Student not found");
    }

    // 🔢 Aggregation (DB level optimized)
    const totalSolved = await prisma.studentProgress.count({
        where: { student_id: student.id },
    });

    const platformStats = await prisma.studentProgress.groupBy({
        by: ["student_id"],
        where: { student_id: student.id },
        _count: { question_id: true },
    });

    const levelStats = await prisma.studentProgress.groupBy({
        by: ["student_id"],
        where: { student_id: student.id },
        _count: { question_id: true },
    });

    return {
        student: {
            id: student.id,
            name: student.name,
            email: student.email,
            city: student.city?.city_name,
            batch: student.batch?.batch_name,
            created_at: student.created_at,
        },
        stats: {
            totalSolved,
        },
        recentActivity: student.progress,
    };
};



export const updateStudentDetailsService = async (id: number, body: any) => {

    const student = await prisma.student.findUnique({
        where: { id }
    });

    if (!student) {
        throw new Error("Student not found");
    }

    const {
        name,
        email,
        username,
        google_id,
        provider,
        enrollment_id,
        city_id,
        batch_id,
        leetcode_id,
        gfg_id,
        is_profile_complete
    } = body;

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (google_id !== undefined) updateData.google_id = google_id;
    if (provider !== undefined) updateData.provider = provider;
    if (enrollment_id !== undefined) updateData.enrollment_id = enrollment_id;
    if (city_id !== undefined) updateData.city_id = city_id;
    if (batch_id !== undefined) updateData.batch_id = batch_id;
    if (leetcode_id !== undefined) updateData.leetcode_id = leetcode_id;
    if (gfg_id !== undefined) updateData.gfg_id = gfg_id;
    if (is_profile_complete !== undefined)
        updateData.is_profile_complete = is_profile_complete;

    const updatedStudent = await prisma.student.update({
        where: { id },
        data: updateData
    });

    return updatedStudent;
};

export const deleteStudentDetailsService = async (id: number) => {

    const student = await prisma.student.findUnique({
        where: { id }
    });

    if (!student) {
        throw new Error("Student not found");
    }

    await prisma.student.delete({
        where: { id }
    });

    return true;
};





export const createStudentService = async (data: any) => {
    try {

        const {
            name,
            email,
            username,
            password,
            enrollment_id,
            city_id,
            batch_id,
            leetcode_id,
            gfg_id
        } = data;

        let password_hash = null;

        if (password) {
            password_hash = await bcrypt.hash(password, 10);
        }

        const student = await prisma.student.create({
            data: {
                name,
                email,
                username,
                password_hash,
                enrollment_id,
                city_id,
                batch_id,
                leetcode_id,
                gfg_id
            }
        });

        return student;

    } catch (error: any) {

        // Prisma unique constraint error
        if (error instanceof Prisma.PrismaClientKnownRequestError) {

            if (error.code === "P2002") {
                const field = error.meta?.target as string[] | undefined;

                if (field?.includes("email")) {
                    throw new Error("Email already exists");
                }

                if (field?.includes("username")) {
                    throw new Error("Username already exists");
                }

                if (field?.includes("enrollment_id")) {
                    throw new Error("Enrollment ID already exists");
                }

                if (field?.includes("google_id")) {
                    throw new Error("Google account already linked");
                }

                throw new Error("Duplicate field detected");
            }

            if (error.code === "P2003") {
                throw new Error("Invalid city or batch reference");
            }
        }

        throw new Error("Failed to create student");
    }
};


