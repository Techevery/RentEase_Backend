"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = exports.getManagedTenants = exports.getManagedProperties = void 0;
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const property_model_1 = require("../models/property.model");
const payment_model_1 = __importDefault(require("../models/payment.model"));
const expense_model_1 = __importDefault(require("../models/expense.model"));
// @desc    Get all properties managed by the manager
// @route   GET /api/managers/properties
// @access  Private/Manager
const getManagedProperties = async (req, res, next) => {
    try {
        // Get houses managed by this manager
        const houses = await property_model_1.House.find({ managerId: req.user.id });
        // Get flats managed by this manager
        const flats = await property_model_1.Flat.find({ managerId: req.user.id }).populate('houseId');
        res.status(200).json({
            success: true,
            data: {
                houses,
                flats
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManagedProperties = getManagedProperties;
// @desc    Get all tenants managed by the manager
// @route   GET /api/managers/tenants
// @access  Private/Manager
const getManagedTenants = async (req, res, next) => {
    try {
        // Get flats managed by this manager
        const flats = await property_model_1.Flat.find({ managerId: req.user.id });
        const flatIds = flats.map(flat => flat._id);
        // Get tenants in those flats
        const tenants = await tenant_model_1.default.find({ flatId: { $in: flatIds } }).populate('flatId');
        res.status(200).json({
            success: true,
            count: tenants.length,
            data: tenants
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManagedTenants = getManagedTenants;
// @desc    Get manager dashboard stats
// @route   GET /api/managers/dashboard
// @access  Private/Manager
const getDashboardStats = async (req, res, next) => {
    try {
        // Get counts of properties managed
        const housesCount = await property_model_1.House.countDocuments({ managerId: req.user.id });
        const flatsCount = await property_model_1.Flat.countDocuments({ managerId: req.user.id });
        // Get flats managed by this manager
        const flats = await property_model_1.Flat.find({ managerId: req.user.id });
        const flatIds = flats.map(flat => flat._id);
        // Get tenants count
        const tenantsCount = await tenant_model_1.default.countDocuments({ flatId: { $in: flatIds } });
        // Get payment stats
        const pendingPayments = await payment_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'pending'
        });
        const approvedPayments = await payment_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'approved'
        });
        const rejectedPayments = await payment_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'rejected'
        });
        // Get expense stats
        const pendingExpenses = await expense_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'pending'
        });
        const approvedExpenses = await expense_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'approved'
        });
        const rejectedExpenses = await expense_model_1.default.countDocuments({
            managerId: req.user.id,
            status: 'rejected'
        });
        // Get recent payments
        const recentPayments = await payment_model_1.default.find({ managerId: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .populate([
            { path: 'tenantId', select: 'name' },
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name' }
        ]);
        // Get recent expenses
        const recentExpenses = await expense_model_1.default.find({ managerId: req.user.id })
            .sort('-createdAt')
            .limit(5)
            .populate([
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name' }
        ]);
        res.status(200).json({
            success: true,
            data: {
                propertyCounts: {
                    houses: housesCount,
                    flats: flatsCount,
                    tenants: tenantsCount
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
