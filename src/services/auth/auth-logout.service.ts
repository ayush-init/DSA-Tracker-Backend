import prisma from "../../config/prisma";

export const logoutStudent = async (studentId: number) => {
  if (studentId) {
    await prisma.student.update({
      where: { id: studentId },
      data: { refresh_token: null }
    });
  }
};

export const logoutAdmin = async (adminId: number) => {
  if (adminId) {
    await prisma.admin.update({
      where: { id: adminId },
      data: { refresh_token: null }
    });
  }
};
