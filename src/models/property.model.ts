import mongoose, { Document, Schema } from 'mongoose';

export interface IPropertyBase extends Document {
  name: string;
  address: string;
  managerId?: mongoose.Schema.Types.ObjectId;
  description?: string;
  propertyType: 'residential' | 'commercial';
  status: 'active' | 'inactive' | 'maintenance';
  amenities: string[];
  maintenanceContact?: string;
  emergencyContact: string;
  images: Array<{
    url: string;
    isPrimary?: boolean;
    publicId?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IHouse extends IPropertyBase {
  flats: mongoose.Types.ObjectId[]; 
  _id: mongoose.Types.ObjectId;
  name: string;
  address: string;
  totalFlats: number;
  parkingSpaces?: number;
  commonAreas?: string[];
   
  landlordId: mongoose.Schema.Types.ObjectId;
  managerId?: mongoose.Schema.Types.ObjectId;
  
}


// Fixed image schema - make fields optional
const imageSchema = new Schema({
  url: {
    type: String,
    required: true // Keep URL required as it's essential
  },
  publicId: {
    type: String,
    // Remove required validation entirely for flexibility
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });
const HouseSchema = new Schema<IHouse>(
  {
    name: {
      type: String,
      required: [true, 'Please add a house name'],
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
    },
    description: {
      type: String,
    },
    propertyType: {
      type: String,
      enum: ['residential', 'commercial'],
      default: 'residential',
    },
    amenities: [{
      type: String,
    }],
    totalFlats: {
      type: Number,
      required: [true, 'Please specify the total number of flats'],
      min: 1,
    },
    parkingSpaces: {
      type: Number,
      default: 0,
    },
    commonAreas: [{
      type: String,
    }],
    maintenanceContact: {
      type: String,
    },
    emergencyContact: {
      type: String,
    },
    landlordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
    
    },
      status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },

     images: [imageSchema], 

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);





HouseSchema.pre('deleteOne', { document: true, query: false }, async function(next) {

  await mongoose.model('Flat').deleteMany({ houseId: this._id });
  next();
});


HouseSchema.pre('deleteMany', async function(next) {

  const houses = await mongoose.model('House').find(this.getFilter());
  for (const house of houses) {
    await mongoose.model('Flat').deleteMany({ houseId: house._id });
  }
  next();
});

HouseSchema.virtual('flats', {
  ref: 'Flat',
  localField: '_id',
  foreignField: 'houseId',
  justOne: false,
});

export const House = mongoose.model<IHouse>('House', HouseSchema);

export interface IFlat extends Document {
  name?: string; 
  number: string;
  houseId: mongoose.Schema.Types.ObjectId;
  managerId?: mongoose.Schema.Types.ObjectId;
  tenantId?: mongoose.Schema.Types.ObjectId;
  floorNumber: number;
  size: number; 
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  palour: boolean;
  toilet: number;
  kitchen: boolean;
  description: string;
  images: Array<{
    url: string;
    isPrimary?: boolean;
    publicId?: string;
  }>;
  rentAmount: number;
  depositAmount: number;
  rentDueDay: number;
  utilities: string[];
  status: 'vacant' | 'occupied' | 'maintenance';
  maintenanceHistory: {
    date: Date;
    description: string;
    cost: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const FlatSchema = new Schema<IFlat>(
  
  {
    name: {
      type: String,
      trim: true,
    },
    number: {
      type: String,
      required: [true, 'Please add a flat number'],
      trim: true,
    },
    houseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'House',
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
    },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
    },

   images: [imageSchema],

    floorNumber: {
      type: Number,
      required: [true, 'Please specify the floor number'],
    },
    
    size: {
      type: Number,
      required: [true, 'Please specify the size of the flat'],
    },
    bedrooms: {
      type: Number,
      required: [true, 'Please specify the number of bedrooms'],
      min: 0,
    },
     palour: {
      type: Boolean,
      default: false,
    },
    toilet: {
      type: Number,
      required: [true, 'Please specify the number of toilets'],
      min: 0,
    },
    kitchen: {
      type: Boolean,
      default: false,
    },
    bathrooms: {
      type: Number,
      required: [true, 'Please specify the number of bathrooms'],
      min: 0,
    },
    furnished: {
      type: Boolean,
      default: false,
    },
    rentAmount: {
      type: Number,
      required: [true, 'Please add rent amount'],
    },
    depositAmount: {
      type: Number,
      required: [true, 'Please add deposit amount'],
    },
    rentDueDay: {
      type: Number,
      min: 1,
    
    },

    
    // utilities: [{
    //   type: String,
    //   enum: ['water', 'electricity', 'gas', 'internet', 'heating', 'cooling'],
    // }],
    description: {
      type: String,
      // required: [true, 'Please add a description'],
    },
    status: { 
      type: String,
      enum: ['vacant', 'occupied', 'maintenance'],
      default: 'vacant',
    },
    
    maintenanceHistory: [{
      date: {
        type: Date,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      cost: {
        type: Number,
        required: true,
      },
    }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Update timestamps
FlatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for payments
FlatSchema.virtual('payments', {
  ref: 'Payment',
  localField: '_id',
  foreignField: 'flatId',
  justOne: false,
});

// Virtual for current tenant details
FlatSchema.virtual('tenantDetails', {
  ref: 'Tenant',
  localField: 'tenantId',
  foreignField: '_id',
  justOne: true,
});

export const Flat = mongoose.model<IFlat>('Flat', FlatSchema);