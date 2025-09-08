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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ManagerSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    landlordId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    properties: {
        houses: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'House',
            }],
        flats: [{
                type: mongoose_1.Schema.Types.ObjectId,
                ref: 'Flat',
            }],
    },
    managedTenants: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Tenant',
        }],
    specializations: [{
            type: String,
            enum: ['residential', 'commercial', 'luxury', 'student-housing'],
        }],
    yearsOfExperience: {
        type: Number,
        min: 0,
    },
    maxProperties: {
        type: Number,
        default: 10,
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
    },
    assignedDate: {
        type: Date,
        default: Date.now,
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Enhanced virtual populate
ManagerSchema.virtual('managedHouses', {
    ref: 'House',
    localField: 'properties.houses',
    foreignField: '_id',
});
ManagerSchema.virtual('managedFlats', {
    ref: 'Flat',
    localField: 'properties.flats',
    foreignField: '_id',
});
// New virtual for tenants
ManagerSchema.virtual('tenants', {
    ref: 'Tenant',
    localField: 'managedTenants',
    foreignField: '_id',
});
// Method to get all managed tenants
ManagerSchema.methods.getManagedTenants = async function () {
    await this.populate([
        { path: 'properties.houses' },
        { path: 'properties.flats' },
        { path: 'managedTenants' }
    ]);
    return this.managedTenants;
};
// Method to check if manager can take more properties
ManagerSchema.methods.canManageMore = function () {
    const totalProperties = this.properties.houses.length + this.properties.flats.length;
    return totalProperties < this.maxProperties;
};
// Update tenants when properties change
ManagerSchema.pre('save', async function (next) {
    if (this.isModified('properties')) {
        const Flat = mongoose_1.default.model('Flat');
        const Tenant = mongoose_1.default.model('Tenant');
        // Get all flats under this manager
        const allFlats = [
            ...this.properties.flats,
            ...(await Flat.find({ houseId: { $in: this.properties.houses } }).distinct('_id'))
        ];
        // Get all tenants in these flats
        this.managedTenants = await Tenant.find({ flatId: { $in: allFlats } }).distinct('_id');
    }
    next();
});
exports.default = mongoose_1.default.models.Manager || mongoose_1.default.model('Manager', ManagerSchema);
