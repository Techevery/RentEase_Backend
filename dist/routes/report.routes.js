"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.use((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD));
router.get('/payments/property/:houseId', report_controller_1.getPaymentSummaryByProperty);
router.get('/expenses/property/:houseId', report_controller_1.getExpenseSummaryByProperty);
router.get('/managers/:managerId', report_controller_1.getManagerPerformance);
exports.default = router;
