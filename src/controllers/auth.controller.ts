import { Request, Response, NextFunction } from 'express';
import User, { UserRole, IUser } from '../models/user.model';
import { generateToken, generatePasswordResetToken } from '../utils/generateToken';
import { ErrorResponse } from '../utils/errorResponse';
import { sendPasswordResetEmail } from '../utils/emailService';
import crypto from 'crypto';
import { AuthRequest } from '../middleware/auth.middleware';

// Register a landlord
//  POST /api/auth/register
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, phonenumber } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already in use', 400));
    }
    const phoneNumber = parseInt(phonenumber);
if (isNaN(phoneNumber)) {
  return next(new ErrorResponse('Invalid phone number format', 400));
}

const existingPhoneUser = await User.findOne({ phonenumber: phoneNumber });
if (existingPhoneUser) {
  return next(new ErrorResponse('Phone number already in use', 400));
}
    const user = await User.create({
      name,
      email,
      password,
      phonenumber,
      role: UserRole.LANDLORD,
    });
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phonenumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login user
// POST /api/auth/login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
  const { email, password, role } = req.body;

if (!email || !password || !role) {
  return next(new ErrorResponse('Please provide email, password, and role', 400));
}
if (!password || password.trim() === '') {
  return next(new ErrorResponse('Please provide a password', 400));
}

const user = await User.findOne({ email, role }).select('+password');

if (!user) {
  return next(new ErrorResponse('Invalid credentials', 401));
}
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phonenumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get current logged in user
// GET /api/auth/me
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Forgot password
// POST /api/auth/forgotpassword
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse('There is no user with that email', 404));
    }
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(user.email, resetToken, user.name);
      res.status(200).json({
        success: true,
        message: 'Email sent',
      });
    } catch (err) {
      console.error('Email could not be sent', err);

      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse('Email could not be sent', 500));
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse('Invalid token', 400));
    }
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

//  Update password
//  PUT /api/auth/updatepassword
export const updatePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    if (!req.body.currentPassword?.trim()) {
  return next(new ErrorResponse('Current password is required', 400));
}
    const isMatch = await user.matchPassword(req.body.currentPassword);
    if (!isMatch) {
      return next(new ErrorResponse('Password is incorrect', 401));
    }

    user.password = req.body.newPassword;
    await user.save();
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile information
// PUT /api/auth/update-me
export const updateMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user.id);
    

    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }
    const allowedFields = ['name', 'email', 'phonenumber'];
    allowedFields.forEach((field) => {
      if (req.body[field]) {
        (user as any)[field] = req.body[field];
      }
    });
 
    await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phonenumber,
      },
    });
  } catch (error) {
    next(error);
  }
};
