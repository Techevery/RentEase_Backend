import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';
import { IFlat } from './property.model';

export interface ITenant extends Document {
  userId: IUser['_id'];
  flatId: IFlat['_id'];
  name: string;
  email: string;
  rentAmount: number;
  phone: string;
  unit: mongoose.Schema.Types.ObjectId;
  emergencyContact?: string;
  managerId?: mongoose.Schema.Types.ObjectId;
  landlordId: mongoose.Schema.Types.ObjectId;
  leaseStartDate: Date;
  leaseEndDate: Date;
  createdAt: Date;
  status: 'active' | 'inactive';
  property: mongoose.Schema.Types.ObjectId;
  cautionFee?: number;
  serviceCharge?: number;
  agencyFee?: number;
  legalFee?: number;
  totalRent?: number;
  // New personal information fields
  maritalStatus?: 'single' | 'married';
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: Date;
  nationality?: string;
  currentAddress?: string;
  yearsAtCurrentAddress?: number;
  monthsAtCurrentAddress?: number;
  reasonForLeaving?: string;
  occupation?: string;
  position?: string;
  spouseName?: string;
  emergencyContactName?: string;
  emergencyContactAddress?: string;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please add a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    emergencyContact: {
      type: String,
    },
    property: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House', 
      required: true 
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
    },
    unit: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Flat',
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaseStartDate: {
      type: Date,
      required: [true, 'Please add a lease start date'],
    },
    leaseEndDate: {
      type: Date,
      required: [true, 'Please add a lease end date'],
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive'], 
      default: 'active' 
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    rentAmount: {
      type: Number,
      required: [true, 'Please add a rental amount'],
      min: [0, 'Rental amount must be a positive number'],
    },
    cautionFee: {
      type: Number,
      min: [0, 'Caution fee must be a positive number'],
      default: 0,
    },
    serviceCharge: {
      type: Number,
      min: [0, 'Service charge must be a positive number'],
      default: 0,
    },
    agencyFee: {
      type: Number,
      min: [0, 'Agency fee must be a positive number'],
      default: 0,
    },
    legalFee: {
      type: Number,
      min: [0, 'Legal fee must be a positive number'],
      default: 0,
    },
    totalRent: {
      type: Number,
      min: [0, 'Total rent must be a positive number'],
      default: 0,
    },
    // New personal information fields
    maritalStatus: {
      type: String,
      enum: ['single', 'married'],
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    dateOfBirth: {
      type: Date,
    },
    nationality: {
      type: String,
    },
    currentAddress: {
      type: String,
    },
    yearsAtCurrentAddress: {
      type: Number,
      min: 0,
    },
    monthsAtCurrentAddress: {
      type: Number,
      min: 0,
      max: 11,
    },
    reasonForLeaving: {
      type: String,
    },
    occupation: {
      type: String,
    },
    position: {
      type: String,
    },
    spouseName: {
      type: String,
    },
    emergencyContactName: {
      type: String,
    },
    emergencyContactAddress: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for payments
TenantSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'tenantId',
  justOne: false,
});

TenantSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

TenantSchema.virtual('flat', {
  ref: 'Flat',
  localField: 'flatId',
  foreignField: '_id',
  justOne: true
});

TenantSchema.set('toJSON', { virtuals: true });
TenantSchema.set('toObject', { virtuals: true });

export default mongoose.model<ITenant>('Tenant', TenantSchema);