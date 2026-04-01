import crypto from 'crypto';
import prisma from '../config/prisma';

// Generate 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate OTP hash for secure storage
export const generateOTPHash = (otp: string): string => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Verify OTP
export const verifyOTP = (inputOTP: string, storedOTPHash: string): boolean => {
  const inputOTPHash = generateOTPHash(inputOTP);
  return inputOTPHash === storedOTPHash;
};

// Save OTP to database
export const saveOTP = async (email: string, otp: string): Promise<void> => {
  // Mark any existing OTPs for this email as used
  await prisma.passwordResetOTP.updateMany({
    where: { email },
    data: { is_used: true }
  });

  // Save new OTP (store plain OTP since it's only valid for 10 minutes)
  await prisma.passwordResetOTP.create({
    data: {
      email,
      otp: otp, // Store plain OTP (6 digits)
      expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    }
  });
};

// Validate OTP from database
export const validateOTP = async (email: string, inputOTP: string): Promise<boolean> => {
  const otpRecord = await prisma.passwordResetOTP.findFirst({
    where: {
      email,
      is_used: false,
      expires_at: {
        gt: new Date()
      }
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  if (!otpRecord) {
    return false;
  }

  // Compare plain OTPs (since we're storing plain OTP now)
  const isValid = inputOTP === otpRecord.otp;
  
  if (isValid) {
    // Mark OTP as used
    await prisma.passwordResetOTP.update({
      where: { id: otpRecord.id },
      data: { is_used: false }
    });
  }

  return isValid;
};

// Clean up expired OTPs (can be called by a cron job)
export const cleanupExpiredOTPs = async (): Promise<void> => {
  await prisma.passwordResetOTP.deleteMany({
    where: {
      expires_at: {
        lt: new Date()
      }
    }
  });
};
