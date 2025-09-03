import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export enum UserRole {
  LANDLORD = 'landlord',
  MANAGER = 'manager',
}

export interface IUser extends Document {
  phonenumber: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  createdAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
  getResetPasswordToken(): string;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please add a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    phonenumber: {
      type: Number,
      unique: true,
      required: [true, 'Please add a phone number'],
      // match: [/^\+?[1-9]\d{1,14}$/, 'Please add a valid phone number'],
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.LANDLORD,

    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.virtual('managerProfile', {
  ref: 'Manager',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Encrypt password using bcrypt
UserSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password')) {
    next();
    return
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (
  enteredPassword: string
): Promise<boolean> {
  // Check if entered password exists
  if (!enteredPassword || enteredPassword.trim() === '') {
    return false; 
  }

  // Check if user has password
  if (!this.password) {
    return false; 
  }

  return await bcrypt.compare(enteredPassword, this.password);
};
// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function (): string {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return resetToken;
};

export default mongoose.model<IUser>('User', UserSchema);