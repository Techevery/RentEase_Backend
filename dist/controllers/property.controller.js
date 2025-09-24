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
exports.getTenantsInHouse = exports.deleteFlat = exports.updateFlat = exports.getFlat = exports.getFlats = exports.createFlat = exports.deleteHouse = exports.updateHouse = exports.getHouse = exports.getHouses = exports.createHouse = void 0;
const property_model_1 = require("../models/property.model");
const manager_model_1 = __importDefault(require("../models/manager.model"));
const errorResponse_1 = require("../utils/errorResponse");
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const cloudinary_1 = require("../config/cloudinary");
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importStar(require("../models/user.model"));
// Create a new house
// POST /api/properties/houses
const createHouse = async (req, res, next) => {
    try {
        req.body.landlordId = req.user.id;
        req.body.status = 'active';
        if (typeof req.body.features === 'string') {
            req.body.features = JSON.parse(req.body.features);
        }
        if (typeof req.body.location === 'string') {
            req.body.location = JSON.parse(req.body.location);
        }
        let images = [];
        if (req.files) {
            const files = req.files;
            images = files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
        }
        if (typeof req.body.amenities === 'string') {
            req.body.amenities = req.body.amenities.split(',');
        }
        if (typeof req.body.commonAreas === 'string') {
            req.body.commonAreas = req.body.commonAreas.split(',');
        }
        req.body.totalFlats = Number(req.body.totalFlats);
        req.body.parkingSpaces = Number(req.body.parkingSpaces);
        req.body.emergencyContact = String(req.body.emergencyContact);
        req.body.maintenanceContact = String(req.body.maintenanceContact);
        if (req.body.managerId) {
            if (Array.isArray(req.body.managerId)) {
                req.body.managerId = req.body.managerId[0];
            }
            if (!mongoose_1.default.Types.ObjectId.isValid(req.body.managerId)) {
                return next(new errorResponse_1.ErrorResponse('Invalid managerId format', 400));
            }
        }
        const payload = { ...req.body, images };
        const house = await property_model_1.House.create(payload);
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
// GET /api/properties/houses
const getHouses = async (req, res, next) => {
    try {
        const query = property_model_1.House.find({ landlordId: req.user.id });
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
// GET /api/properties/houses/:id
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
// PUT /api/properties/houses/:id
const updateHouse = async (req, res, next) => {
    var _a, _b;
    try {
        let house = await property_model_1.House.findById(req.params.id);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.id}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to update this house`, 401));
        }
        if (typeof req.body.features === 'string') {
            req.body.features = JSON.parse(req.body.features);
        }
        if (typeof req.body.location === 'string') {
            req.body.location = JSON.parse(req.body.location);
        }
        if (req.files) {
            const files = req.files;
            const images = files.map(file => ({
                url: file.path,
                publicId: file.filename,
                isPrimary: false
            }));
            if (house.images && house.images.length > 0) {
                for (const image of house.images) {
                    await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
                }
            }
            req.body.images = images;
        }
        if (req.body.existingImages) {
            const existingImages = Array.isArray(req.body.existingImages)
                ? req.body.existingImages.map((img) => JSON.parse(img))
                : [JSON.parse(req.body.existingImages)];
            req.body.images = [...existingImages];
        }
        if (req.body.totalFlats !== undefined) {
            req.body.totalFlats = Number(req.body.totalFlats);
        }
        if (req.body.parkingSpaces !== undefined) {
            req.body.parkingSpaces = Number(req.body.parkingSpaces);
        }
        req.body.emergencyContact = String(req.body.emergencyContact);
        req.body.maintenanceContact = String(req.body.maintenanceContact);
        // Accept the existing value of totalFlats if not provided in the request
        if (req.body.totalFlats === undefined || req.body.totalFlats === null) {
            req.body.totalFlats = house.totalFlats;
        }
        // if (isNaN(Number(req.body.totalFlats))) {
        //   return next(new ErrorResponse('totalFlats must be a numeric value', 400));
        // }
        // if (Number(req.body.totalFlats) < 1) {
        //   return next(new ErrorResponse('totalFlats must be at least 1', 400));
        // }
        // req.body.totalFlats = Number(req.body.totalFlats);
        if (typeof req.body.amenities === 'string') {
            req.body.amenities = req.body.amenities.split(',');
        }
        if (typeof req.body.commonAreas === 'string') {
            req.body.commonAreas = req.body.commonAreas.split(',');
        }
        if (req.body.managerId && req.body.managerId !== ((_a = house.managerId) === null || _a === void 0 ? void 0 : _a.toString())) {
            if (req.body.managerId && req.body.managerId !== ((_b = house.managerId) === null || _b === void 0 ? void 0 : _b.toString())) {
                const flats = await property_model_1.Flat.find({ houseId: house._id });
                await property_model_1.Flat.updateMany({ houseId: house._id }, { managerId: req.body.managerId });
                if (house.managerId) {
                    await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $pull: { 'properties.flats': { $in: flats.map(f => f._id) } } });
                }
                if (req.body.managerId && req.body.managerId !== 'null') {
                    const newManager = await manager_model_1.default.findOne({ userId: req.body.managerId });
                    if (newManager) {
                        const canHandle = newManager.canHandleAdditional(flats.length);
                        if (!canHandle) {
                            return next(new errorResponse_1.ErrorResponse(`Manager cannot handle this many properties`, 400));
                        }
                        await manager_model_1.default.findOneAndUpdate({ userId: req.body.managerId }, {
                            $addToSet: {
                                'properties.flats': { $each: flats.map(f => f._id) },
                                'properties.houses': house._id
                            }
                        });
                    }
                }
            }
            if (house.managerId) {
                await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $pull: { 'properties.houses': house._id } });
            }
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
        }).populate('managerId', 'name email');
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
//  DELETE /api/properties/houses/:id
const deleteHouse = async (req, res, next) => {
    try {
        const house = await property_model_1.House.findById(req.params.id);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.id}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this house`, 401));
        }
        if (house.images && house.images.length > 0) {
            for (const image of house.images) {
                await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
            }
        }
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
// Create a new flat
//  POST /api/properties/houses/:houseId/flats
const createFlat = async (req, res, next) => {
    try {
        const { houseId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(houseId)) {
            return next(new errorResponse_1.ErrorResponse('Invalid houseId format', 400));
        }
        const house = await property_model_1.House.findById(houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${houseId}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to add flats to this house`, 401));
        }
        const images = req.files
            ? req.files.map(file => ({
                url: file.path,
                publicId: file.filename
            }))
            : [];
        let tenantId = req.body.tenantId;
        if (req.body.tenantDetails && !tenantId) {
            const newTenant = await tenant_model_1.default.create({
                ...req.body.tenantDetails,
                landlordId: req.user.id,
                status: 'active'
            });
            tenantId = newTenant._id;
        }
        const flatData = {
            ...req.body,
            houseId,
            images,
            status: tenantId ? 'occupied' : 'vacant',
            managerId: house.managerId
        };
        const flat = await property_model_1.Flat.create(flatData);
        if (tenantId) {
            const tenant = await tenant_model_1.default.findById(tenantId);
            if (tenant) {
                tenant.flatId = flat._id;
                tenant.status = 'active';
                await tenant.save();
            }
        }
        if (house.managerId) {
            await manager_model_1.default.findOneAndUpdate({ userId: house.managerId }, { $push: { 'properties.flats': flat._id } });
        }
        const populatedFlat = await property_model_1.Flat.findById(flat._id)
            .populate('managerId', 'name email specializations')
            .populate('tenantId', 'name email phone');
        res.status(201).json({
            success: true,
            data: flat
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createFlat = createFlat;
// Get all flats for a house with details
// GET /api/properties/houses/:houseId/flats
const getFlats = async (req, res, next) => {
    try {
        const house = await property_model_1.House.findById(req.params.houseId)
            .populate('managerId', 'name email phone');
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
        }
        const query = property_model_1.Flat.find({ houseId: req.params.houseId });
        if (req.query.status) {
            query.find({ status: req.query.status });
        }
        if (req.query.furnished) {
            query.find({ furnished: req.query.furnished === 'true' });
        }
        query.populate([
            {
                path: 'tenantId',
                select: 'name email phone emergencyContact leaseStartDate leaseEndDate'
            },
            {
                path: 'managerId',
                select: 'name email phone specializations',
                populate: {
                    path: 'userId',
                    select: 'name email phone'
                }
            },
            {
                path: 'houseId',
                select: 'name address managerId',
                populate: {
                    path: 'managerId',
                    select: 'name email phone'
                }
            }
        ]);
        let flats = await query;
        flats = await Promise.all(flats.map(async (flat) => {
            if (!flat.managerId && house.managerId) {
                flat.managerId = house.managerId;
                await flat.save();
                const manager = await manager_model_1.default.findOne({ userId: house.managerId });
                if (manager && !manager.properties.flats.includes(flat._id)) {
                    manager.properties.flats.push(flat._id);
                    await manager.save();
                }
                await flat.populate([
                    {
                        path: 'managerId',
                        select: 'name email phone specializations',
                        populate: {
                            path: 'userId',
                            select: 'name email phone'
                        }
                    }
                ]);
            }
            return flat;
        }));
        const formattedFlats = flats.map(flat => {
            const manager = flat.managerId || flat.houseId.managerId;
            return {
                ...flat.toObject(),
                manager: manager ? {
                    _id: manager._id,
                    name: manager.name,
                    email: manager.email,
                    phone: manager.phone,
                    specializations: manager.specializations,
                    isInherited: !flat.managerId && !!house.managerId
                } : null
            };
        });
        res.status(200).json({
            success: true,
            count: formattedFlats.length,
            data: formattedFlats,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFlats = getFlats;
// Get single flat with details
// GET /api/properties/flats/:id
const getFlat = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id)
            .populate([
            {
                path: 'houseId',
                select: 'name address landlordId managerId',
                populate: {
                    path: 'managerId',
                    select: 'name email'
                }
            },
            {
                path: 'tenantId',
                select: 'name email phone emergencyContact'
            },
            {
                path: 'managerId',
                select: 'name email phone specializations',
                populate: {
                    path: 'userId',
                    select: 'name email phone'
                }
            }
        ]);
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        if (house.landlordId.toString() !== req.user.id &&
            (!flat.managerId || flat.managerId.toString() !== req.user.id) &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access this flat`, 401));
        }
        if (!flat.managerId && house.managerId) {
            flat.managerId = house.managerId;
            await flat.save();
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
//  Update flat
// PUT /api/properties/flats/:id
const updateFlat = async (req, res, next) => {
    var _a, _b, _c;
    try {
        const flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to update this flat`, 401));
        }
        if (house.managerId && !req.body.managerId) {
            req.body.managerId = house.managerId;
        }
        const currentTenantId = (_a = flat.tenantId) === null || _a === void 0 ? void 0 : _a.toString();
        const newTenantId = req.body.tenantId;
        delete req.body.status;
        if (newTenantId && newTenantId !== currentTenantId) {
            const tenant = await tenant_model_1.default.findById(newTenantId);
            if (!tenant) {
                return next(new errorResponse_1.ErrorResponse(`Tenant not found`, 404));
            }
            const tenantFlat = await property_model_1.Flat.findOne({
                _id: tenant.flatId,
                houseId: house._id
            });
            if (!tenantFlat && tenant.flatId) {
                return next(new errorResponse_1.ErrorResponse(`Tenant belongs to another property`, 400));
            }
            tenant.flatId = flat._id;
            tenant.status = 'active';
            await tenant.save();
            req.body.status = 'occupied';
        }
        else if (!newTenantId && currentTenantId) {
            const tenant = await tenant_model_1.default.findById(currentTenantId);
            if (tenant) {
                tenant.flatId = null;
                tenant.status = 'inactive';
                await tenant.save();
            }
            req.body.status = 'vacant';
        }
        if (req.files) {
            const newImages = req.files.map(file => ({
                url: file.path,
                publicId: file.filename
            }));
            if ((_b = flat.images) === null || _b === void 0 ? void 0 : _b.length) {
                await Promise.all(flat.images.map(img => (0, cloudinary_1.deleteFromCloudinary)(img.publicId)));
            }
            req.body.images = newImages;
        }
        const updatedFlat = await property_model_1.Flat.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate([
            'managerId',
            'tenantId',
            {
                path: 'houseId',
                populate: {
                    path: 'managerId'
                }
            }
        ]);
        if (updatedFlat && req.body.managerId && req.body.managerId !== ((_c = flat.managerId) === null || _c === void 0 ? void 0 : _c.toString())) {
            if (flat.managerId) {
                await manager_model_1.default.findOneAndUpdate({ userId: flat.managerId }, { $pull: { 'properties.flats': flat._id } });
            }
            const newManager = await manager_model_1.default.findOne({ userId: req.body.managerId });
            if (newManager) {
                await manager_model_1.default.findOneAndUpdate({ userId: req.body.managerId }, { $addToSet: { 'properties.flats': updatedFlat._id } });
            }
        }
        res.status(200).json({
            success: true,
            data: updatedFlat
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateFlat = updateFlat;
// Delete flat
// DELETE /api/properties/flats/:id
const deleteFlat = async (req, res, next) => {
    try {
        const flat = await property_model_1.Flat.findById(req.params.id).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
        }
        const house = flat.houseId;
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this flat`, 401));
        }
        if (flat.images && flat.images.length > 0) {
            for (const image of flat.images) {
                await (0, cloudinary_1.deleteFromCloudinary)(image.publicId);
            }
        }
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
// Get all tenants in a house
// GET /api/properties/houses/:houseId/tenants
const getTenantsInHouse = async (req, res, next) => {
    try {
        const house = await property_model_1.House.findById(req.params.houseId);
        if (!house) {
            return next(new errorResponse_1.ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
        }
        if (house.landlordId.toString() !== req.user.id &&
            (!house.managerId || house.managerId.toString() !== req.user.id)) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to access tenants in this house`, 401));
        }
        const flatsWithTenants = await property_model_1.Flat.find({
            houseId: house._id,
            tenantId: { $ne: null }
        }).populate('tenantId', 'name email phone emergencyContact leaseStartDate leaseEndDate');
        const tenants = flatsWithTenants.map(flat => ({
            tenant: flat.tenantId,
            flatId: flat._id,
            flatNumber: flat.number,
            floorNumber: flat.floorNumber
        }));
        res.status(200).json({
            success: true,
            count: tenants.length,
            data: tenants,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTenantsInHouse = getTenantsInHouse;
