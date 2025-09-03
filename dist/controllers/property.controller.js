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
exports.getMaintenanceHistory = exports.addMaintenanceRecord = exports.deleteFlat = exports.updateFlat = exports.getFlat = exports.getFlats = exports.createFlat = exports.deleteHouse = exports.updateHouse = exports.getHouse = exports.getHouses = exports.createHouse = void 0;
const property_model_1 = require("../models/property.model");
const manager_model_1 = __importDefault(require("../models/manager.model"));
const errorResponse_1 = require("../utils/errorResponse");
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const cloudinary_1 = require("../config/cloudinary");
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importStar(require("../models/user.model"));
// @desc    Create a new house
// @route   POST /api/properties/houses
// @access  Private/Landlord
const createHouse = async (req, res, next) => {
    try {
        req.body.landlordId = req.user.id;
        // Handle image uploads if present
        let images = [];
        console.log({ files: req.files });
        if (req.files) {
            const files = req.files;
            images = files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
        }
        const payload = { ...req.body, images };
        const house = await property_model_1.House.create(payload);
        // console.log(payload)
        // If manager is assigned, verify manager exists and can take more properties
        if (req.body.managerId && req.body.managerId !== 'null') {
            const user = await user_model_1.default.findOne({ _id: req.body.managerId, role: user_model_1.UserRole.MANAGER });
            if (!user) {
                return next(new errorResponse_1.ErrorResponse(`Manager not found`, 404));
            }
            let manager = await manager_model_1.default.findOne({ userId: user._id });
            if (!manager) {
                manager = await manager_model_1.default.create({
                    userId: user._id,
                    properties: {
                        houses: [],
                    },
                });
            }
            // Add house to manager's properties
            manager.properties.houses.push(house._id);
            await manager.save();
        }
        res.status(201).json({
            success: true,
            data: house,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createHouse = createHouse;
// @desc    Get all houses for landlord
// @route   GET /api/properties/houses
// @access  Private/Landlord
const getHouses = async (req, res, next) => {
    try {
        const query = property_model_1.House.find({ landlordId: req.user.id });
        // Add filters
        if (req.query.propertyType) {
            query.find({ propertyType: req.query.propertyType });
        }
        if (req.query.status) {
            query.find({ status: req.query.status });
        }
        const houses = await query;
        const modHouses = [];
        for (const house of houses) {
            const manager = await manager_model_1.default.findOne({ "properties.houses": house._id });
            const user = await user_model_1.default.findById(manager === null || manager === void 0 ? void 0 : manager.userId);
            modHouses.push({
                ...house.toObject(),
                manager: user
            });
        }
        res.status(200).json({
            success: true,
            count: modHouses.length,
            data: modHouses,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getHouses = getHouses;
// @desc    Get single house with details
// @route   GET /api/properties/houses/:id
// @access  Private/Landlord or Manager
const getHouse = async (req, res, next) => {
    try {
        console.log({ id: req.params.id });
        const house = await property_model_1.House.findById(req.params.id)
            .populate([
            {
                path: 'flats',
                populate: {
                    path: 'tenantId',
                    select: 'name email phone'
                }
            },
            { path: 'managerId', select: 'name email specializations' }
        ]);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is house owner or manager
        if (house.landlordId.toString() !== req.user.id &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this house`, 401));
        }
        res.status(200).json({
            success: true,
            data: house,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getHouse = getHouse;
// @desc    Update house
// @route   PUT /api/properties/houses/:id
// @access  Private/Landlord
const updateHouse = async (req, res, next) => {
    var _a;
    try {
        let house = await property_model_1.House.findById(req.params.id);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to update this house`, 401));
        }
        // Handle new image uploads if present
        if (req.files) {
            const files = req.files;
            const images = files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
            // Delete old images from Cloudinary if they exist
            if (house.images && house.images.length > 0) {
                for (const image of house.images) {
                    await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
                }
            }
            req.body.images = images;
        }
        // Handle manager assignment changes
        if (req.body.managerId && req.body.managerId !== ((_a = house.managerId) === null || _a === void 0 ? void 0 : _a.toString())) {
            // Remove house from old manager's properties if exists
            if (house.managerId) {
                await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $pull: { 'properties.houses': house._id } });
            }
            // Add house to new manager's properties
            const newManager = await manager_model_1.default.findOne({ userId: req.body.managerId });
            if (!newManager) {
                return next(new errorResponse_1.ErrorResponse(`Manager not found`, 404));
            }
            if (!newManager.canManageMore()) {
                return next(new errorResponse_1.ErrorResponse(`Manager has reached maximum property limit`, 400));
            }
            newManager.properties.houses.push(house._id);
            await newManager.save();
        }
        house = await property_model_1.House.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({
            success: true,
            data: house,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateHouse = updateHouse;
// @desc    Delete house
// @route   DELETE /api/properties/houses/:id
// @access  Private/Landlord
const deleteHouse = async (req, res, next) => {
    try {
        const house = await property_model_1.House.findById(req.params.id);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this house`, 401));
        }
        // Delete images from Cloudinary
        if (house.images && house.images.length > 0) {
            for (const image of house.images) {
                await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
            }
        }
        // Remove house from manager's properties if assigned
        if (house.managerId) {
            await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $pull: { 'properties.houses': house._id } });
        }
        await house.deleteOne();
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteHouse = deleteHouse;
// @desc    Create a new flat
// @route   POST /api/properties/houses/:houseId/flats
// @access  Private/Landlord
const createFlat = async (req, res, next) => {
    try {
        const { houseId } = req.params;
        let images = [];
        if (req.file) {
            const file = req.file;
            images = [{
                    url: file.path,
                    publicId: file.filename
                }];
        }
        const payload = { ...req.body, images };
        if (!mongoose_1.default.Types.ObjectId.isValid(houseId)) {
            return next(new errorResponse_1.ErrorResponse('Invalid houseId format', 400));
        }
        req.body.houseId = req.params.houseId;
        const house = await property_model_1.House.findById(req.params.houseId);
        // Assign tenant if provided
        if (req.body.tenantId) {
            const tenant = await tenant_model_1.default.findById(req.body.tenantId);
            if (!tenant) {
                return next(new errorResponse_1.ErrorResponse(`Tenant not found`, 404));
            }
            req.body.tenantId = tenant._id;
        }
        const flat = await property_model_1.Flat.create(req.body);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
        }
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to add flats to this house`, 401));
        }
        // If house has a manager, assign that manager to the flat by default
        if (house.managerId) {
            req.body.managerId = house.managerId;
            // Add flat to manager's properties
            await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $push: { 'properties.flats': flat._id } });
        }
        res.status(201).json({
            success: true,
            data: flat,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createFlat = createFlat;
// @desc    Get all flats for a house with details
// @route   GET /api/properties/houses/:houseId/flats
// @access  Private/Landlord or Manager
const getFlats = async (req, res, next) => {
    try {
        const house = await property_model_1.House.findById(req.params.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
        }
        // Make sure user is house owner or manager
        if (house.landlordId.toString() !== req.user.id &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access flats for this house`, 401));
        }
        const query = property_model_1.Flat.find({ houseId: req.params.houseId });
        // Add filters
        if (req.query.status) {
            query.find({ status: req.query.status });
        }
        if (req.query.furnished) {
            query.find({ furnished: req.query.furnished === 'true' });
        }
        // Add population
        query.populate([
            { path: 'tenantId', select: 'name email phone' },
            { path: 'managerId', select: 'name email' }
        ]);
        const flats = await query;
        res.status(200).json({
            success: true,
            count: flats.length,
            data: flats,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFlats = getFlats;
// @desc    Get single flat with details
// @route   GET /api/properties/flats/:id
// @access  Private/Landlord or Manager
const getFlat = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id)
            .populate([
            { path: 'houseId', select: 'name address landlordId managerId' },
            { path: 'tenantId', select: 'name email phone emergencyContact' },
            { path: 'managerId', select: 'name email specializations' }
        ]);
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner or manager
        if (house.landlordId.toString() !== req.user.id &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this flat`, 401));
        }
        res.status(200).json({
            success: true,
            data: flat,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFlat = getFlat;
// @desc    Update flat
// @route   PUT /api/properties/flats/:id
// @access  Private/Landlord
const updateFlat = async (req, res, next) => {
    var _a;
    try {
        let flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to update this flat`, 401));
        }
        // Handle new image uploads if present
        if (req.files) {
            const files = req.files;
            const newImages = files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
            // Delete old images from Cloudinary if they exist
            if (flat.images && flat.images.length > 0) {
                for (const image of flat.images) {
                    await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
                }
            }
            req.body.images = newImages;
        }
        // Handle manager assignment changes
        if (req.body.managerId && req.body.managerId !== ((_a = flat.managerId) === null || _a === void 0 ? void 0 : _a.toString())) {
            // Remove flat from old manager's properties if exists
            if (flat.managerId) {
                await manager_model_1.default.findOneAndUpdate({ userId: flat.managerId }, { $pull: { 'properties.flats': flat._id } });
            }
            // Add flat to new manager's properties
            const newManager = await manager_model_1.default.findOne({ userId: req.body.managerId });
            if (!newManager) {
                return next(new errorResponse_1.ErrorResponse(`Manager not found`, 404));
            }
            if (!newManager.canManageMore()) {
                return next(new errorResponse_1.ErrorResponse(`Manager has reached maximum property limit`, 400));
            }
            newManager.properties.flats.push(flat._id);
            await newManager.save();
        }
        // Add maintenance history if provided
        if (req.body.maintenance) {
            const maintenance = {
                date: new Date(),
                description: req.body.maintenance.description,
                cost: req.body.maintenance.cost
            };
            if (!flat.maintenanceHistory) {
                flat.maintenanceHistory = [];
            }
            flat.maintenanceHistory.push(maintenance);
        }
        flat = await property_model_1.Flat.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({
            success: true,
            data: flat,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateFlat = updateFlat;
// @desc    Delete flat
// @route   DELETE /api/properties/flats/:id
// @access  Private/Landlord
const deleteFlat = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this flat`, 401));
        }
        // Delete images from Cloudinary if they exist
        if (flat.images && flat.images.length > 0) {
            for (const image of flat.images) {
                await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
            }
        }
        // Remove flat from manager's properties if assigned
        if (flat.managerId) {
            await manager_model_1.default.findOneAndUpdate({ userId: flat.managerId }, { $pull: { 'properties.flats': flat._id } });
        }
        await flat.deleteOne();
        res.status(200).json({
            success: true,
            data: {},
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteFlat = deleteFlat;
// @desc    Add maintenance record to flat
// @route   POST /api/properties/flats/:id/maintenance
// @access  Private/Landlord or Manager
const addMaintenanceRecord = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner or manager
        if (house.landlordId.toString() !== req.user.id &&
            (!flat.managerId || flat.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to add maintenance record`, 401));
        }
        const maintenance = {
            date: new Date(),
            description: req.body.description,
            cost: req.body.cost
        };
        flat.maintenanceHistory.push(maintenance);
        await flat.save();
        res.status(200).json({
            success: true,
            data: flat,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addMaintenanceRecord = addMaintenanceRecord;
// @desc    Get maintenance history for flat
// @route   GET /api/properties/flats/:id/maintenance
// @access  Private/Landlord or Manager
const getMaintenanceHistory = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner or manager
        if (house.landlordId.toString() !== req.user.id &&
            (!flat.managerId || flat.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to view maintenance history`, 401));
        }
        res.status(200).json({
            success: true,
            count: flat.maintenanceHistory.length,
            data: flat.maintenanceHistory,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMaintenanceHistory = getMaintenanceHistory;
