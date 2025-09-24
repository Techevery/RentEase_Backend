import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/user.model';
import User from '../models/user.model';
import { ErrorResponse } from '../utils/errorResponse';

// Define a custom interface for the Request object to include the user
export interface AuthRequest extends Request {
  user?: any;
}

// Protect routes
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // Get user from the token
    const user = await User.findById(decoded.id);
   
    if (!user) {
      return next(new ErrorResponse('User not found', 404));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ErrorResponse('Not authorized to access this route', 401));
  }
};

// Grant access to specific roles
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ErrorResponse('User not found', 404));
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      next(
        new ErrorResponse(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
      return;
    }
    next();
  };
};