"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const username_controller_1 = require("../controllers/username.controller");
const router = (0, express_1.Router)();
// Public route - no authentication required for username check
router.get("/check-username", username_controller_1.checkUsernameAvailability);
exports.default = router;
