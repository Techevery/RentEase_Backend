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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const property_model_1 = require("../models/property.model");
const payment_model_1 = __importStar(require("../models/payment.model"));
const expense_model_1 = __importStar(require("../models/expense.model"));
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const manager_model_1 = __importDefault(require("../models/manager.model"));
;
// Get landlord dashboard stats
// GET /api/landlords/dashboard
const getDashboardStats = async (req, res, next) => {
    try {
        const housesCount = await property_model_1.House.countDocuments({ landlordId: req.user.id });
        const flatsCount = await property_model_1.Flat.countDocuments({ houseId: { $in: (await property_model_1.House.find({ landlordId: req.user.id })).map(h => h._id) } });
        const tenantsCount = await tenant_model_1.default.countDocuments({ landlordId: req.user.id });
        const managersCount = await manager_model_1.default.countDocuments({ landlordId: req.user.id });
        // Get payment stats
        const pendingPayments = await payment_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: payment_model_1.PaymentStatus.PENDING
        });
        const approvedPayments = await payment_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: payment_model_1.PaymentStatus.APPROVED
        });
        const rejectedPayments = await payment_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: payment_model_1.PaymentStatus.REJECTED
        });
        // Get expense stats
        const pendingExpenses = await expense_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.PENDING
        });
        const approvedExpenses = await expense_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.APPROVED
        });
        const rejectedExpenses = await expense_model_1.default.countDocuments({
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.REJECTED
        });
        // Get financial overview
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
        // Get current month income
        const monthlyPayments = await payment_model_1.default.find({
            landlordId: req.user.id,
            status: payment_model_1.PaymentStatus.APPROVED,
            paymentDate: {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            }
        });
        const monthlyExpenses = await expense_model_1.default.find({
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.APPROVED,
            expenseDate: {
                $gte: firstDayOfMonth,
                $lte: lastDayOfMonth
            }
        });
        const monthlyIncome = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const monthlyExpenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const monthlyNetIncome = monthlyIncome - monthlyExpenseTotal;
        // Calculate occupancy rate
        const occupiedFlatsCount = await property_model_1.Flat.countDocuments({
            houseId: { $in: (await property_model_1.House.find({ landlordId: req.user.id })).map(h => h._id) },
            tenantId: { $ne: null }
        });
        const occupancyRate = flatsCount > 0 ? (occupiedFlatsCount / flatsCount) * 100 : 0;
        // Get recent activities
        const recentPayments = await payment_model_1.default.find({ landlordId: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .populate([
            { path: 'tenantId', select: 'name' },
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name' },
            { path: 'managerId', select: 'name' }
        ]);
        const recentExpenses = await expense_model_1.default.find({ landlordId: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .populate([
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name' },
            { path: 'managerId', select: 'name' }
        ]);
        // Get unread notifications count
        res.status(200).json({
            success: true,
            data: {
                propertyCounts: {
                    houses: housesCount,
                    flats: flatsCount,
                    tenants: tenantsCount,
                    managers: managersCount,
                    occupancyRate: parseFloat(occupancyRate.toFixed(2))
                },
                paymentStats: {
                    pending: pendingPayments,
                    approved: approvedPayments,
                    rejected: rejectedPayments,
                    total: pendingPayments + approvedPayments + rejectedPayments
                },
                expenseStats: {
                    pending: pendingExpenses,
                    approved: approvedExpenses,
                    rejected: rejectedExpenses,
                    total: pendingExpenses + approvedExpenses + rejectedExpenses
                },
                financialOverview: {
                    currentMonth: {
                        income: monthlyIncome,
                        expenses: monthlyExpenseTotal,
                        netIncome: monthlyNetIncome
                    }
                },
                recentActivity: {
                    payments: recentPayments,
                    expenses: recentExpenses
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
