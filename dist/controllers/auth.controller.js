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
exports.updateMe = exports.updatePassword = exports.resetPassword = exports.forgotPassword = exports.getMe = exports.login = exports.register = void 0;
const user_model_1 = __importStar(require("../models/user.model"));
const generateToken_1 = require("../utils/generateToken");
const errorResponse_1 = require("../utils/errorResponse");
const emailService_1 = require("../utils/emailService");
const crypto_1 = __importDefault(require("crypto"));
// Register a landlord
//  POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const { name, email, password, phonenumber } = req.body;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return next(new errorResponse_1.ErrorResponse('Email already in use', 400));
        }
        const phoneNumber = parseInt(phonenumber);
        if (isNaN(phoneNumber)) {
            return next(new errorResponse_1.ErrorResponse('Invalid phone number format', 400));
        }
        const existingPhoneUser = await user_model_1.default.findOne({ phonenumber: phoneNumber });
        if (existingPhoneUser) {
            return next(new errorResponse_1.ErrorResponse('Phone number already in use', 400));
        }
        const user = await user_model_1.default.create({
            name,
            email,
            password,
            phonenumber,
            role: user_model_1.UserRole.LANDLORD,
        });
        const token = (0, generateToken_1.generateToken)(user);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phonenumber,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
// Login user
// POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return next(new errorResponse_1.ErrorResponse('Please provide email, password, and role', 400));
        }
        if (!password || password.trim() === '') {
            return next(new errorResponse_1.ErrorResponse('Please provide a password', 400));
        }
        const user = await user_model_1.default.findOne({ email, role }).select('+password');
        if (!user) {
            return next(new errorResponse_1.ErrorResponse('Invalid credentials', 401));
        }
        const token = (0, generateToken_1.generateToken)(user);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phonenumber,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
// Get current logged in user
// GET /api/auth/me
const getMe = async (req, res, next) => {
    try {
        const user = await user_model_1.default.findById(req.user.id);
        res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
// Forgot password
// POST /api/auth/forgotpassword
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await user_model_1.default.findOne({ email });
        if (!user) {
            return next(new errorResponse_1.ErrorResponse('There is no user with that email', 404));
        }
        const resetToken = user.getResetPasswordToken();
        await user.save({ validateBeforeSave: false });
        try {
            await (0, emailService_1.sendPasswordResetEmail)(user.email, resetToken, user.name);
            res.status(200).json({
                success: true,
                message: 'Email sent',
            });
        }
        catch (err) {
            console.error('Email could not be sent', err);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save({ validateBeforeSave: false });
            return next(new errorResponse_1.ErrorResponse('Email could not be sent', 500));
        }
    }
    catch (error) {
        next(error);
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
const resetPassword = async (req, res, next) => {
    try {
        const resetPasswordToken = crypto_1.default
            .createHash('sha256')
            .update(req.params.resettoken)
            .digest('hex');
        const user = await user_model_1.default.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            return next(new errorResponse_1.ErrorResponse('Invalid token', 400));
        }
        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        const token = (0, generateToken_1.generateToken)(user);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
//  Update password
//  PUT /api/auth/updatepassword
const updatePassword = async (req, res, next) => {
    var _a;
    try {
        const user = await user_model_1.default.findById(req.user.id).select('+password');
        if (!user) {
            return next(new errorResponse_1.ErrorResponse('User not found', 404));
        }
        if (!((_a = req.body.currentPassword) === null || _a === void 0 ? void 0 : _a.trim())) {
            return next(new errorResponse_1.ErrorResponse('Current password is required', 400));
        }
        const isMatch = await user.matchPassword(req.body.currentPassword);
        if (!isMatch) {
            return next(new errorResponse_1.ErrorResponse('Password is incorrect', 401));
        }
        user.password = req.body.newPassword;
        await user.save();
        const token = (0, generateToken_1.generateToken)(user);
        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updatePassword = updatePassword;
// Update user profile information
// PUT /api/auth/update-me
const updateMe = async (req, res, next) => {
    try {
        const user = await user_model_1.default.findById(req.user.id);
        if (!user) {
            return next(new errorResponse_1.ErrorResponse('User not found', 404));
        }
        const allowedFields = ['name', 'email', 'phonenumber'];
        allowedFields.forEach((field) => {
            if (req.body[field]) {
                user[field] = req.body[field];
            }
        });
        await user.save();
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phonenumber,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMe = updateMe;
