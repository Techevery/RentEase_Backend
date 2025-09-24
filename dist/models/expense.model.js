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
exports.ExpenseCategory = exports.ExpenseStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var ExpenseStatus;
(function (ExpenseStatus) {
    ExpenseStatus["PENDING"] = "Pending";
    ExpenseStatus["APPROVED"] = "Approved";
    ExpenseStatus["REJECTED"] = "Rejected";
})(ExpenseStatus || (exports.ExpenseStatus = ExpenseStatus = {}));
var ExpenseCategory;
(function (ExpenseCategory) {
    ExpenseCategory["MAINTENANCE"] = "maintenance";
    ExpenseCategory["UTILITIES"] = "utilities";
    ExpenseCategory["TAXES"] = "taxes";
    ExpenseCategory["INSURANCE"] = "insurance";
    ExpenseCategory["OTHER"] = "other";
    ExpenseCategory["REPAIRS"] = "Repairs";
})(ExpenseCategory || (exports.ExpenseCategory = ExpenseCategory = {}));
const ExpenseSchema = new mongoose_1.Schema({
    amount: {
        type: Number,
        required: [true, 'Please add expense amount'],
    },
    expenseDate: {
        type: Date,
        required: [true, 'Please add expense date'],
    },
    category: {
        type: String,
        enum: Object.values(ExpenseCategory),
        required: [true, 'Please select expense category'],
    },
    description: {
        type: String,
        required: [true, 'Please add expense description'],
    },
    vendor: {
        type: String,
        required: [true, 'Please add expense description'],
    },
    documentUrl: {
        type: String,
    },
    documentPublicId: {
        type: String,
    },
    status: {
        type: String,
        enum: Object.values(ExpenseStatus),
        default: ExpenseStatus.PENDING,
    },
    houseId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'House',
        required: true,
    },
    flatId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Flat',
    },
    managerId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    landlordId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    approvedAt: {
        type: Date,
    },
    rejectedAt: {
        type: Date,
    },
    rejectionReason: {
        type: String,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
ExpenseSchema.pre('save', async function (next) {
    try {
        const house = await mongoose_1.default.model('House').findById(this.houseId);
        if (!house) {
            throw new Error('Invalid house reference');
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
ExpenseSchema.index({ houseId: 1, status: 1, expenseDate: 1 });
ExpenseSchema.index({ category: 1 });
exports.default = mongoose_1.default.model('Expense', ExpenseSchema);
