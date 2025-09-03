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
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    properties: {
        houses: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'House',
            }],
        flats: [{
                type: mongoose_1.default.Schema.Types.ObjectId,
                ref: 'Flat',
            }],
    },
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
// Virtual populate for managed properties
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
// Method to check if manager can take more properties
ManagerSchema.methods.canManageMore = function () {
    const totalProperties = this.properties.houses.length + this.properties.flats.length;
    return totalProperties < this.maxProperties;
};
exports.default = mongoose_1.default.models.Manager || mongoose_1.default.model('Manager', ManagerSchema);
