"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectExpense = exports.approveExpense = exports.getExpense = exports.getExpenses = exports.createExpense = void 0;
const expense_model_1 = __importStar(require("../models/expense.model"));
const property_model_1 = require("../models/property.model");
const errorResponse_1 = require("../utils/errorResponse");
const notification_model_1 = __importStar(require("../models/notification.model"));
// @desc    Upload property expense (by manager)
// @route   POST /api/expenses
// @access  Private/Manager
const createExpense = async (req, res, next) => {
    var _a, _b;
    try {
        const { houseId, flatId, amount, expenseDate, category, description } = req.body;
        // Check if house exists
        const house = await property_model_1.House.findById(houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
        }
        // Make sure manager is assigned to this house
        if (!house.managerId || house.managerId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Manager not authorized to manage this house`, 401));
        }
        // If flatId is provided, validate it
        if (flatId) {
            const flat = await property_model_1.Flat.findById(flatId);
            if (!flat) {
                return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${flatId}`, 404));
            }
            if (flat.houseId.toString() !== houseId) {
                return next(new errorResponse_1.ErrorResponse(`Flat does not belong to the specified house`, 400));
            }
            // Make sure manager is assigned to this flat
            if (!flat.managerId || flat.managerId.toString() !== req.user.id) {
                return next(new errorResponse_1.ErrorResponse(`Manager not authorized to manage this flat`, 401));
            }
        }
        // Add file upload details if present
        const expense = await expense_model_1.default.create({
            amount,
            expenseDate,
            category,
            description,
            houseId,
            flatId: flatId || null,
            managerId: req.user.id,
            landlordId: house.landlordId,
            status: expense_model_1.ExpenseStatus.PENDING,
            documentUrl: ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) || null,
            documentPublicId: ((_b = req.file) === null || _b === void 0 ? void 0 : _b.filename) || null,
        });
        // Create notification for landlord
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.EXPENSE_SUBMITTED,
            title: 'New Expense Submitted',
            message: `A new expense of ${amount} has been submitted for ${house.name}${flatId ? `, Flat ${flatId}` : ''}.`,
            recipientId: house.landlordId,
            recipientRole: 'landlord',
            referenceId: expense._id,
            referenceModel: 'Expense',
        });
        res.status(201).json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createExpense = createExpense;
// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private/Landlord/Manager
const getExpenses = async (req, res, next) => {
    try {
        let query;
        // For landlords, get all expenses for their properties
        if (req.user.role === 'landlord') {
            query = expense_model_1.default.find({ landlordId: req.user.id });
        }
        // For managers, get expenses for properties they manage
        else if (req.user.role === 'manager') {
            query = expense_model_1.default.find({ managerId: req.user.id });
        }
        else {
            return next(new errorResponse_1.ErrorResponse('Unauthorized access', 401));
        }
        // Add filters
        if (req.query.status) {
            query = query.find({ status: req.query.status });
        }
        if (req.query.category) {
            query = query.find({ category: req.query.category });
        }
        if (req.query.houseId) {
            query = query.find({ houseId: req.query.houseId });
        }
        if (req.query.flatId) {
            query = query.find({ flatId: req.query.flatId });
        }
        // Add date filters
        if (req.query.fromDate) {
            query = query.find({
                expenseDate: {
                    $gte: new Date(req.query.fromDate)
                }
            });
        }
        if (req.query.toDate) {
            query = query.find({
                expenseDate: {
                    $lte: new Date(req.query.toDate)
                }
            });
        }
        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        }
        else {
            query = query.sort('-expenseDate');
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await expense_model_1.default.countDocuments(query.getQuery());
        query = query.skip(startIndex).limit(limit);
        // Add population
        query = query.populate([
            { path: 'houseId', select: 'name address' },
            { path: 'flatId', select: 'number' },
            { path: 'managerId', select: 'name email' },
        ]);
        // Execute query
        const expenses = await query;
        // Pagination result
        const pagination = {};
        if (endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit,
            };
        }
        if (startIndex > 0) {
            pagination.prev = {
                page: page - 1,
                limit,
            };
        }
        res.status(200).json({
            success: true,
            count: expenses.length,
            pagination,
            data: expenses,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getExpenses = getExpenses;
// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private/Landlord/Manager
const getExpense = async (req, res, next) => {
    try {
        const expense = await expense_model_1.default.findById(req.params.id).populate([
            { path: 'houseId', select: 'name address' },
            { path: 'flatId', select: 'number' },
            { path: 'managerId', select: 'name email' },
        ]);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is authorized
        if (expense.landlordId.toString() !== req.user.id &&
            expense.managerId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this expense`, 401));
        }
        res.status(200).json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getExpense = getExpense;
// @desc    Approve expense (by landlord)
// @route   PUT /api/expenses/:id/approve
// @access  Private/Landlord
const approveExpense = async (req, res, next) => {
    try {
        const expense = await expense_model_1.default.findById(req.params.id);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is landlord
        if (expense.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to approve this expense`, 401));
        }
        // Make sure expense is in pending status
        if (expense.status !== expense_model_1.ExpenseStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Expense is not in pending status`, 400));
        }
        // Update expense status
        expense.status = expense_model_1.ExpenseStatus.APPROVED;
        expense.approvedAt = new Date();
        await expense.save();
        // Get house details first to avoid async issues in template literal
        const house = await property_model_1.House.findById(expense.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${expense.houseId}`, 404));
        }
        // Create notification for manager
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.EXPENSE_APPROVED,
            title: 'Expense Approved',
            message: `The expense of ${expense.amount} for ${house.name} has been approved.`,
            recipientId: expense.managerId,
            recipientRole: 'manager',
            referenceId: expense._id,
            referenceModel: 'Expense',
        });
        res.status(200).json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approveExpense = approveExpense;
// @desc    Reject expense (by landlord)
// @route   PUT /api/expenses/:id/reject
// @access  Private/Landlord
const rejectExpense = async (req, res, next) => {
    try {
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return next(new errorResponse_1.ErrorResponse('Please provide a reason for rejection', 400));
        }
        const expense = await expense_model_1.default.findById(req.params.id);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is landlord
        if (expense.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to reject this expense`, 401));
        }
        // Make sure expense is in pending status
        if (expense.status !== expense_model_1.ExpenseStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Expense is not in pending status`, 400));
        }
        // Update expense status
        expense.status = expense_model_1.ExpenseStatus.REJECTED;
        expense.rejectedAt = new Date();
        expense.rejectionReason = rejectionReason;
        await expense.save();
        // Get house details first to avoid async issues in template literal
        const house = await property_model_1.House.findById(expense.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${expense.houseId}`, 404));
        }
        // Create notification for manager
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.EXPENSE_REJECTED,
            title: 'Expense Rejected',
            message: `The expense of ${expense.amount} for ${house.name} has been rejected. Reason: ${rejectionReason}`,
            recipientId: expense.managerId,
            recipientRole: 'manager',
            referenceId: expense._id,
            referenceModel: 'Expense',
        });
        res.status(200).json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectExpense = rejectExpense;
