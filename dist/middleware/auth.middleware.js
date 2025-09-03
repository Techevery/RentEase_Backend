"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_model_1 = __importDefault(require("../models/user.model"));
const errorResponse_1 = require("../utils/errorResponse");
// Protect routes
const protect = async (req, res, next) => {
    let token;
    console.log(req.body);
    if (req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')) {
        // Get token from header
        token = req.headers.authorization.split(' ')[1];
    }
    // Check if token exists
    if (!token) {
        return next(new errorResponse_1.ErrorResponse('Not authorized to access this route', 401));
    }
    try {
        // Verify token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get user from the token
        const user = await user_model_1.default.findById(decoded.id);
        req.user = user;
        if (!req.user) {
            return next(new errorResponse_1.ErrorResponse('User not found', 404));
        }
        next();
    }
    catch (error) {
        return next(new errorResponse_1.ErrorResponse('Not authorized to access this route', 401));
    }
};
exports.protect = protect;
// Grant access to specific roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            next(new errorResponse_1.ErrorResponse('User not found', 404));
            return;
        }
        if (!roles.includes(req.user.role)) {
            next(new errorResponse_1.ErrorResponse(`User role ${req.user.role} is not authorized to access this route`, 403));
            return;
        }
        next();
    };
};
exports.authorize = authorize;
