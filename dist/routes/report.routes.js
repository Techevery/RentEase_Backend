"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_1 = require("../controllers/report.controller");
const user_model_1 = require("../models/user.model");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.protect);
router.get('/financial', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), report_controller_1.getFinancialSummary);
router.get('/property-performance', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), report_controller_1.getPropertyPerformance);
router.get('/expense-category-breakdown', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), report_controller_1.getExpensesBreakdown);
exports.default = router;
