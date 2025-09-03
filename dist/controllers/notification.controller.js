"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getNotifications = void 0;
const notification_model_1 = __importDefault(require("../models/notification.model"));
const errorResponse_1 = require("../utils/errorResponse");
// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
    try {
        const query = notification_model_1.default.find({
            recipientId: req.user.id,
            recipientRole: req.user.role,
        });
        // Add filters
        if (req.query.isRead) {
            query.find({ isRead: req.query.isRead === 'true' });
        }
        if (req.query.type) {
            query.find({ type: req.query.type });
        }
        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query.sort(sortBy);
        }
        else {
            query.sort('-createdAt');
        }
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await notification_model_1.default.countDocuments(query);
        query.skip(startIndex).limit(limit);
        // Execute query
        const notifications = await query;
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
            count: notifications.length,
            pagination,
            data: notifications,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getNotifications = getNotifications;
// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res, next) => {
    try {
        const notification = await notification_model_1.default.findById(req.params.id);
        if (!notification) {
            return next(new errorResponse_1.ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
        }
        // Make sure user owns this notification
        if (notification.recipientId.toString() !== req.user.id ||
            notification.recipientRole !== req.user.role) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this notification`, 401));
        }
        notification.isRead = true;
        await notification.save();
        res.status(200).json({
            success: true,
            data: notification,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsAsRead = async (req, res, next) => {
    try {
        await notification_model_1.default.updateMany({
            recipientId: req.user.id,
            recipientRole: req.user.role,
            isRead: false,
        }, {
            isRead: true,
        });
        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res, next) => {
    try {
        const notification = await notification_model_1.default.findById(req.params.id);
        if (!notification) {
            return next(new errorResponse_1.ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
        }
        // Make sure user owns this notification
        if (notification.recipientId.toString() !== req.user.id ||
            notification.recipientRole !== req.user.role) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this notification`, 401));
        }
        await notification.deleteOne({ _id: notification._id });
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteNotification = deleteNotification;
