"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
// ===== STUDENT AUTH (Public) =====
router.post('/student/register', auth_controller_1.registerStudent);
router.post('/student/login', auth_controller_1.loginStudent);
router.post('/student/logout', auth_controller_1.logoutStudent);
// ===== ADMIN AUTH (Public) =====
// Note: This is for ALL admins (Superadmin, Teacher, Intern)
router.post('/admin/login', auth_controller_1.loginAdmin);
router.post('/admin/logout', auth_controller_1.logoutAdmin);
// ===== TOKEN REFRESH (Public) =====
router.post('/refresh-token', auth_controller_1.refreshToken);
// ===== PASSWORD RESET (Public) =====
router.post('/forgot-password', auth_controller_1.forgotPassword);
router.post('/verify-otp', auth_controller_1.verifyOtp);
router.post('/reset-password', auth_controller_1.resetPassword);
// ===== GOOGLE OAUTH (Public) =====
router.post('/google-login', auth_controller_1.googleLogin);
exports.default = router;
