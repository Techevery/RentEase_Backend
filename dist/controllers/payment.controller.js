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
exports.sendPaymentReminders = exports.rejectPayment = exports.approvePayment = exports.getPayment = exports.getPayments = exports.createPayment = void 0;
const payment_model_1 = __importStar(require("../models/payment.model"));
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const property_model_1 = require("../models/property.model");
const errorResponse_1 = require("../utils/errorResponse");
const cloudinary_1 = require("../config/cloudinary");
const notification_model_1 = __importStar(require("../models/notification.model"));
const emailService_1 = require("../utils/emailService");
// @desc    Upload tenant payment (by manager)
// @route   POST /api/payments
// @access  Private/Manager
const createPayment = async (req, res, next) => {
    var _a, _b, _c;
    try {
        const { tenantId, flatId, amount, paymentDate, dueDate, paymentMethod, description } = req.body;
        // Check if tenant exists and belongs to a flat
        const tenant = await tenant_model_1.default.findById(tenantId);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${tenantId}`, 404));
        }
        // Check if flat exists
        const flat = await property_model_1.Flat.findById(flatId).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${flatId}`, 404));
        }
        // Ensure tenant belongs to this flat
        if (((_a = tenant.flatId) === null || _a === void 0 ? void 0 : _a.toString()) !== flatId) {
            return next(new errorResponse_1.ErrorResponse(`Tenant does not belong to this flat`, 400));
        }
        const house = flat.houseId;
        // Make sure manager is assigned to this flat
        if (!flat.managerId || flat.managerId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Manager not authorized to manage this flat`, 401));
        }
        // Add file upload details if present
        const payment = await payment_model_1.default.create({
            amount,
            paymentDate,
            dueDate,
            paymentMethod,
            description,
            tenantId,
            flatId,
            houseId: house._id,
            managerId: req.user.id,
            landlordId: house.landlordId,
            status: payment_model_1.PaymentStatus.PENDING,
            receiptUrl: ((_b = req.file) === null || _b === void 0 ? void 0 : _b.path) || null,
            receiptPublicId: ((_c = req.file) === null || _c === void 0 ? void 0 : _c.filename) || null,
        });
        // Create notification for landlord
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.PAYMENT_RECEIVED,
            title: 'New Payment Submitted',
            message: `A new payment of ${amount} has been submitted for ${tenant.name} in ${house.name}, Flat ${flat.number}.`,
            recipientId: house.landlordId,
            recipientRole: 'landlord',
            referenceId: payment._id,
            referenceModel: 'Payment',
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
// @desc    Get all payments
// @route   GET /api/payments
// @access  Private/Landlord/Manager
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
// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private/Landlord/Manager
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
// @desc    Approve payment (by landlord)
// @route   PUT /api/payments/:id/approve
// @access  Private/Landlord
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
        // Create notification for manager
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.PAYMENT_APPROVED,
            title: 'Payment Approved',
            message: `The payment of ${payment.amount} for ${tenant.name} in ${house.name}, Flat ${flat.number} has been approved.`,
            recipientId: payment.managerId,
            recipientRole: 'manager',
            referenceId: payment._id,
            referenceModel: 'Payment',
        });
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
// @desc    Reject payment (by landlord)
// @route   PUT /api/payments/:id/reject
// @access  Private/Landlord
const rejectPayment = async (req, res, next) => {
    try {
        const { rejectionReason } = req.body;
        if (!rejectionReason) {
            return next(new errorResponse_1.ErrorResponse('Please provide a reason for rejection', 400));
        }
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
        // Create notification for manager
        await notification_model_1.default.create({
            type: notification_model_1.NotificationType.PAYMENT_REJECTED,
            title: 'Payment Rejected',
            message: `The payment of ${payment.amount} for ${tenant.name} in ${house.name}, Flat ${flat.number} has been rejected. Reason: ${rejectionReason}`,
            recipientId: payment.managerId,
            recipientRole: 'manager',
            referenceId: payment._id,
            referenceModel: 'Payment',
        });
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
// @desc    Send payment reminders for upcoming due dates
// @route   POST /api/payments/send-reminders
// @access  Private/Landlord
const sendPaymentReminders = async (req, res, next) => {
    try {
        // Ensure user is a landlord
        if (req.user.role !== 'landlord') {
            return next(new errorResponse_1.ErrorResponse('Only landlords can send payment reminders', 403));
        }
        // Find all tenants for this landlord that have a flatId
        const tenants = await tenant_model_1.default.find({
            landlordId: req.user.id,
            flatId: { $ne: null }
        });
        const remindersSent = [];
        for (const tenant of tenants) {
            if (!tenant.flatId)
                continue;
            const flat = await property_model_1.Flat.findById(tenant.flatId).populate('houseId');
            if (!flat)
                continue;
            const house = flat.houseId;
            // Calculate next due date
            const today = new Date();
            const dueDay = flat.rentDueDay || 1; // Default to 1st if not set
            const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
            // If due date has passed for this month, set it for next month
            if (today.getDate() > dueDay) {
                dueDate.setMonth(dueDate.getMonth() + 1);
            }
            // Check if there's already a payment for this period
            const existingPayment = await payment_model_1.default.findOne({
                tenantId: tenant._id,
                flatId: flat._id,
                status: { $in: [payment_model_1.PaymentStatus.APPROVED, payment_model_1.PaymentStatus.PENDING] },
                dueDate: {
                    $gte: new Date(dueDate.getFullYear(), dueDate.getMonth(), 1),
                    $lt: new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 1)
                }
            });
            if (existingPayment)
                continue;
            // Calculate days until due
            const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            // Send reminder if due in 30 days, 14 days, or 7 days
            if ([30, 14, 7].includes(daysUntilDue)) {
                // Check if reminder has already been sent in the last 7 days
                const recentNotification = await notification_model_1.default.findOne({
                    type: notification_model_1.NotificationType.PAYMENT_DUE,
                    recipientId: tenant._id,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                });
                if (!recentNotification) {
                    await (0, emailService_1.sendPaymentReminderEmail)(tenant.email, tenant.name, dueDate, flat.rentAmount, house.name, flat.number);
                    remindersSent.push(tenant.email);
                }
            }
        }
        res.status(200).json({
            success: true,
            count: remindersSent.length,
            data: remindersSent,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendPaymentReminders = sendPaymentReminders;
