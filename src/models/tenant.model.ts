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
  // flatId?: mongoose.Schema.Types.ObjectId;
  managerId?: mongoose.Schema.Types.ObjectId;
  landlordId: mongoose.Schema.Types.ObjectId;
  leaseStartDate: Date;
  leaseEndDate: Date;
  createdAt: Date;
  status: 'active' | 'inactive';
  property: mongoose.Schema.Types.ObjectId;
  
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
   property: { type: mongoose.Schema.Types.ObjectId,
     ref: 'House', 
     required: true },

     managerId: {
           type: mongoose.Schema.Types.ObjectId,
           ref: 'Manager',
         },

   unit: { type: mongoose.Schema.Types.ObjectId, 
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

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    leaseEndDate: {
      type: Date,
      required: [true, 'Please add a lease end date'],
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