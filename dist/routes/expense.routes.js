"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expense_controller_1 = require("../controllers/expense.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const cloudinary_1 = require("../config/cloudinary");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.route('/')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), expense_controller_1.getExpenses)
    .post((0, auth_middleware_1.authorize)(user_model_1.UserRole.MANAGER, user_model_1.UserRole.LANDLORD), cloudinary_1.expenseUpload.single('document'), validation_middleware_1.validateCreateExpense, expense_controller_1.createExpense);
router.route('/:id/summary')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), expense_controller_1.getPropertyExpensesSummary);
router.route('/:id')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), expense_controller_1.getExpense)
    .put(expense_controller_1.updateExpense)
    .delete(expense_controller_1.deleteExpense);
router.put('/:id/approve', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), expense_controller_1.approveExpense);
router.put('/:id/reject', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), expense_controller_1.rejectExpense);
exports.default = router;
