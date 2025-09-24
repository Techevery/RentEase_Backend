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
exports.Flat = exports.House = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const HouseSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Please add a house name'],
        trim: true,
    },
    address: {
        type: String,
        required: [true, 'Please add an address'],
    },
    description: {
        type: String,
    },
    propertyType: {
        type: String,
        enum: ['residential', 'commercial'],
        default: 'residential',
    },
    amenities: [{
            type: String,
        }],
    totalFlats: {
        type: Number,
        required: [true, 'Please specify the total number of flats'],
        min: 1,
    },
    parkingSpaces: {
        type: Number,
        default: 0,
    },
    commonAreas: [{
            type: String,
        }],
    maintenanceContact: {
        type: String,
    },
    emergencyContact: {
        type: String,
    },
    landlordId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    managerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Manager',
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active',
    },
    images: [{
            url: {
                type: String,
                required: [true, 'Please add an image URL'],
            },
            publicId: {
                type: String,
                required: [true, 'Please add a public ID'],
            },
        }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
HouseSchema.pre('deleteOne', { document: true, query: false }, async function (next) {
    await mongoose_1.default.model('Flat').deleteMany({ houseId: this._id });
    next();
});
HouseSchema.pre('deleteMany', async function (next) {
    const houses = await mongoose_1.default.model('House').find(this.getFilter());
    for (const house of houses) {
        await mongoose_1.default.model('Flat').deleteMany({ houseId: house._id });
    }
    next();
});
HouseSchema.virtual('flats', {
    ref: 'Flat',
    localField: '_id',
    foreignField: 'houseId',
    justOne: false,
});
exports.House = mongoose_1.default.model('House', HouseSchema);
const FlatSchema = new mongoose_1.Schema({
    name: {
        type: String,
        trim: true,
    },
    number: {
        type: String,
        required: [true, 'Please add a flat number'],
        trim: true,
    },
    houseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
    },
    managerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Manager',
    },
    tenantId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Tenant',
    },
    images: [{
            url: {
                type: String,
                required: [true, 'Please add an image URL'],
            },
            publicId: {
                type: String,
                required: [true, 'Please add a public ID'],
            },
        }],
    floorNumber: {
        type: Number,
        required: [true, 'Please specify the floor number'],
    },
    size: {
        type: Number,
        required: [true, 'Please specify the size of the flat'],
    },
    bedrooms: {
        type: Number,
        required: [true, 'Please specify the number of bedrooms'],
        min: 0,
    },
    palour: {
        type: Boolean,
        default: false,
    },
    toilet: {
        type: Number,
        required: [true, 'Please specify the number of toilets'],
        min: 0,
    },
    kitchen: {
        type: Boolean,
        default: false,
    },
    bathrooms: {
        type: Number,
        required: [true, 'Please specify the number of bathrooms'],
        min: 0,
    },
    furnished: {
        type: Boolean,
        default: false,
    },
    rentAmount: {
        type: Number,
        required: [true, 'Please add rent amount'],
    },
    depositAmount: {
        type: Number,
        required: [true, 'Please add deposit amount'],
    },
    rentDueDay: {
        type: Number,
        min: 1,
    },
    // utilities: [{
    //   type: String,
    //   enum: ['water', 'electricity', 'gas', 'internet', 'heating', 'cooling'],
    // }],
    description: {
        type: String,
        // required: [true, 'Please add a description'],
    },
    status: {
        type: String,
        enum: ['vacant', 'occupied', 'maintenance'],
        default: 'vacant',
    },
    maintenanceHistory: [{
            date: {
                type: Date,
                required: true,
            },
            description: {
                type: String,
                required: true,
            },
            cost: {
                type: Number,
                required: true,
            },
        }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Update timestamps
FlatSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
// Virtual for payments
FlatSchema.virtual('payments', {
    ref: 'Payment',
    localField: '_id',
    foreignField: 'flatId',
    justOne: false,
});
// Virtual for current tenant details
FlatSchema.virtual('tenantDetails', {
    ref: 'Tenant',
    localField: 'tenantId',
    foreignField: '_id',
    justOne: true,
});
exports.Flat = mongoose_1.default.model('Flat', FlatSchema);
