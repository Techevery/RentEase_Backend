import mongoose, { Document, Schema } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  find = "find",
}

export enum PaymentMethod {
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  CREDIT_CARD = 'Credit Card',
  ONLINE = 'Online',
}

export interface IPayment extends Document {
  amount: number;
  paymentDate: Date;
  dueDate: Date;
  paymentMethod: PaymentMethod;
  description: string;
  paymentTypes: string[]; // New field for payment types
  receiptUrl?: string;
  receiptPublicId?: string;
  status: PaymentStatus;
  tenantId: mongoose.Schema.Types.ObjectId;
  flatId: mongoose.Schema.Types.ObjectId;
  houseId: mongoose.Schema.Types.ObjectId;
  managerId: mongoose.Schema.Types.ObjectId;
  landlordId: mongoose.Schema.Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  reference: string; 
}

const PaymentSchema = new Schema<IPayment>(
  {
    amount: {
      type: Number,
      required: [true, 'Please add payment amount'],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Please add payment date'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Please add due date'],
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: [true, 'Please select payment method'],
    },
    description: {
      type: String,
      required: [true, 'Please add payment description'],
    },
    paymentTypes: { // New field schema
      type: [String],
      default: ['Rent'],
      validate: {
        validator: function(types: string[]) {
          const validTypes = ['Rent', 'Service Charge', 'Caution', 'Agency', 'Legal'];
          return types.every(type => validTypes.includes(type));
        },
        message: 'Invalid payment type provided'
      }
    },
    receiptUrl: {
      type: String,
    },
    receiptPublicId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
      required: true,
    },
    houseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    reference: {  
      type: String,
      unique: true,
      default: function() {
        return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
    },
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

PaymentSchema.index({ houseId: 1, status: 1, paymentDate: 1 });
PaymentSchema.index({ description: 'text' });

export default mongoose.model<IPayment>('Payment', PaymentSchema);