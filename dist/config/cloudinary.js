"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFromCloudinary = exports.unitUpload = exports.propertyUpload = exports.expenseUpload = exports.paymentUpload = exports.unitStorage = exports.propertyStorage = exports.expenseStorage = exports.paymentStorage = exports.initializeCloudinary = void 0;
const cloudinary_1 = require("cloudinary");
const multer_storage_cloudinary_1 = require("multer-storage-cloudinary");
const multer_1 = __importDefault(require("multer"));
const initializeCloudinary = () => {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
};
exports.initializeCloudinary = initializeCloudinary;
// Setup for payment proof uploads
exports.paymentStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'property-management/payments',
        allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
        resource_type: 'auto',
    },
});
// Setup for expense document uploads
exports.expenseStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'property-management/expenses',
        allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
        resource_type: 'auto',
    },
});
// Setup for property image uploads
exports.propertyStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'property-management/properties',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
        ],
    },
});
// Setup for unit image uploads
exports.unitStorage = new multer_storage_cloudinary_1.CloudinaryStorage({
    cloudinary: cloudinary_1.v2,
    params: {
        folder: 'property-management/units',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' },
        ],
    },
});
exports.paymentUpload = (0, multer_1.default)({ storage: exports.paymentStorage });
exports.expenseUpload = (0, multer_1.default)({ storage: exports.expenseStorage });
exports.propertyUpload = (0, multer_1.default)({ storage: exports.propertyStorage });
exports.unitUpload = (0, multer_1.default)({ storage: exports.unitStorage });
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
