import mongoose, { Document, Schema } from 'mongoose';

export enum ExpenseStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum ExpenseCategory {
  MAINTENANCE = 'maintenance',
  UTILITIES = 'utilities',
  TAXES = 'taxes',
  INSURANCE = 'insurance',
  OTHER = 'other',
  REPAIRS = 'Repairs'

}

export interface IExpense extends Document {
  amount: number;
  expenseDate: Date;
  category: ExpenseCategory;
  description: string;
  vendor: string;
  documentUrl?: string;
  documentPublicId?: string;
  status: ExpenseStatus;
  houseId: mongoose.Schema.Types.ObjectId;
  flatId?: mongoose.Schema.Types.ObjectId;
  managerId: mongoose.Schema.Types.ObjectId;
  landlordId: mongoose.Schema.Types.ObjectId;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    amount: {
      type: Number,
      required: [true, 'Please add expense amount'],
    },
    expenseDate: {
      type: Date,
      required: [true, 'Please add expense date'],
    },
    category: {
      type: String,
      enum: Object.values(ExpenseCategory),
      required: [true, 'Please select expense category'],
    },
    description: {
      type: String,
      required: [true, 'Please add expense description'],
    },
    vendor: {
      type: String,
      required: [true, 'Please add expense description'],
    },
    

    documentUrl: {
      type: String,
    },
    documentPublicId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(ExpenseStatus),
      default: ExpenseStatus.PENDING,
    },
    houseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: true,
    },
    flatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flat',
    
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


ExpenseSchema.pre('save', async function(next) {
  try {
    const house = await mongoose.model('House').findById(this.houseId);
    if (!house) {
      throw new Error('Invalid house reference');
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

ExpenseSchema.index({ houseId: 1, status: 1, expenseDate: 1 });
ExpenseSchema.index({ category: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);