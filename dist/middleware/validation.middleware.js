"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateExpenseRejection = exports.validateCreateExpense = exports.validatePaymentRejection = exports.validateCreatePayment = exports.validateCreateTenant = exports.validateCreateFlat = exports.validateCreateHouse = exports.validateCreateManager = exports.validatePasswordReset = exports.validateRegistration = exports.validateLogin = void 0;
const express_validator_1 = require("express-validator");
const errorResponse_1 = require("../utils/errorResponse");
// Middleware to check validation results
const validateResults = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return next(new errorResponse_1.ErrorResponse(errors.array()[0].msg, 400));
    }
    next();
};
// Login validation
exports.validateLogin = [
    (0, express_validator_1.check)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please include a valid email'),
    (0, express_validator_1.check)('password')
        .notEmpty()
        .withMessage('Password is required'),
    validateResults,
    (0, express_validator_1.check)('role')
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['landlord', 'manager'])
        .withMessage('Invalid role specified'),
];
// Registration validation
exports.validateRegistration = [
    (0, express_validator_1.check)('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.check)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please include a valid email'),
    (0, express_validator_1.check)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    validateResults,
    (0, express_validator_1.check)('phonenumber')
        .notEmpty()
        .withMessage('Phone number is required')
        .matches(/^\+?[1-9]\d{1,14}$/)
        .withMessage('Please include a valid phone number'),
    validateResults,
];
// Password reset validation
exports.validatePasswordReset = [
    (0, express_validator_1.check)('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    validateResults,
];
// Create manager validation
exports.validateCreateManager = [
    (0, express_validator_1.check)('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.check)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please include a valid email'),
    (0, express_validator_1.check)('phone')
        .notEmpty()
        .withMessage('Phone number is required......'),
    validateResults,
];
// Create house validation
exports.validateCreateHouse = [
    (0, express_validator_1.check)('name')
        .notEmpty()
        .withMessage('House name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('House name must be between 2 and 100 characters'),
    (0, express_validator_1.check)('address')
        .notEmpty()
        .withMessage('Address is required')
        .isLength({ min: 5, max: 200 })
        .withMessage('Address must be between 5 and 200 characters'),
    validateResults,
];
// Create flat validation
exports.validateCreateFlat = [
    (0, express_validator_1.check)('number')
        .notEmpty()
        .withMessage('Flat number is required'),
    (0, express_validator_1.check)('rentAmount')
        .notEmpty()
        .withMessage('Rent amount is required')
        .isNumeric()
        .withMessage('Rent amount must be a number')
        .custom(value => value > 0)
        .withMessage('Rent amount must be greater than 0'),
    (0, express_validator_1.check)('rentDueDay')
        .notEmpty()
        .withMessage('Rent due day is required')
        .isInt({ min: 1,  })
        .withMessage('Rent due day must be between 1 and 31'),
    validateResults,
];
// Create tenant validation
exports.validateCreateTenant = [
    (0, express_validator_1.check)('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    (0, express_validator_1.check)('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please include a valid email'),
    (0, express_validator_1.check)('phone')
        .notEmpty()
        .withMessage('Phone number is required'),
    (0, express_validator_1.check)('leaseStartDate')
        .notEmpty()
        .withMessage('Lease start date is required')
        .isDate()
        .withMessage('Lease start date must be a valid date'),
    (0, express_validator_1.check)('leaseEndDate')
        .notEmpty()
        .withMessage('Lease end date is required')
        .isDate()
        .withMessage('Lease end date must be a valid date')
        .custom((endDate, { req }) => {
        const startDate = new Date(req.body.leaseStartDate);
        const end = new Date(endDate);
        return end > startDate;
    })
        .withMessage('Lease end date must be after lease start date'),
    validateResults,
];
// Create payment validation
exports.validateCreatePayment = [
    (0, express_validator_1.check)('tenantId')
        .notEmpty()
        .withMessage('Tenant ID is required'),
    (0, express_validator_1.check)('flatId')
        .notEmpty()
        .withMessage('Flat ID is required'),
    (0, express_validator_1.check)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom(value => value > 0)
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.check)('paymentDate')
        .notEmpty()
        .withMessage('Payment date is required')
        .isDate()
        .withMessage('Payment date must be a valid date'),
    (0, express_validator_1.check)('dueDate')
        .notEmpty()
        .withMessage('Due date is required')
        .isDate()
        .withMessage('Due date must be a valid date'),
    (0, express_validator_1.check)('paymentMethod')
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['cash', 'bank_transfer', 'cheque', 'online'])
        .withMessage('Invalid payment method'),
    (0, express_validator_1.check)('description')
        .notEmpty()
        .withMessage('Description is required'),
    validateResults,
];
// Payment rejection validation
exports.validatePaymentRejection = [
    (0, express_validator_1.check)('rejectionReason')
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ min: 5 })
        .withMessage('Rejection reason must be at least 5 characters'),
    validateResults,
];
// Create expense validation
exports.validateCreateExpense = [
    (0, express_validator_1.check)('houseId')
        .notEmpty()
        .withMessage('House ID is required'),
    (0, express_validator_1.check)('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isNumeric()
        .withMessage('Amount must be a number')
        .custom(value => value > 0)
        .withMessage('Amount must be greater than 0'),
    (0, express_validator_1.check)('expenseDate')
        .notEmpty()
        .withMessage('Expense date is required')
        .isDate()
        .withMessage('Expense date must be a valid date'),
    (0, express_validator_1.check)('category')
        .notEmpty()
        .withMessage('Category is required')
        .isIn(['maintenance', 'utilities', 'taxes', 'insurance', 'other'])
        .withMessage('Invalid expense category'),
    (0, express_validator_1.check)('description')
        .notEmpty()
        .withMessage('Description is required'),
    validateResults,
];
// Expense rejection validation
exports.validateExpenseRejection = [
    (0, express_validator_1.check)('rejectionReason')
        .notEmpty()
        .withMessage('Rejection reason is required')
        .isLength({ min: 5 })
        .withMessage('Rejection reason must be at least 5 characters'),
    validateResults,
];
