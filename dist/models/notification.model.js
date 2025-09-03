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
exports.NotificationType = void 0;
const mongoose_1 = __importStar(require("mongoose"));
var NotificationType;
(function (NotificationType) {
    NotificationType["PAYMENT_DUE"] = "payment_due";
    NotificationType["PAYMENT_OVERDUE"] = "payment_overdue";
    NotificationType["PAYMENT_RECEIVED"] = "payment_received";
    NotificationType["PAYMENT_APPROVED"] = "payment_approved";
    NotificationType["PAYMENT_REJECTED"] = "payment_rejected";
    NotificationType["EXPENSE_SUBMITTED"] = "expense_submitted";
    NotificationType["EXPENSE_APPROVED"] = "expense_approved";
    NotificationType["EXPENSE_REJECTED"] = "expense_rejected";
    NotificationType["TENANT_ADDED"] = "tenant_added";
    NotificationType["MANAGER_ADDED"] = "manager_added";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
const NotificationSchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: Object.values(NotificationType),
        required: true,
    },
    title: {
        type: String,
        required: [true, 'Please add notification title'],
    },
    message: {
        type: String,
        required: [true, 'Please add notification message'],
    },
    recipientId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        required: true,
    },
    recipientRole: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    referenceId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
    },
    referenceModel: {
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
exports.default = mongoose_1.default.model('Notification', NotificationSchema);
