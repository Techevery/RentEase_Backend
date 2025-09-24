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
exports.deleteManager = exports.updateManager = exports.getManager = exports.getManagers = exports.createManager = void 0;
const user_model_1 = __importStar(require("../models/user.model"));
const errorResponse_1 = require("../utils/errorResponse");
const passwordGenerator_1 = require("../utils/passwordGenerator");
const emailService_1 = require("../utils/emailService");
const manager_model_1 = __importDefault(require("../models/manager.model"));
// Create a new manager
// POST /api/landlords/managers
const createManager = async (req, res, next) => {
    try {
        const { name, email, phone } = req.body;
        const existingUser = await user_model_1.default.findOne({ email });
        if (existingUser) {
            return next(new errorResponse_1.ErrorResponse('Email already in use', 400));
        }
        const password = (0, passwordGenerator_1.generateRandomPassword)();
        const user = await user_model_1.default.create({
            name,
            phonenumber: phone,
            email,
            password,
            role: user_model_1.UserRole.MANAGER,
        });
        const manager = await manager_model_1.default.create({
            userId: user._id,
            landlordId: req.user._id
        });
        await (0, emailService_1.sendManagerInviteEmail)(email, password, name);
        res.status(201).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            message: 'Manager created successfully. Credentials sent via email.',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createManager = createManager;
// Get all managers created by landlord
// GET /api/landlords/managers
const getManagers = async (req, res, next) => {
    try {
        console.log({ id: req.user._id });
        const managerRecords = await manager_model_1.default.find({ landlordId: req.user._id });
        console.log({ managerRecords });
        const managerUserIds = managerRecords.map(record => record.userId);
        const managers = await user_model_1.default.find({
            _id: { $in: managerUserIds },
            role: user_model_1.UserRole.MANAGER
        });
        res.status(200).json({
            success: true,
            count: managers.length,
            data: managers,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManagers = getManagers;
// Get single manager
// GET /api/landlords/managers/:id
const getManager = async (req, res, next) => {
    try {
        const managerRecord = await manager_model_1.default.findOne({
            userId: req.params.id,
            landlordId: req.user._id
        });
        if (!managerRecord) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        const manager = await user_model_1.default.findById(req.params.id);
        if (!manager) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        if (manager.role !== user_model_1.UserRole.MANAGER) {
            return next(new errorResponse_1.ErrorResponse(`User is not a manager`, 400));
        }
        res.status(200).json({
            success: true,
            data: manager,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManager = getManager;
// Update manager
//  PUT /api/landlords/managers/:id
const updateManager = async (req, res, next) => {
    try {
        const { name, email } = req.body;
        const managerRecord = await manager_model_1.default.findOne({
            userId: req.params.id,
            landlordId: req.user._id
        });
        if (!managerRecord) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        const manager = await user_model_1.default.findById(req.params.id);
        if (!manager) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        if (manager.role !== user_model_1.UserRole.MANAGER) {
            return next(new errorResponse_1.ErrorResponse(`User is not a manager`, 400));
        }
        manager.name = name || manager.name;
        manager.email = email || manager.email;
        await manager.save();
        res.status(200).json({
            success: true,
            data: manager,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateManager = updateManager;
//  Delete manager
// DELETE /api/landlords/managers/:id
const deleteManager = async (req, res, next) => {
    try {
        const managerRecord = await manager_model_1.default.findOne({
            userId: req.params.id,
            landlordId: req.user._id
        });
        if (!managerRecord) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        const manager = await user_model_1.default.findById(req.params.id);
        if (!manager) {
            return next(new errorResponse_1.ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
        }
        if (manager.role !== user_model_1.UserRole.MANAGER) {
            return next(new errorResponse_1.ErrorResponse(`User is not a manager`, 400));
        }
        await manager.deleteOne({ _id: manager._id });
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteManager = deleteManager;
