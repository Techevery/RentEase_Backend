"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTenantToFlat = exports.deactivateTenant = exports.deleteTenant = exports.updateTenant = exports.getTenant = exports.getTenants = exports.createTenant = void 0;
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const property_model_1 = require("../models/property.model");
const errorResponse_1 = require("../utils/errorResponse");
// Create a new tenant
//  POST /api/tenants
const createTenant = async (req, res, next) => {
    try {
        req.body.landlordId = req.user.id;
        if (req.body.flatId) {
            const flat = await property_model_1.Flat.findById(req.body.flatId).populate('houseId');
            if (!flat) {
                return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.body.flatId}`, 404));
            }
            const house = flat.houseId;
            // Make sure user is house owner
            if (house.landlordId.toString() !== req.user.id) {
                return next(new errorResponse_1.ErrorResponse(`User not authorized to add tenants to this flat`, 401));
            }
            // Check if flat already has a tenant
            if (flat.tenantId) {
                return next(new errorResponse_1.ErrorResponse(`Flat already has a tenant assigned`, 400));
            }
        }
        const tenant = await tenant_model_1.default.create(req.body);
        console.log(tenant);
        // If flat is provided, update the flat with the tenant ID
        if (req.body.flatId) {
            await property_model_1.Flat.findByIdAndUpdate(req.body.flatId, { tenantId: tenant._id }, { new: true });
        }
        res.status(201).json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createTenant = createTenant;
// Get all tenants for landlord
// GET /api/tenants
const getTenants = async (req, res, next) => {
    try {
        let query;
        // Find tenants for landlord
        if (req.user.role === 'landlord') {
            query = tenant_model_1.default.find({ landlordId: req.user.id });
        }
        else if (req.user.role === 'manager') {
            // Find flats managed by this manager
            const flats = await property_model_1.Flat.find({ managerId: req.user.id });
            const flatIds = flats.map(flat => flat._id);
            // Find tenants in those flats
            query = tenant_model_1.default.find({ flatId: { $in: flatIds } });
        }
        else {
            return next(new errorResponse_1.ErrorResponse('Not authorized to access tenants', 403));
        }
        query = query.populate([
            { path: 'unit', select: 'name number ' },
            { path: 'property', select: 'name ' }
        ]);
        const tenants = await query;
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
exports.getTenants = getTenants;
// Get single tenant
// GET /api/tenants/:id
const getTenant = async (req, res, next) => {
    var _a;
    try {
        const tenant = await tenant_model_1.default.findById(req.params.id);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // For landlord, check if they own the tenant
        if (req.user.role === 'landlord' && tenant.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`Not authorized to access this tenant`, 401));
        }
        // For manager, check if they manage the flat where tenant lives
        if (req.user.role === 'manager' && tenant.flatId) {
            const flat = await property_model_1.Flat.findById(tenant.flatId);
            if (!flat || ((_a = flat.managerId) === null || _a === void 0 ? void 0 : _a.toString()) !== req.user.id) {
                return next(new errorResponse_1.ErrorResponse(`Not authorized to access this tenant`, 401));
            }
        }
        res.status(200).json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTenant = getTenant;
// Update tenant
// PUT /api/tenants/:id
const updateTenant = async (req, res, next) => {
    var _a;
    try {
        let tenant = await tenant_model_1.default.findById(req.params.id);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is tenant owner
        if (tenant.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to update this tenant`, 401));
        }
        // Handle flat assignment if it's being changed
        if (req.body.flatId && ((_a = tenant.flatId) === null || _a === void 0 ? void 0 : _a.toString()) !== req.body.flatId) {
            // Check if new flat exists and belongs to landlord
            const newFlat = await property_model_1.Flat.findById(req.body.flatId).populate('houseId');
            if (!newFlat) {
                return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.body.flatId}`, 404));
            }
            const house = newFlat.houseId;
            if (house.landlordId.toString() !== req.user.id) {
                return next(new errorResponse_1.ErrorResponse(`User not authorized to assign tenants to this flat`, 401));
            }
            // Check if new flat already has a tenant
            if (newFlat.tenantId && tenant._id && newFlat.tenantId.toString() !== tenant._id.toString()) {
                return next(new errorResponse_1.ErrorResponse(`Flat already has a tenant assigned`, 400));
            }
            // If tenant was previously assigned to a flat, update that flat
            if (tenant.flatId) {
                await property_model_1.Flat.findByIdAndUpdate(tenant.flatId, { tenantId: null }, { new: true });
            }
            // Update new flat with tenant ID
            await property_model_1.Flat.findByIdAndUpdate(req.body.flatId, { tenantId: tenant._id }, { new: true });
        }
        tenant = await tenant_model_1.default.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        res.status(200).json({
            success: true,
            data: tenant,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateTenant = updateTenant;
// Delete tenant
// DELETE /api/tenants/:id
const deleteTenant = async (req, res, next) => {
    try {
        const tenant = await tenant_model_1.default.findById(req.params.id);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is tenant owner
        if (tenant.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to delete this tenant`, 401));
        }
        // If tenant is assigned to a flat, update the flat
        if (tenant.flatId) {
            await property_model_1.Flat.findByIdAndUpdate(tenant.flatId, { tenantId: null,
                status: 'active'
            }, { new: true });
        }
        const deactivateOnly = req.query.mode === 'deactivate';
        if (deactivateOnly) {
            // Soft delete - mark tenant as inactive
            tenant.status = 'inactive';
            tenant.flatId = undefined;
            await tenant.save();
            res.status(200).json({
                success: true,
                data: {
                    message: 'Tenant deactivated successfully',
                    tenant
                },
            });
        }
        else {
            await tenant.deleteOne();
            res.status(200).json({
                success: true,
                data: {
                    message: 'Tenant deleted successfully',
                    tenant: null
                },
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteTenant = deleteTenant;
//  Deactivate tenant 
// PUT /api/tenants/:id/deactivate
const deactivateTenant = async (req, res, next) => {
    try {
        const tenant = await tenant_model_1.default.findById(req.params.id);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is tenant owner
        if (tenant.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to deactivate this tenant`, 401));
        }
        // If tenant is assigned to a flat, update the flat
        if (tenant.flatId) {
            await property_model_1.Flat.findByIdAndUpdate(tenant.flatId, {
                tenantId: null,
                status: 'active'
            }, { new: true });
        }
        // Mark tenant as inactive
        tenant.status = 'inactive';
        tenant.flatId = undefined;
        await tenant.save();
        res.status(200).json({
            success: true,
            data: {
                message: 'Tenant deactivated successfully',
                tenant
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deactivateTenant = deactivateTenant;
// Assign tenant to flat
// PUT /api/tenants/:id/assign-flat/:flatId
const assignTenantToFlat = async (req, res, next) => {
    try {
        const tenant = await tenant_model_1.default.findById(req.params.id);
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // Make sure user is tenant owner
        if (tenant.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to assign flat to this tenant`, 401));
        }
        // Validate the flatId
        const flat = await property_model_1.Flat.findById(req.params.flatId).populate('houseId');
        if (!flat) {
            return next(new errorResponse_1.ErrorResponse(`Flat not found with id of ${req.params.flatId}`, 404));
        }
        const house = flat.houseId;
        // Make sure user is house owner
        if (house.landlordId.toString() !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse(`User not authorized to assign tenants to this flat`, 401));
        }
        // Check if flat already has a tenant
        if (flat.tenantId) {
            return next(new errorResponse_1.ErrorResponse(`Flat already has a tenant assigned`, 400));
        }
        // Update tenant and flat
        tenant.flatId = flat._id;
        tenant.status = 'active';
        flat.tenantId = tenant._id;
        flat.status = 'occupied';
        await tenant.save();
        await flat.save();
        res.status(200).json({
            success: true,
            data: tenant,
            flat
        });
    }
    catch (error) {
        next(error);
    }
};
exports.assignTenantToFlat = assignTenantToFlat;
