import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './user.model';

export interface IManager extends Document {
  userId: IUser['_id'];
  landlordId: IUser['_id'];
  properties: {
    houses: mongoose.Schema.Types.ObjectId[];
    flats: mongoose.Schema.Types.ObjectId[];
  };
  managedTenants?: mongoose.Schema.Types.ObjectId[]; // New field
  specializations?: string[];
  yearsOfExperience?: number;
  maxProperties?: number;
  status: 'active' | 'inactive';
  assignedDate: Date;
  lastActive: Date;
  createdAt: Date;
}

const ManagerSchema = new Schema<IManager>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
     landlordId: { 
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    properties: {
      houses: [{
        type: Schema.Types.ObjectId,
        ref: 'House',
      }],
      flats: [{
        type: Schema.Types.ObjectId,
        ref: 'Flat',
      }],
    },
    managedTenants: [{  // New field to track tenants
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
    }],
    specializations: [{
      type: String,
      enum: ['residential', 'commercial', 'luxury', 'student-housing'],
    }],
    yearsOfExperience: {
      type: Number,
      min: 0,
    },
    maxProperties: {
      type: Number,
      default: 10,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    lastActive: {
      type: Date,
      default: Date.now,
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

// Enhanced virtual populate
ManagerSchema.virtual('managedHouses', {
  ref: 'House',
  localField: 'properties.houses',
  foreignField: '_id',
});

ManagerSchema.virtual('managedFlats', {
  ref: 'Flat',
  localField: 'properties.flats',
  foreignField: '_id',
});

// New virtual for tenants
ManagerSchema.virtual('tenants', {
  ref: 'Tenant',
  localField: 'managedTenants',
  foreignField: '_id',
});

// Method to get all managed tenants
ManagerSchema.methods.getManagedTenants = async function() {
  await this.populate([
    { path: 'properties.houses' },
    { path: 'properties.flats' },
    { path: 'managedTenants' }
  ]);

  return this.managedTenants;
};

// Method to check if manager can take more properties
ManagerSchema.methods.canManageMore = function(): boolean {
  const totalProperties = this.properties.houses.length + this.properties.flats.length;
  return totalProperties < this.maxProperties;
};

// Update tenants when properties change
ManagerSchema.pre('save', async function(next) {
  if (this.isModified('properties')) {
    const Flat = mongoose.model('Flat');
    const Tenant = mongoose.model('Tenant');
    
    // Get all flats under this manager
    const allFlats = [
      ...this.properties.flats,
      ...(await Flat.find({ houseId: { $in: this.properties.houses } }).distinct('_id'))
    ];

    // Get all tenants in these flats
    this.managedTenants = await Tenant.find({ flatId: { $in: allFlats } }).distinct('_id');
  }
  next();
});

export default mongoose.models.Manager || mongoose.model<IManager>('Manager', ManagerSchema);