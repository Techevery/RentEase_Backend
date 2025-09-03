import { Request, Response, NextFunction } from 'express';
import { check, validationResult } from 'express-validator';
import { ErrorResponse } from '../utils/errorResponse';

// Middleware to check validation results
const validateResults = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ErrorResponse(errors.array()[0].msg, 400));
  }
  next();
};

// Login validation
export const validateLogin = [
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email'),
  check('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateResults,
  check('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['landlord', 'manager'])
    .withMessage('Invalid role specified'),
];

// Registration validation
export const validateRegistration = [
  check('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email'),
  check('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateResults,
  
  check('phonenumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please include a valid phone number'),
  validateResults,
];

// Password reset validation
export const validatePasswordReset = [
  check('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validateResults,
];

// Create manager validation
export const validateCreateManager = [
  check('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email'),
  check('phone')
    .notEmpty()
    .withMessage('Phone number is required......'),
  validateResults,
];

// Create house validation
export const validateCreateHouse = [
  check('name')
    .notEmpty()
    .withMessage('House name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('House name must be between 2 and 100 characters'),
  check('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
  validateResults,
];

// Create flat validation
export const validateCreateFlat = [
  check('number')
    .notEmpty()
    .withMessage('Flat number is required'),
  check('rentAmount')
    .notEmpty()
    .withMessage('Rent amount is required')
    .isNumeric()
    .withMessage('Rent amount must be a number')
    .custom(value => value > 0)
    .withMessage('Rent amount must be greater than 0'),
  check('rentDueDay')
    .notEmpty()
    .withMessage('Rent due day is required')
    .isInt({ min: 1, max: 1095  })
    .withMessage('Rent due day must be between 1 and 31'),
  validateResults,
];

// Create tenant validation
export const validateCreateTenant = [
  check('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  check('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please include a valid email'),
  check('phone')
    .notEmpty()
    .withMessage('Phone number is required'),
  check('leaseStartDate')
    .notEmpty()
    .withMessage('Lease start date is required')
    .isDate()
    .withMessage('Lease start date must be a valid date'),
  check('leaseEndDate')
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
export const validateCreatePayment = [
  check('tenantId')
    .notEmpty()
    .withMessage('Tenant ID is required'),
  check('flatId')
    .notEmpty()
    .withMessage('Flat ID is required'),
  check('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom(value => value > 0)
    .withMessage('Amount must be greater than 0'),
  check('paymentDate')
    .notEmpty()
    .withMessage('Payment date is required')
    .isDate()
    .withMessage('Payment date must be a valid date'),
  check('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isDate()
    .withMessage('Due date must be a valid date'),
  check('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['Bank Transfer', 'Credit Card', 'Cash'])
    .withMessage('Invalid payment method'),
  check('description')
    .notEmpty()
    .withMessage('Description is required'),
  validateResults,
];


// Create expense validation
export const validateCreateExpense = [
  check('houseId')
    .notEmpty()
    .withMessage('House ID is required'),
  check('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom(value => value > 0)
    .withMessage('Amount must be greater than 0'),
  check('expenseDate')
    .notEmpty()
    .withMessage('Expense date is required')
    .isDate()
    .withMessage('Expense date must be a valid date'),
  check('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['maintenance', 'utilities', 'taxes', 'insurance', 'other'])
    .withMessage('Invalid expense category'),
  check('description')
    .notEmpty()
    .withMessage('Description is required'),
  validateResults,
];

