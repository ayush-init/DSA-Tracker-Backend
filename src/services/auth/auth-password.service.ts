import prisma from "../../config/prisma";
import { generateOTP, saveOTP, validateOTP } from "../../utils/otp.util";
import { sendOTPEmail } from "../../utils/email.util";
import { validateEmail } from "../../utils/emailValidation.util";
import { validatePasswordForAuth } from "../../utils/passwordValidator.util";
import { hashPassword, comparePassword } from "../../utils/password.util";
import { ApiError } from "../../utils/ApiError";

export const sendPasswordResetOTP = async (email: string) => {
  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Check if user exists (student or admin)
  let user = null;
  user = await prisma.student.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.admin.findUnique({ where: { email } });
  }

  if (!user) {
    throw new ApiError(404, 'No account found with this email address');
  }

  // Generate and save OTP
  const otp = generateOTP();
  console.log(`Generated OTP for ${email}: ${otp}`);
  await saveOTP(email, otp);
  console.log('OTP saved to database');

  // Send OTP email
  console.log('Attempting to send OTP email...');
  await sendOTPEmail(email, otp, user?.name);
  console.log('OTP email sent successfully!');

  return {
    message: 'OTP sent to your email address',
    otp // Return OTP for testing
  };
};

export const verifyOTP = async (email: string, otp: string) => {
  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Verify OTP
  console.log(`Attempting to validate OTP: ${otp} for email: ${email}`);
  const isValidOTP = await validateOTP(email, otp);
  console.log(`OTP validation result: ${isValidOTP}`);

  if (!isValidOTP) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  return {
    message: 'OTP verified successfully',
    valid: true
  };
};

export const resetPassword = async (email: string, otp: string, newPassword: string) => {
  if (!email || !otp || !newPassword) {
    throw new ApiError(400, 'Email, OTP, and new password are required');
  }

  // Validate email domain
  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    throw new ApiError(400, emailValidation.error);
  }

  // Validate password strength
  validatePasswordForAuth(newPassword);

  // Verify OTP
  console.log(`Attempting to validate OTP: ${otp} for email: ${email}`);
  const isValidOTP = await validateOTP(email, otp);
  console.log(`OTP validation result: ${isValidOTP}`);

  if (!isValidOTP) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  // Mark OTP as used
  await prisma.passwordResetOTP.updateMany({
    where: {
      email,
      is_used: false
    },
    data: { is_used: true }
  });

  // Find user
  let user = null;
  user = await prisma.student.findUnique({ where: { email } });

  let userType = '';
  if (user) {
    userType = 'student';
  } else {
    user = await prisma.admin.findUnique({ where: { email } });
    if (user) {
      userType = 'admin';
    }
  }

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // Check if new password is same as current password
  if (user.password_hash) {
    const isSamePassword = await comparePassword(newPassword, user.password_hash);
    if (isSamePassword) {
      throw new ApiError(400, 'New password cannot be the same as your current password');
    }
  }

  // Hash new password
  const password_hash = await hashPassword(newPassword);

  // Update password based on user type
  if (userType === 'student') {
    await prisma.student.update({
      where: { email },
      data: { password_hash }
    });
  } else {
    await prisma.admin.update({
      where: { email },
      data: { password_hash }
    });
  }

  return {
    message: 'Password reset successful. You can now login with your new password.'
  };
};
