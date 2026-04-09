import { Router } from 'express';
import {
  registerStudent,
  loginStudent,
  loginAdmin,
  logoutStudent,
  logoutAdmin,
  refreshToken,
  googleLogin,
  forgotPassword,
  resetPassword,
  verifyOtp,
} from '../controllers/auth.controller';
import { passwordResetLimiter, otpLimiter } from '../utils/rateLimit.util';
import { authLimiter } from '../middlewares/rateLimiter';

const router = Router();

// ===== STUDENT AUTH (Public) =====
router.post('/student/register', authLimiter, registerStudent);
router.post('/student/login', authLimiter, loginStudent);
router.post('/student/logout', logoutStudent);

// ===== ADMIN AUTH (Public) =====
// Note: This is for ALL admins (Superadmin, Teacher, Intern)
router.post('/admin/login', authLimiter, loginAdmin);
router.post('/admin/logout', logoutAdmin);

// ===== TOKEN REFRESH (Public) =====
router.post('/refresh-token',   refreshToken);

// ===== PASSWORD RESET (Public) =====
router.post('/forgot-password',  forgotPassword);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/reset-password',  resetPassword);

// ===== GOOGLE OAUTH (Public) =====
router.post('/google-login',   googleLogin);

export default router;
