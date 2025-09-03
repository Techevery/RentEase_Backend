import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { House, Flat } from '../models/property.model';
import Manager from '../models/manager.model';
import { ErrorResponse } from '../utils/errorResponse';
import Tenant from '../models/tenant.model';
import { deleteFromCloudinary } from '../config/cloudinary';
import mongoose from 'mongoose';
import User,{UserRole} from '../models/user.model';

// Create a new house
// POST /api/properties/houses
export const createHouse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.body.landlordId = req.user.id;
     req.body.status = 'active';
      if (typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }
      if (typeof req.body.location === 'string') {
      req.body.location = JSON.parse(req.body.location);
    }
     let images:any[]=[]
   if (req.files) {
  const files = req.files as Express.Multer.File[];
  images = files.map(file => ({
    url: file.path,
    publicId: file.filename
  }));
}

 if (typeof req.body.amenities === 'string') {
      req.body.amenities = req.body.amenities.split(',');
    }
    if (typeof req.body.commonAreas === 'string') {
      req.body.commonAreas = req.body.commonAreas.split(',');
    }
    req.body.totalFlats = Number(req.body.totalFlats);
    req.body.parkingSpaces = Number(req.body.parkingSpaces);
    req.body.emergencyContact = String(req.body.emergencyContact);
    req.body.maintenanceContact = String(req.body.maintenanceContact);
    if (req.body.managerId) {
  if (Array.isArray(req.body.managerId)) {
    req.body.managerId = req.body.managerId[0]; 
  }
  if (!mongoose.Types.ObjectId.isValid(req.body.managerId)) {
    return next(new ErrorResponse('Invalid managerId format', 400));
  }
}
    const payload ={...req.body,images}
    const house = await House.create(payload);
   if (req.body.managerId && req.body.managerId !== 'null') {
  
    
      const user = await User.findOne({ _id: req.body.managerId,role:UserRole.MANAGER });
      
      if( !user) {
        return next(new ErrorResponse(`Manager not found`, 404));
      }
      let manager = await Manager.findOne({ userId: user._id });
      if (!manager) {
        manager = await Manager.create({
          userId: user._id,
          properties: {
            houses: [],
          
          },
     
        });
      }
      manager.properties.houses.push(house._id);
      await manager.save();
    }
    res.status(201).json({
      success: true,
      data: house,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/properties/houses
export const getHouses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = House.find({ landlordId: req.user.id });
    if (req.query.propertyType) {
      query.find({ propertyType: req.query.propertyType });
    }

    if (req.query.status) {
      query.find({ status: req.query.status });

    }
    
    const houses = await query;
    const modHouses =[]
    for (const house of houses) {
      const manager = await Manager.findOne({ "properties.houses": house._id });
      const user = await User.findById(manager?.userId);
      modHouses.push({
        ...house.toObject(),
        manager: user
      });
    }

    res.status(200).json({
      success: true,
      count: modHouses.length,
      data: modHouses,
    });
  } catch (error) {
    next(error);
  }
};
// GET /api/properties/houses/:id
export const getHouse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log({id:req.params.id})
    const house = await House.findById(req.params.id )
      .populate([
        { 
          path: 'flats',
          populate: {
            path: 'tenantId',
            select: 'name email phone'
          }
      
        },
        { path: 'managerId', select: 'name email specializations' }
      ]);

    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${req.params.id}`, 404));
    }
    if (
      house.landlordId.toString() !== req.user.id &&
      (!house.managerId || house.managerId.toString() !== req.user.id)
    ) {
      return next(new ErrorResponse(`User not authorized to access this house`, 401));
    }

    res.status(200).json({
      success: true,
      data: house,
    });
  } catch (error) {
    next(error);
  }
};
// PUT /api/properties/houses/:id
export const updateHouse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let house = await House.findById(req.params.id);

    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${req.params.id}`, 404));
    }
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to update this house`, 401));
    }

    if (typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }

      if (typeof req.body.location === 'string') {
      req.body.location = JSON.parse(req.body.location);
    }
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      const images = files.map(file => ({
        url: file.path,
        publicId: file.filename,
        isPrimary: false
      }));
      if (house.images && house.images.length > 0) {
        for (const image of house.images) {
          await deleteFromCloudinary(image.publicId);
        }
      }
      req.body.images = images;
    }
     if (req.body.existingImages) {
      const existingImages = Array.isArray(req.body.existingImages) 
        ? req.body.existingImages.map((img: string) => JSON.parse(img))
        : [JSON.parse(req.body.existingImages)];
      req.body.images = [...existingImages];

    }
    if (req.body.totalFlats !== undefined) {
      req.body.totalFlats = Number(req.body.totalFlats);
    }
    if (req.body.parkingSpaces !== undefined) {
      req.body.parkingSpaces = Number(req.body.parkingSpaces);
    }
    req.body.emergencyContact = String(req.body.emergencyContact);
    req.body.maintenanceContact = String(req.body.maintenanceContact);

// Accept the existing value of totalFlats if not provided in the request
if (req.body.totalFlats === undefined || req.body.totalFlats === null) {
  req.body.totalFlats = house.totalFlats;
}

// if (isNaN(Number(req.body.totalFlats))) {
//   return next(new ErrorResponse('totalFlats must be a numeric value', 400));
// }

// if (Number(req.body.totalFlats) < 1) {
//   return next(new ErrorResponse('totalFlats must be at least 1', 400));
// }
// req.body.totalFlats = Number(req.body.totalFlats);

    if (typeof req.body.amenities === 'string') {
      req.body.amenities = req.body.amenities.split(',');
    }
    if (typeof req.body.commonAreas === 'string') {
      req.body.commonAreas = req.body.commonAreas.split(',');
    }
    if (req.body.managerId && req.body.managerId !== house.managerId?.toString()) {

if (req.body.managerId && req.body.managerId !== house.managerId?.toString()) {
  const flats = await Flat.find({ houseId: house._id });
  await Flat.updateMany(
    { houseId: house._id },
    { managerId: req.body.managerId }
  );

  if (house.managerId) {
    await Manager.findOneAndUpdate(
      { userId: house.managerId },
      { $pull: { 'properties.flats': { $in: flats.map(f => f._id) } } }
    );
  }
  if (req.body.managerId && req.body.managerId !== 'null') {
    const newManager = await Manager.findOne({ userId: req.body.managerId });
    if (newManager) {
      const canHandle = newManager.canHandleAdditional(flats.length);
      if (!canHandle) {
        return next(new ErrorResponse(`Manager cannot handle this many properties`, 400));
      }

      await Manager.findOneAndUpdate(
        { userId: req.body.managerId },
        { 
          $addToSet: { 
            'properties.flats': { $each: flats.map(f => f._id) },
            'properties.houses': house._id
          } 
        }
      );
    }
  }
}
      if (house.managerId) {
        await Manager.findOneAndUpdate(
          { userId: house.managerId },
          { $pull: { 'properties.houses': house._id } }
        );
      }
      const newManager = await Manager.findOne({ userId: req.body.managerId });
      
      if (!newManager) {
        return next(new ErrorResponse(`Manager not found`, 404));
      }

      if (!newManager.canManageMore()) {
        return next(new ErrorResponse(`Manager has reached maximum property limit`, 400));
      }

      newManager.properties.houses.push(house._id);
      await newManager.save();
    }

    house = await House.findByIdAndUpdate(req.params.id, req.body, {
  new: true,
  runValidators: true,
}).populate('managerId', 'name email');

res.status(200).json({
  success: true,
  data: house,
})
  } catch (error) {
    next(error);
  }
};

//  DELETE /api/properties/houses/:id
export const deleteHouse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const house = await House.findById(req.params.id);

    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${req.params.id}`, 404));
    }
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to delete this house`, 401));
    }
    if (house.images && house.images.length > 0) {
      for (const image of house.images) {
        await deleteFromCloudinary(image.publicId);
      }
    }
    if (house.managerId) {
      await Manager.findOneAndUpdate(
        { userId: house.managerId },
        { $pull: { 'properties.houses': house._id } }
      );
    }

    await house.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// Create a new flat
//  POST /api/properties/houses/:houseId/flats
export const createFlat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { houseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(houseId)) {
      return next(new ErrorResponse('Invalid houseId format', 400));
    }

    const house = await House.findById(houseId);
    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${houseId}`, 404));
    }
    if (house.landlordId.toString()!== req.user.id) {
      return next(new ErrorResponse(`User not authorized to add flats to this house`, 401));
    }
    const images = req.files 
      ? (req.files as Express.Multer.File[]).map(file => ({
          url: file.path,
          publicId: file.filename
        }))
      : [];
    let tenantId = req.body.tenantId;
    if (req.body.tenantDetails && !tenantId) {
      const newTenant = await Tenant.create({
        ...req.body.tenantDetails,
        landlordId: req.user.id,
        status: 'active'
      });
      tenantId = newTenant._id;
    }
    const flatData = {
      ...req.body,
      houseId,
      images,
      status: tenantId ? 'occupied' : 'vacant',
      managerId: house.managerId 
    };
    const flat = await Flat.create(flatData);
    if (tenantId) {
      const tenant = await Tenant.findById(tenantId);
      if (tenant) {
        tenant.flatId = flat._id;
        tenant.status = 'active';
        await tenant.save();
      }
    }
    if (house.managerId) {
      await Manager.findOneAndUpdate(
        { userId: house.managerId },
        { $push: { 'properties.flats': flat._id } }
      );
    }
   const populatedFlat = await Flat.findById(flat._id)
      .populate('managerId', 'name email specializations')
      .populate('tenantId', 'name email phone');
    res.status(201).json({
      success: true,
      data: flat
    });
  } catch (error) {
    next(error);
  }
};
// Get all flats for a house with details
// GET /api/properties/houses/:houseId/flats
export const getFlats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const house = await House.findById(req.params.houseId)
      .populate('managerId', 'name email phone');

    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
    }
    const query = Flat.find({ houseId: req.params.houseId });
    if (req.query.status) {
      query.find({ status: req.query.status });
    }

    if (req.query.furnished) {
      query.find({ furnished: req.query.furnished === 'true' });
    }
    query.populate([
      {
        path: 'tenantId',
        select: 'name email phone emergencyContact leaseStartDate leaseEndDate'
      },
      {
        path: 'managerId',
        select: 'name email phone specializations',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      },
      {
        path: 'houseId',
        select: 'name address managerId',
        populate: {
          path: 'managerId',
          select: 'name email phone'
        }
      }
    ]);

    let flats = await query;
    flats = await Promise.all(flats.map(async (flat) => {
      if (!flat.managerId && house.managerId) {
        flat.managerId = house.managerId;
        await flat.save();
        const manager = await Manager.findOne({ userId: house.managerId });
        if (manager && !manager.properties.flats.includes(flat._id)) {
          manager.properties.flats.push(flat._id);
          await manager.save();
        }
        await flat.populate([
          {
            path: 'managerId',
            select: 'name email phone specializations',
            populate: {
              path: 'userId',
              select: 'name email phone'
            }
          }
        ]);
      }
      return flat;
    }));
    const formattedFlats = flats.map(flat => {
      const manager = flat.managerId || (flat.houseId as any).managerId;
      return {
        ...flat.toObject(),
        manager: manager ? {
          _id: manager._id,
          name: manager.name,
          email: manager.email,
          phone: manager.phone,
          specializations: manager.specializations,
          isInherited: !flat.managerId && !!house.managerId
        } : null
      };
    });

    res.status(200).json({
      success: true,
      count: formattedFlats.length,
      data: formattedFlats,
    });
  } catch (error) {
    next(error);
  }
};

// Get single flat with details
// GET /api/properties/flats/:id
export const getFlat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flat = await Flat.findById(req.params.id)
      .populate([
        { 
          path: 'houseId', 
          select: 'name address landlordId managerId',
          populate: {
            path: 'managerId',
            select: 'name email'
          }
        },
        { 
          path: 'tenantId', 
          select: 'name email phone emergencyContact' 
        },
        { 
          path: 'managerId',
          select: 'name email phone specializations',
          populate: {
            path: 'userId',
            select: 'name email phone'
          }
        }
      ]);

    if (!flat) {
      return next(new ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
    }

    const house = flat.houseId as any;
    if (
      house.landlordId.toString() !== req.user.id &&
      (!flat.managerId || flat.managerId.toString() !== req.user.id) &&
      (!house.managerId || house.managerId.toString() !== req.user.id)
    ) {
      return next(new ErrorResponse(`User not authorized to access this flat`, 401));
    }
    if (!flat.managerId && house.managerId) {
      flat.managerId = house.managerId;
      await flat.save();
    }

    res.status(200).json({
      success: true,
      data: flat,
    });
  } catch (error) {
    next(error);
  }
};

//  Update flat
// PUT /api/properties/flats/:id
export const updateFlat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flat = await Flat.findById(req.params.id).populate('houseId');
    if (!flat) {
      return next(new ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
    }

    const house = flat.houseId as any;
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to update this flat`, 401));
    }
    if (house.managerId && !req.body.managerId) {
      req.body.managerId = house.managerId;
    }
    const currentTenantId = flat.tenantId?.toString();
    const newTenantId = req.body.tenantId;

     delete req.body.status;

    if (newTenantId && newTenantId !== currentTenantId) {
      const tenant = await Tenant.findById(newTenantId);
      if (!tenant) {
        return next(new ErrorResponse(`Tenant not found`, 404));
      }
      const tenantFlat = await Flat.findOne({ 
        _id: tenant.flatId,
        houseId: house._id 
      });
      
      if (!tenantFlat && tenant.flatId) {
        return next(new ErrorResponse(`Tenant belongs to another property`, 400));
      }
      tenant.flatId = flat._id;
      tenant.status = 'active';
      await tenant.save();
      req.body.status = 'occupied';
    } else if (!newTenantId && currentTenantId) {
      const tenant = await Tenant.findById(currentTenantId);
      if (tenant) {
        tenant.flatId = null;
        tenant.status = 'inactive';
        await tenant.save();
      }
      req.body.status = 'vacant';
    }
    if (req.files) {
      const newImages = (req.files as Express.Multer.File[]).map(file => ({
        url: file.path,
        publicId: file.filename
      }));
      if (flat.images?.length) {
        await Promise.all(
          flat.images.map(img => deleteFromCloudinary(img.publicId))
        );
      }
      req.body.images = newImages;
    }

    const updatedFlat = await Flat.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      'managerId',
      'tenantId',
      {
        path: 'houseId',
        populate: {
          path: 'managerId'
        }
      }
    ]);
    if (updatedFlat && req.body.managerId && req.body.managerId !== flat.managerId?.toString()) {
      if (flat.managerId) {
        await Manager.findOneAndUpdate(
          { userId: flat.managerId },
          { $pull: { 'properties.flats': flat._id } }
        );
      }
      const newManager = await Manager.findOne({ userId: req.body.managerId });
      if (newManager) {
        await Manager.findOneAndUpdate(
          { userId: req.body.managerId },
          { $addToSet: { 'properties.flats': updatedFlat._id } }
        );
      }
    }
    res.status(200).json({
      success: true,
      data: updatedFlat
    });
  } catch (error) {
    next(error);
  }
};
// Delete flat
// DELETE /api/properties/flats/:id
export const deleteFlat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const flat = await Flat.findById(req.params.id).populate('houseId');

    if (!flat) {
      return next(new ErrorResponse(`Flat not found with id of ${req.params.id}`, 404));
    }
    const house = flat.houseId as any;
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to delete this flat`, 401));
    }
    if (flat.images && flat.images.length > 0) {
      for (const image of flat.images) {
        await deleteFromCloudinary(image.publicId);
      }
    }
    if (flat.managerId) {
      await Manager.findOneAndUpdate(
        { userId: flat.managerId },
        { $pull: { 'properties.flats': flat._id } }
      );
    }

    await flat.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// Get all tenants in a house
// GET /api/properties/houses/:houseId/tenants
export const getTenantsInHouse = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const house = await House.findById(req.params.houseId);

    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${req.params.houseId}`, 404));
    }
    if (
      house.landlordId.toString() !== req.user.id &&
      (!house.managerId || house.managerId.toString() !== req.user.id)
    ) {
      return next(new ErrorResponse(`User not authorized to access tenants in this house`, 401));
    }
    const flatsWithTenants = await Flat.find({ 
      houseId: house._id,
      tenantId: { $ne: null } 
    }).populate('tenantId', 'name email phone emergencyContact leaseStartDate leaseEndDate');
    const tenants = flatsWithTenants.map(flat => ({
      tenant: flat.tenantId,
      flatId: flat._id,
      flatNumber: flat.number,
      floorNumber: flat.floorNumber
    }));

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (error) {
    next(error);
  }
};