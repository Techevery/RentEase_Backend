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
exports.getTenantPaymentSummary = exports.rejectPayment = exports.approvePayment = exports.getPayment = exports.getPayments = exports.createPayment = void 0;
const payment_model_1 = __importStar(require("../models/payment.model"));
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const property_model_1 = require("../models/property.model");
const errorResponse_1 = require("../utils/errorResponse");
const cloudinary_1 = require("../config/cloudinary");
// Upload tenant payment (by manager)
// POST /api/payments
const createPayment = async (req, res, next) => {
    var _a, _b;
    try {
        const { flatId, amount, paymentDate, dueDate, paymentMethod, description } = req.body;
        const flat = await property_model_1.Flat.findById(flatId).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${flatId}`, 404));
        }
        if (!flat.tenantId) {
            return next(new errorResponse_1.ErrorResponse(`No tenant assigned to this flat`, 400));
        }
        const tenant = await tenant_model_1.default.findById(flat.tenantId);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found`, 404));
        }
        const house = flat.houseId;
        // Add file upload details if present
        const payment = await payment_model_1.default.create({
            amount,
            paymentDate,
            dueDate,
            paymentMethod,
            description,
            tenantId: flat.tenantId, // Use tenant from flat
            flatId,
            houseId: house._id,
            managerId: req.user.id,
            landlordId: house.landlordId,
            status: payment_model_1.PaymentStatus.PENDING,
            receiptUrl: ((_a = req.file) === null || _a === void 0 ? void 0 : _a.path) || null,
            receiptPublicId: ((_b = req.file) === null || _b === void 0 ? void 0 : _b.filename) || null,
            reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });
        res.status(201).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPayment = createPayment;
// Get all payments
// GET /api/payments
const getPayments = async (req, res, next) => {
    try {
        let query;
        // For landlords, get all payments for their properties
        if (req.user.role === 'landlord') {
            query = payment_model_1.default.find({ landlordId: req.user.id });
        }
        // For managers, get payments for properties they manage
        else if (req.user.role === 'manager') {
            query = payment_model_1.default.find({ managerId: req.user.id });
        }
        else {
            return next(new errorResponse_1.ErrorResponse('Unauthorized access', 401));
        }
        // Add filters
        if (req.query.status) {
            query = query.find({ status: req.query.status });
        }
        if (req.query.tenantId) {
            query = query.find({ tenantId: req.query.tenantId });
        }
        if (req.query.flatId) {
            query = query.find({ flatId: req.query.flatId });
        }
        if (req.query.houseId) {
            query = query.find({ houseId: req.query.houseId });
        }
        // Add date filters
        if (req.query.fromDate) {
            query = query.find({
                paymentDate: {
                    $gte: new Date(req.query.fromDate)
                }
            });
        }
        if (req.query.toDate) {
            query = query.find({
                paymentDate: {
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
            query = query.sort('-paymentDate');
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await payment_model_1.default.countDocuments(query.getQuery());
        query = query.skip(startIndex).limit(limit);
        // Add population
        query = query.populate([
            { path: 'tenantId', select: 'name email phone' },
            { path: 'flatId', select: 'number rentAmount' },
            { path: 'houseId', select: 'name address' },
            { path: 'managerId', select: 'name email' },
        ]);
        // Execute query
        const payments = await query;
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
            count: payments.length,
            pagination,
            data: payments,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPayments = getPayments;
//  Get single payment
//  GET /api/payments/:id
const getPayment = async (req, res, next) => {
    try {
        const payment = await payment_model_1.default.findById(req.params.id).populate([
            { path: 'tenantId', select: 'name email phone' },
            { path: 'flatId', select: 'number rentAmount' },
            { path: 'houseId', select: 'name address' },
            { path: 'managerId', select: 'name email' },
        ]);
        if (!payment) {
            return next(new errorResponse_1.ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is authorized
        if (payment.landlordId.toString() !== req.user.id &&
            payment.managerId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this payment`, 401));
        }
        res.status(200).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPayment = getPayment;
// Approve payment (by landlord)
// PUT /api/payments/:id/approve
const approvePayment = async (req, res, next) => {
    try {
        const payment = await payment_model_1.default.findById(req.params.id);
        if (!payment) {
            return next(new errorResponse_1.ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is landlord
        if (payment.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to approve this payment`, 401));
        }
        // Make sure payment is in pending status
        if (payment.status !== payment_model_1.PaymentStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Payment is not in pending status`, 400));
        }
        // Update payment status
        payment.status = payment_model_1.PaymentStatus.APPROVED;
        payment.approvedAt = new Date();
        await payment.save();
        // Get tenant and flat details for notification
        const tenant = await tenant_model_1.default.findById(payment.tenantId);
        const flat = await property_model_1.Flat.findById(payment.flatId).populate('houseId');
        if (!tenant || !flat) {
            return next(new errorResponse_1.ErrorResponse(`Tenant or flat data not found`, 404));
        }
        const house = flat.houseId;
        res.status(200).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approvePayment = approvePayment;
//  Reject payment (by landlord)
// PUT /api/payments/:id/reject
const rejectPayment = async (req, res, next) => {
    try {
        const { rejectionReason } = req.body;
        // if (!rejectionReason) {
        //   return next(new ErrorResponse('Please provide a reason for rejection', 400));
        // }
        const payment = await payment_model_1.default.findById(req.params.id);
        if (!payment) {
            return next(new errorResponse_1.ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is landlord
        if (payment.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to reject this payment`, 401));
        }
        // Make sure payment is in pending status
        if (payment.status !== payment_model_1.PaymentStatus.PENDING) {
            return next(new errorResponse_1.ErrorResponse(`Payment is not in pending status`, 400));
        }
        // Update payment status
        payment.status = payment_model_1.PaymentStatus.REJECTED;
        payment.rejectedAt = new Date();
        payment.rejectionReason = rejectionReason;
        await payment.save();
        // Get tenant and flat details for notification
        const tenant = await tenant_model_1.default.findById(payment.tenantId);
        const flat = await property_model_1.Flat.findById(payment.flatId).populate('houseId');
        if (!tenant || !flat) {
            return next(new errorResponse_1.ErrorResponse(`Tenant or flat data not found`, 404));
        }
        const house = flat.houseId;
        // If there's a receipt, delete it from Cloudinary
        if (payment.receiptPublicId) {
            await (0, cloudinary_1.deleteFromCloudinary)(payment.receiptPublicId);
        }
        res.status(200).json({
            success: true,
            data: payment,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectPayment = rejectPayment;
// Get tenant payment summary with details and totals
// GET /api/payments/tenant/:tenantId/summary
const getTenantPaymentSummary = async (req, res, next) => {
    var _a, _b, _c, _d, _e;
    try {
        const tenantId = req.params.id || req.query.tenantId;
        if (!tenantId) {
            return next(new errorResponse_1.ErrorResponse('Tenant ID parameter is required', 400));
        }
        const tenant = await tenant_model_1.default.findById(tenantId)
            .populate([
            {
                path: 'flat',
                select: 'number houseId',
                populate: {
                    path: 'houseId',
                    select: 'name address'
                }
            },
            {
                path: 'user',
                select: 'name email phone'
            }
        ]);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${tenantId}`, 404));
        }
        const payments = await payment_model_1.default.find({ tenantId })
            .populate([
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name address' },
            { path: 'managerId', select: 'name email' }
        ])
            .sort('-paymentDate');
        // Calculate summary statistics
        const totalPayments = payments.length;
        const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
        const approvedPayments = payments.filter(p => p.status === payment_model_1.PaymentStatus.APPROVED);
        const pendingPayments = payments.filter(p => p.status === payment_model_1.PaymentStatus.PENDING);
        const rejectedPayments = payments.filter(p => p.status === payment_model_1.PaymentStatus.REJECTED);
        const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRejectedAmount = rejectedPayments.reduce((sum, p) => sum + p.amount, 0);
        // Get payment method breakdown
        const paymentMethodBreakdown = payments.reduce((acc, payment) => {
            const method = payment.paymentMethod;
            if (!acc[method]) {
                acc[method] = { count: 0, totalAmount: 0 };
            }
            acc[method].count += 1;
            acc[method].totalAmount += payment.amount;
            return acc;
        }, {});
        // Get monthly breakdown
        const monthlyBreakdown = payments.reduce((acc, payment) => {
            const monthYear = payment.paymentDate.toISOString().substring(0, 7); // YYYY-MM format
            if (!acc[monthYear]) {
                acc[monthYear] = { count: 0, totalAmount: 0, payments: [] };
            }
            acc[monthYear].count += 1;
            acc[monthYear].totalAmount += payment.amount;
            acc[monthYear].payments.push(payment);
            return acc;
        }, {});
        // Get recent activity (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const recentPayments = payments.filter(p => p.paymentDate >= sixMonthsAgo);
        // Format response
        const response = {
            success: true,
            data: {
                tenant: {
                    id: tenant._id,
                    name: tenant.name || tenant.name,
                    email: tenant.email || tenant.email,
                    phone: tenant.phone || tenant.phone,
                    emergencyContact: tenant.emergencyContact,
                    rentAmount: tenant.rentAmount,
                    leaseStart: tenant.leaseStartDate,
                    leaseEnd: tenant.leaseEndDate,
                    status: tenant.status,
                    property: ((_b = (_a = tenant.flatId) === null || _a === void 0 ? void 0 : _a.houseId) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown Property',
                    propertyAddress: ((_d = (_c = tenant.flatId) === null || _c === void 0 ? void 0 : _c.houseId) === null || _d === void 0 ? void 0 : _d.address) || 'Unknown Address',
                    unit: ((_e = tenant.flatId) === null || _e === void 0 ? void 0 : _e.number) || 'Unknown Unit'
                },
                summary: {
                    totalPayments,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    approved: {
                        count: approvedPayments.length,
                        amount: parseFloat(totalApprovedAmount.toFixed(2))
                    },
                    pending: {
                        count: pendingPayments.length,
                        amount: parseFloat(totalPendingAmount.toFixed(2))
                    },
                    rejected: {
                        count: rejectedPayments.length,
                        amount: parseFloat(totalRejectedAmount.toFixed(2))
                    },
                    averagePayment: totalPayments > 0
                        ? parseFloat((totalAmount / totalPayments).toFixed(2))
                        : 0
                },
                paymentMethodBreakdown,
                monthlyBreakdown: Object.entries(monthlyBreakdown)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .slice(0, 12) // Last 12 months
                    .reduce((acc, [month, data]) => {
                    acc[month] = {
                        count: data.count,
                        totalAmount: parseFloat(data.totalAmount.toFixed(2)),
                        payments: data.payments.map(p => ({
                            id: p._id,
                            amount: p.amount,
                            status: p.status,
                            paymentDate: p.paymentDate,
                            paymentMethod: p.paymentMethod,
                            description: p.description
                        }))
                    };
                    return acc;
                }, {}),
                recentActivity: {
                    period: 'last-6-months',
                    payments: recentPayments.map(payment => {
                        var _a, _b, _c;
                        return ({
                            id: payment._id,
                            amount: payment.amount,
                            status: payment.status,
                            paymentDate: payment.paymentDate,
                            paymentMethod: payment.paymentMethod,
                            description: payment.description,
                            flat: (_a = payment.flatId) === null || _a === void 0 ? void 0 : _a.number,
                            property: (_b = payment.houseId) === null || _b === void 0 ? void 0 : _b.name,
                            uploadedBy: ((_c = payment.managerId) === null || _c === void 0 ? void 0 : _c.name) || 'System',
                            reference: payment.reference
                        });
                    })
                },
                allPayments: payments.map(payment => {
                    var _a, _b, _c;
                    return ({
                        id: payment._id,
                        amount: payment.amount,
                        status: payment.status,
                        paymentDate: payment.paymentDate,
                        dueDate: payment.dueDate,
                        paymentMethod: payment.paymentMethod,
                        description: payment.description,
                        reference: payment.reference,
                        receiptUrl: payment.receiptUrl,
                        approvedAt: payment.approvedAt,
                        rejectedAt: payment.rejectedAt,
                        rejectionReason: payment.rejectionReason,
                        flat: (_a = payment.flatId) === null || _a === void 0 ? void 0 : _a.number,
                        property: (_b = payment.houseId) === null || _b === void 0 ? void 0 : _b.name,
                        uploadedBy: ((_c = payment.managerId) === null || _c === void 0 ? void 0 : _c.name) || 'System',
                        createdAt: payment.createdAt
                    });
                })
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getTenantPaymentSummary = getTenantPaymentSummary;
