"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const cloudinary_1 = require("../config/cloudinary");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.route('/')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), payment_controller_1.getPayments)
    .post((0, auth_middleware_1.authorize)(user_model_1.UserRole.MANAGER), cloudinary_1.paymentUpload.single('receipt'), validation_middleware_1.validateCreatePayment, payment_controller_1.createPayment);
router.route('/:id')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), payment_controller_1.getPayment);
router.put('/:id/approve', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), payment_controller_1.approvePayment);
router.put('/:id/reject', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), validation_middleware_1.validatePaymentRejection, payment_controller_1.rejectPayment);
router.post('/send-reminders', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), payment_controller_1.sendPaymentReminders);
exports.default = router;
