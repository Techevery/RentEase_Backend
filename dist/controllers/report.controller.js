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
exports.getManagerPerformance = exports.getExpenseSummaryByProperty = exports.getPaymentSummaryByProperty = void 0;
const payment_model_1 = __importStar(require("../models/payment.model"));
const expense_model_1 = __importStar(require("../models/expense.model"));
const errorResponse_1 = require("../utils/errorResponse");
const property_model_1 = require("../models/property.model");
// @desc    Get payment summary by property
// @route   GET /api/reports/payments/property/:houseId
// @access  Private/Landlord
const getPaymentSummaryByProperty = async (req, res, next) => {
    try {
        const { houseId } = req.params;
        // Verify house exists and belongs to landlord
        const house = await property_model_1.House.findById(houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Not authorized to view reports for this property`, 401));
        }
        // Get date range from query params or default to current month
        const today = new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date(today.getFullYear(), today.getMonth() + 1, 0);
        // Get all payments for this property within date range
        const payments = await payment_model_1.default.find({
            houseId,
            paymentDate: {
                $gte: startDate,
                $lte: endDate,
            },
        }).populate([
            { path: 'flatId', select: 'number' },
            { path: 'tenantId', select: 'name' },
        ]);
        // Calculate summary
        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const pendingPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.PENDING).length;
        const approvedPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.APPROVED).length;
        const rejectedPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.REJECTED).length;
        const pendingAmount = payments
            .filter((p) => p.status === payment_model_1.PaymentStatus.PENDING)
            .reduce((sum, payment) => sum + payment.amount, 0);
        const approvedAmount = payments
            .filter((p) => p.status === payment_model_1.PaymentStatus.APPROVED)
            .reduce((sum, payment) => sum + payment.amount, 0);
        // Get all flats in this house
        const flats = await property_model_1.Flat.find({ houseId });
        // Calculate expected rent (sum of all flat rent amounts)
        const expectedRent = flats.reduce((sum, flat) => sum + flat.rentAmount, 0);
        // Calculate collected percentage
        const collectionRate = expectedRent > 0 ? (approvedAmount / expectedRent) * 100 : 0;
        const paymentsByFlat = {};
        flats.forEach(({ _id, number, rentAmount }) => {
            const flatIdStr = _id;
            const flatPayments = payments.filter(({ flatId }) => flatId && flatId.toString() === flatIdStr);
            const approvedPayments = flatPayments.filter(({ status }) => status === payment_model_1.PaymentStatus.APPROVED);
            const approvedAmount = approvedPayments.reduce((total, { amount }) => total + amount, 0);
            const collectionRate = rentAmount > 0 ? (approvedAmount / rentAmount) * 100 : 0;
            paymentsByFlat[number] = {
                totalPayments: flatPayments.length,
                approvedAmount,
                expectedAmount: rentAmount,
                collectionRate,
            };
        });
        res.status(200).json({
            success: true,
            data: {
                propertyName: house.name,
                period: {
                    startDate,
                    endDate,
                },
                summary: {
                    totalPayments,
                    totalAmount,
                    pendingPayments,
                    pendingAmount,
                    approvedPayments,
                    approvedAmount,
                    rejectedPayments,
                    expectedRent,
                    collectionRate: parseFloat(collectionRate.toFixed(2)),
                },
                paymentsByFlat,
            },
        });
    }
    catch (error) {
        next(new errorResponse_1.ErrorResponse('Failed to get payment summary', 500));
    }
};
exports.getPaymentSummaryByProperty = getPaymentSummaryByProperty;
// @desc    Get expense summary by property
// @route   GET /api/reports/expenses/property/:houseId
// @access  Private/Landlord
const getExpenseSummaryByProperty = async (req, res, next) => {
    try {
        const { houseId } = req.params;
        // Verify house exists and belongs to landlord
        const house = await property_model_1.House.findById(houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Not authorized to view reports for this property`, 401));
        }
        // Get date range from query params or default to current month
        const today = new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date(today.getFullYear(), today.getMonth() + 1, 0);
        // Get all expenses for this property within date range
        const expenses = await expense_model_1.default.find({
            houseId,
            expenseDate: {
                $gte: startDate,
                $lte: endDate,
            },
        }).populate([{ path: 'flatId', select: 'number' }]);
        // Calculate summary
        const totalExpenses = expenses.length;
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const pendingExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.PENDING).length;
        const approvedExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.APPROVED).length;
        const rejectedExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.REJECTED).length;
        const pendingAmount = expenses
            .filter((e) => e.status === expense_model_1.ExpenseStatus.PENDING)
            .reduce((sum, expense) => sum + expense.amount, 0);
        const approvedAmount = expenses
            .filter((e) => e.status === expense_model_1.ExpenseStatus.APPROVED)
            .reduce((sum, expense) => sum + expense.amount, 0);
        // Expenses by category
        const expensesByCategory = {};
        for (const expense of expenses) {
            if (expense.status !== expense_model_1.ExpenseStatus.APPROVED)
                continue;
            if (!expensesByCategory[expense.category]) {
                expensesByCategory[expense.category] = 0;
            }
            expensesByCategory[expense.category] += expense.amount;
        }
        // Calculate net income (approved payments - approved expenses)
        const payments = await payment_model_1.default.find({
            houseId,
            status: payment_model_1.PaymentStatus.APPROVED,
            paymentDate: {
                $gte: startDate,
                $lte: endDate,
            },
        });
        const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const netIncome = totalIncome - approvedAmount;
        res.status(200).json({
            success: true,
            data: {
                propertyName: house.name,
                period: {
                    startDate,
                    endDate,
                },
                summary: {
                    totalExpenses,
                    totalAmount,
                    pendingExpenses,
                    pendingAmount,
                    approvedExpenses,
                    approvedAmount,
                    rejectedExpenses,
                    totalIncome,
                    netIncome,
                },
                expensesByCategory,
            },
        });
    }
    catch (error) {
        next(new errorResponse_1.ErrorResponse('Failed to get expense summary', 500));
    }
};
exports.getExpenseSummaryByProperty = getExpenseSummaryByProperty;
// @desc    Get manager performance summary
// @route   GET /api/reports/managers/:managerId
// @access  Private/Landlord
const getManagerPerformance = async (req, res, next) => {
    try {
        const { managerId } = req.params;
        // Get date range from query params or default to current month
        const today = new Date();
        const startDate = req.query.startDate
            ? new Date(req.query.startDate)
            : new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = req.query.endDate
            ? new Date(req.query.endDate)
            : new Date(today.getFullYear(), today.getMonth() + 1, 0);
        // Get all payments processed by this manager
        const payments = await payment_model_1.default.find({
            managerId,
            landlordId: req.user.id,
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        });
        // Get all expenses submitted by this manager
        const expenses = await expense_model_1.default.find({
            managerId,
            landlordId: req.user.id,
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            },
        });
        // Calculate payment metrics
        const totalPayments = payments.length;
        const approvedPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.APPROVED).length;
        const rejectedPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.REJECTED).length;
        const pendingPayments = payments.filter((p) => p.status === payment_model_1.PaymentStatus.PENDING).length;
        const approvalRate = totalPayments > 0 ? (approvedPayments / totalPayments) * 100 : 0;
        // Calculate expense metrics
        const totalExpenses = expenses.length;
        const approvedExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.APPROVED).length;
        const rejectedExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.REJECTED).length;
        const pendingExpenses = expenses.filter((e) => e.status === expense_model_1.ExpenseStatus.PENDING).length;
        const expenseApprovalRate = totalExpenses > 0 ? (approvedExpenses / totalExpenses) * 100 : 0;
        // Calculate total amount handled
        const totalPaymentAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenseAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        // Get properties managed
        const houses = await property_model_1.House.find({ managerId });
        const flats = await property_model_1.Flat.find({ managerId });
        // Calculate average response time for approvals/rejections
        let avgResponseTime = 0;
        let countWithResponse = 0;
        for (const payment of payments) {
            if (payment.status === payment_model_1.PaymentStatus.APPROVED && payment.approvedAt) {
                const responseTime = payment.approvedAt.getTime() - payment.createdAt.getTime();
                avgResponseTime += responseTime;
                countWithResponse++;
            }
            else if (payment.status === payment_model_1.PaymentStatus.REJECTED && payment.rejectedAt) {
                const responseTime = payment.rejectedAt.getTime() - payment.createdAt.getTime();
                avgResponseTime += responseTime;
                countWithResponse++;
            }
        }
        for (const expense of expenses) {
            if (expense.status === expense_model_1.ExpenseStatus.APPROVED && expense.approvedAt) {
                const responseTime = expense.approvedAt.getTime() - expense.createdAt.getTime();
                avgResponseTime += responseTime;
                countWithResponse++;
            }
            else if (expense.status === expense_model_1.ExpenseStatus.REJECTED && expense.rejectedAt) {
                const responseTime = expense.rejectedAt.getTime() - expense.createdAt.getTime();
                avgResponseTime += responseTime;
                countWithResponse++;
            }
        }
        avgResponseTime = countWithResponse > 0 ? avgResponseTime / countWithResponse : 0;
        // Convert to hours
        const avgResponseHours = avgResponseTime > 0 ? avgResponseTime / (1000 * 60 * 60) : 0;
        res.status(200).json({
            success: true,
            data: {
                managerId,
                period: {
                    startDate,
                    endDate,
                },
                paymentMetrics: {
                    totalPayments,
                    approvedPayments,
                    rejectedPayments,
                    pendingPayments,
                    approvalRate: parseFloat(approvalRate.toFixed(2)),
                    totalAmount: totalPaymentAmount,
                },
                expenseMetrics: {
                    totalExpenses,
                    approvedExpenses,
                    rejectedExpenses,
                    pendingExpenses,
                    approvalRate: parseFloat(expenseApprovalRate.toFixed(2)),
                    totalAmount: totalExpenseAmount,
                },
                propertiesManaged: {
                    houses: houses.length,
                    flats: flats.length,
                },
                responsiveness: {
                    avgResponseHours: parseFloat(avgResponseHours.toFixed(2)),
                },
            },
        });
    }
    catch (error) {
        next(new errorResponse_1.ErrorResponse('Failed to get manager performance summary', 500));
    }
};
exports.getManagerPerformance = getManagerPerformance;
