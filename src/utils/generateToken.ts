import jwt from 'jsonwebtoken';
import { IUser } from '../models/user.model';
import crypto from 'crypto';

export interface IPasswordResetToken {
  token: string;
  hashedToken: string;
  expires: Date;
}

export const generateToken = (user: IUser): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    {
      expiresIn: '1d',
    }
  );
};

export const generatePasswordResetToken = (): IPasswordResetToken => {
  const token = crypto.randomBytes(20).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return { token, hashedToken, expires };
};
