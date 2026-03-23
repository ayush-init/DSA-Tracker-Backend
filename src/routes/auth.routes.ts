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
} from '../controllers/auth.controller';
import { authLimiter, passwordResetLimiter, otpLimiter } from '../utils/rateLimit.util';

const router = Router();

// ===== STUDENT AUTH (Public) =====
router.post('/student/register', authLimiter, registerStudent);
router.post('/student/login', authLimiter, loginStudent);
router.post('/student/logout', logoutStudent);

// ===== ADMIN AUTH (Public) =====
// Note: This is for ALL admins (Superadmin, Teacher, Intern)
router.post('/admin/login', loginAdmin);
router.post('/admin/logout', logoutAdmin);

// ===== PASSWORD RESET (Public) =====
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', otpLimiter, resetPassword);

// ===== TOKEN REFRESH (Public) =====
router.post('/refresh-token', authLimiter, refreshToken);

// ===== GOOGLE OAUTH (Public) =====
router.post('/google-login', authLimiter, googleLogin);

export default router;
