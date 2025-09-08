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
exports.getPropertyExpensesSummary = exports.updateExpense = exports.deleteExpense = exports.rejectExpense = exports.approveExpense = exports.getExpense = exports.getExpenses = exports.createExpense = void 0;
const expense_model_1 = __importStar(require("../models/expense.model"));
const property_model_1 = require("../models/property.model");
const errorResponse_1 = require("../utils/errorResponse");
const cloudinary_1 = require("../config/cloudinary");
// Upload property expense (by manager)
// POST /api/expenses
const createExpense = async (req, res, next) => {
    var _a, _b;
    try {
        const { houseId, flatId, amount, expenseDate, category, description, vendor } = req.body;
        const house = await property_model_1.House.findById(houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
        }
        if ((!house.managerId || house.managerId.toString() !== req.user.id) &&
            (!house.landlordId || house.landlordId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to manage this house`, 401));
        }
        if (flatId) {
            const flat = await property_model_1.Flat.findById(flatId);
            if (!flat) {
                return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${flatId}`, 404));
            }
            if (flat.houseId.toString() !== houseId) {
                return next(new errorResponse_1.ErrorResponse(`Flat does not belong to the specified house`, 400));
            }
            if (!flat.managerId || flat.managerId.toString() !== req.user.id) {
                return next(new errorResponse_1.ErrorResponse(`Manager not authorized to manage this flat`, 401));
            }
        }
        const expense = await expense_model_1.default.create({
            amount,
            expenseDate,
            category,
            description,
            houseId,
            vendor,
            flatId: flatId || null,
            managerId: req.user.id,
            landlordId: house.landlordId,
            status: expense_model_1.ExpenseStatus.PENDING,
            documentUrl: ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) || null,
            documentPublicId: ((_b = req.file) === null || _b === void 0 ? void 0 : _b.filename) || null,
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
// Get all expenses
// GET /api/expenses
const getExpenses = async (req, res, next) => {
    try {
        let query;
        if (req.user.role === 'landlord') {
            query = expense_model_1.default.find({
                landlordId: req.user.id,
                houseId: { $exists: true, $ne: null }
            });
        }
        else if (req.user.role === 'manager') {
            query = expense_model_1.default.find({
                managerId: req.user.id,
                houseId: { $exists: true, $ne: null }
            });
        }
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
        query = query.populate([
            { path: 'houseId', select: 'name address' },
            { path: 'flatId', select: 'number' },
            { path: 'managerId', select: 'name email' },
        ]);
        const expenses = await query;
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
// Get single expense
// GET /api/expenses/:id
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
// Approve expense (by landlord)
// PUT /api/expenses/:id/approve
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
        const house = await property_model_1.House.findById(expense.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${expense.houseId}`, 404));
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
exports.approveExpense = approveExpense;
// Reject expense (by landlord)
// PUT /api/expenses/:id/reject
const rejectExpense = async (req, res, next) => {
    try {
        const { rejectionReason } = req.body;
        // if (!rejectionReason) {
        //   return next(new ErrorResponse('Please provide a reason for rejection', 400));
        // }
        const expense = await expense_model_1.default.findById(req.params.id);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is landlord
        if (expense.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to reject this expense`, 401));
        }
        if (expense.status !== expense_model_1.ExpenseStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Expense is not in pending status`, 400));
        }
        // Update expense status
        expense.status = expense_model_1.ExpenseStatus.REJECTED;
        expense.rejectedAt = new Date();
        expense.rejectionReason = rejectionReason;
        await expense.save();
        const house = await property_model_1.House.findById(expense.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${expense.houseId}`, 404));
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
exports.rejectExpense = rejectExpense;
//  Delete expense
//   DELETE /api/expenses/:id
const deleteExpense = async (req, res, next) => {
    var _a;
    try {
        const expense = await expense_model_1.default.findById(req.params.id);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        // Authorization check
        if (expense.landlordId.toString() !== req.user.id &&
            ((_a = expense.managerId) === null || _a === void 0 ? void 0 : _a.toString()) !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this expense`, 401));
        }
        // Delete document from Cloudinary if exists
        if (expense.documentPublicId) {
            await (0, cloudinary_1.deleteFromCloudinary)(expense.documentPublicId);
        }
        await expense.deleteOne();
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteExpense = deleteExpense;
// Update expense
// PUT /api/expenses/:id
const updateExpense = async (req, res, next) => {
    try {
        const { amount, expenseDate, category, description, vendor, houseId, flatId } = req.body;
        // Find the expense
        let expense = await expense_model_1.default.findById(req.params.id);
        if (!expense) {
            return next(new errorResponse_1.ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
        }
        if (expense.managerId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Not authorized to update this expense`, 401));
        }
        if (expense.status !== expense_model_1.ExpenseStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Only pending expenses can be updated`, 400));
        }
        expense.amount = amount || expense.amount;
        expense.expenseDate = expenseDate || expense.expenseDate;
        expense.category = category || expense.category;
        expense.description = description || expense.description;
        expense.vendor = vendor || expense.vendor;
        if (houseId && houseId !== expense.houseId.toString()) {
            const house = await property_model_1.House.findById(houseId);
            if (!house) {
                return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
            }
            expense.houseId = houseId;
            expense.landlordId = house.landlordId;
        }
        if (flatId !== undefined) {
            if (flatId) {
                const flat = await property_model_1.Flat.findById(flatId);
                if (!flat) {
                    return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${flatId}`, 404));
                }
                if (flat.houseId.toString() !== expense.houseId.toString()) {
                    return next(new errorResponse_1.ErrorResponse(`Flat does not belong to the expense's house`, 400));
                }
                expense.flatId = flatId;
            }
            else {
                expense.flatId = undefined;
            }
        }
        if (req.file) {
            if (expense.documentPublicId) {
                await (0, cloudinary_1.deleteFromCloudinary)(expense.documentPublicId);
            }
            expense.documentUrl = req.file.path;
            expense.documentPublicId = req.file.filename;
        }
        await expense.save();
        res.status(200).json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateExpense = updateExpense;
// Get expenses summary for a particular property
// GET /api/expenses/property/:propertyId/summary
const getPropertyExpensesSummary = async (req, res, next) => {
    try {
        const propertyId = req.params.id || req.query.propertyId;
        const { fromDate, toDate, category } = req.query;
        // Validate property exists and user has access
        const house = await property_model_1.House.findById(propertyId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`Property not found with id of ${propertyId}`, 404));
        }
        // Authorization check
        if (house.landlordId.toString() !== req.user.id &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access expenses for this property`, 401));
        }
        // Build query
        let query = { houseId: propertyId };
        // Date range filter
        if (fromDate || toDate) {
            query.expenseDate = {};
            if (fromDate)
                query.expenseDate.$gte = new Date(fromDate);
            if (toDate)
                query.expenseDate.$lte = new Date(toDate);
        }
        // Category filter
        if (category) {
            query.category = category;
        }
        // Get all expenses for the property
        const expenses = await expense_model_1.default.find(query)
            .populate([
            { path: 'flatId', select: 'number' },
            { path: 'managerId', select: 'name email' }
        ])
            .sort('-expenseDate');
        // Calculate summary
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        // Calculate breakdown by category
        const categoryBreakdown = expenses.reduce((acc, expense) => {
            const category = expense.category;
            if (!acc[category]) {
                acc[category] = {
                    count: 0,
                    totalAmount: 0,
                    percentage: 0
                };
            }
            acc[category].count += 1;
            acc[category].totalAmount += expense.amount;
            return acc;
        }, {});
        // Calculate percentages
        Object.keys(categoryBreakdown).forEach(category => {
            categoryBreakdown[category].percentage =
                (categoryBreakdown[category].totalAmount / totalAmount) * 100;
        });
        // Calculate breakdown by status
        const statusBreakdown = expenses.reduce((acc, expense) => {
            const status = expense.status;
            if (!acc[status]) {
                acc[status] = {
                    count: 0,
                    totalAmount: 0,
                    percentage: 0
                };
            }
            acc[status].count += 1;
            acc[status].totalAmount += expense.amount;
            return acc;
        }, {});
        // Calculate percentages for status
        Object.keys(statusBreakdown).forEach(status => {
            statusBreakdown[status].percentage =
                (statusBreakdown[status].totalAmount / totalAmount) * 100;
        });
        // Calculate monthly breakdown
        const monthlyBreakdown = expenses.reduce((acc, expense) => {
            const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM format
            if (!acc[monthYear]) {
                acc[monthYear] = {
                    count: 0,
                    totalAmount: 0,
                    expenses: []
                };
            }
            acc[monthYear].count += 1;
            acc[monthYear].totalAmount += expense.amount;
            acc[monthYear].expenses.push(expense);
            return acc;
        }, {});
        // Get top expenses
        const topExpenses = [...expenses]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);
        res.status(200).json({
            success: true,
            data: {
                property: {
                    id: house._id,
                    name: house.name,
                    address: house.address
                },
                summary: {
                    totalExpenses: expenses.length,
                    totalAmount,
                    averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
                    pendingExpenses: expenses.filter(e => e.status === expense_model_1.ExpenseStatus.PENDING).length,
                    approvedExpenses: expenses.filter(e => e.status === expense_model_1.ExpenseStatus.APPROVED).length,
                    rejectedExpenses: expenses.filter(e => e.status === expense_model_1.ExpenseStatus.REJECTED).length
                },
                breakdown: {
                    byCategory: categoryBreakdown,
                    byStatus: statusBreakdown,
                    monthly: monthlyBreakdown
                },
                topExpenses,
                allExpenses: expenses
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPropertyExpensesSummary = getPropertyExpensesSummary;
