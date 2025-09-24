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
    
    let images:any[] = [];
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
    
    const payload = {...req.body, images};
    const house = await House.create(payload);
    
    if (req.body.managerId && req.body.managerId !== 'null') {
      const user = await User.findOne({ _id: req.body.managerId, role: UserRole.MANAGER });
      
      if (!user) {
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
    const modHouses = [];
    
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
    const house = await House.findById(req.params.id)
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

    // Parse JSON fields
    if (req.body.features && typeof req.body.features === 'string') {
      try {
        req.body.features = JSON.parse(req.body.features);
      } catch (error) {
        console.error('Error parsing features:', error);
      }
    }

    if (req.body.location && typeof req.body.location === 'string') {
      try {
        req.body.location = JSON.parse(req.body.location);
      } catch (error) {
        console.error('Error parsing location:', error);
      }
    }
    
    // Handle image updates properly - FIXED
    let existingImages: any[] = [];
    
    if (req.body.existingImages) {
      try {
        let parsedExistingImages: any[] = [];
        
        if (typeof req.body.existingImages === 'string') {
          parsedExistingImages = JSON.parse(req.body.existingImages);
        } else if (Array.isArray(req.body.existingImages)) {
          parsedExistingImages = req.body.existingImages;
        }
        
        // Validate and format existing images properly
        existingImages = parsedExistingImages.map((img: any) => {
          if (typeof img === 'string') {
            return {
              url: img,
              publicId: `existing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isPrimary: false
            };
          } else if (typeof img === 'object' && img.url) {
            return {
              url: img.url,
              publicId: img.publicId || `existing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isPrimary: img.isPrimary || false
            };
          }
          return null;
        }).filter(img => img !== null);
        
      } catch (error) {
        console.error('Error parsing existingImages:', error);
        existingImages = house.images || [];
      }
    } else {
      // If no existing images provided, keep current images
      existingImages = house.images || [];
    }

    // Handle new images
    let newImages: any[] = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const files = req.files as Express.Multer.File[];
      newImages = files.map(file => ({
        url: file.path,
        publicId: file.filename,
        isPrimary: false
      }));
    }

  if (req.body.existingImages !== undefined || (req.files && (Array.isArray(req.files) ? req.files.length > 0 : true))) {
  req.body.images = [...existingImages, ...newImages];
} else {
  // Don't modify images if not explicitly provided
  delete req.body.images;
}
    
    // Ensure all images have required URL field
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images = req.body.images.filter((img: any) => img && img.url);
    }
    
    // Parse numeric fields
    if (req.body.totalFlats !== undefined) {
      req.body.totalFlats = Number(req.body.totalFlats);
    }
    
    if (req.body.parkingSpaces !== undefined) {
      req.body.parkingSpaces = Number(req.body.parkingSpaces);
    }
    
    // Parse array fields
    if (typeof req.body.amenities === 'string') {
      req.body.amenities = req.body.amenities.split(',').map((a: string) => a.trim());
    }
    
    if (typeof req.body.commonAreas === 'string') {
      req.body.commonAreas = req.body.commonAreas.split(',').map((a: string) => a.trim());
    }

    // Define allowed fields for update
    const allowedFields = [
      'name', 'address', 'description', 'propertyType', 'amenities',
      'totalFlats', 'parkingSpaces', 'commonAreas', 'maintenanceContact',
      'emergencyContact', 'managerId', 'status', 'images', 'features', 'location'
    ];

    // Create update object with only allowed fields
    const updateData: any = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[field] = req.body[field];
      }
    });

    // Remove empty arrays and undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || 
          (Array.isArray(updateData[key]) && updateData[key].length === 0)) {
        delete updateData[key];
      }
    });

    console.log('Update data:', updateData);

    // Handle manager assignment
    const oldManagerId = house.managerId?.toString();
    const newManagerId = req.body.managerId;

    // Update the house
    const updatedHouse = await House.findByIdAndUpdate(
      req.params.id, 
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).populate('managerId', 'name email');

    if (!updatedHouse) {
      return next(new ErrorResponse('Failed to update house', 500));
    }

    // Handle manager assignment changes
    if (newManagerId !== undefined) {
      // Remove from old manager if manager changed
      if (oldManagerId && oldManagerId !== newManagerId) {
        await Manager.findOneAndUpdate(
          { userId: oldManagerId },
          { $pull: { 'properties.houses': house._id } }
        );
      }

      // Add to new manager if provided and valid
      if (newManagerId && newManagerId !== 'null' && newManagerId !== '') {
        const user = await User.findOne({ 
          _id: newManagerId, 
          role: UserRole.MANAGER 
        });
        
        if (!user) {
          return next(new ErrorResponse(`Manager not found with id ${newManagerId}`, 404));
        }
        
        let manager = await Manager.findOne({ userId: user._id });
        if (!manager) {
          manager = await Manager.create({
            userId: user._id,
            properties: { houses: [], flats: [] },
          });
        }
        
        if (!manager.properties.houses.includes(house._id)) {
          manager.properties.houses.push(house._id);
          await manager.save();
        }
      } else if (newManagerId === 'null' || newManagerId === '') {
        updatedHouse.managerId = undefined;
        await updatedHouse.save();
      }
    }

    // Re-populate the updated house
    const finalHouse = await House.findById(updatedHouse._id)
      .populate('managerId', 'name email')
      .populate([
        { 
          path: 'flats',
          populate: {
            path: 'tenantId',
            select: 'name email phone'
          }
        }
      ]);

    res.status(200).json({
      success: true,
      data: finalHouse,
    });
  } catch (error) {
    console.error('Update house error:', error);
    next(error);
  }
};

// DELETE /api/properties/houses/:id
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
    
    // FIXED: Delete images from Cloudinary with proper publicId checking
    if (house.images && house.images.length > 0) {
      for (const image of house.images) {
        if (image.publicId) {
          await deleteFromCloudinary(image.publicId);
        }
      }
    }
    
    // Remove from manager's properties
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

// Create a new flat - CORRECTED to match model
// POST /api/properties/houses/:houseId/flats
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
    
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to add flats to this house`, 401));
    }
    
    const images = req.files && Array.isArray(req.files)
      ? (req.files as Express.Multer.File[]).map(file => ({
          url: file.path,
          publicId: file.filename
        }))
      : [];
    
    let tenantId = req.body.tenantId;
    
    // Create new tenant if details are provided
    if (req.body.tenantDetails && !tenantId) {
      const newTenant = await Tenant.create({
        ...req.body.tenantDetails,
        landlordId: req.user.id,
        status: 'active'
      });
      tenantId = newTenant._id;
    }
    
    // CORRECTED: Use proper field names from the model
    const flatData = {
      number: req.body.number,
      name: req.body.name,
      houseId,
      images,
      floorNumber: Number(req.body.floorNumber),
      size: Number(req.body.size),
      bedrooms: Number(req.body.bedrooms),
      bathrooms: Number(req.body.bathrooms),
      toilet: Number(req.body.toilet),
      palour: req.body.palour === 'true',
      kitchen: req.body.kitchen === 'true',
      furnished: req.body.furnished === 'true',
      description: req.body.description,
      rentAmount: Number(req.body.rentAmount),
      depositAmount: Number(req.body.depositAmount),
      rentDueDay: req.body.rentDueDay ? Number(req.body.rentDueDay) : undefined,
      status: tenantId ? 'occupied' : 'vacant',
      managerId: house.managerId,
      tenantId
    };
    
    const flat = await Flat.create(flatData);
    
    // Update tenant with flat reference
    if (tenantId) {
      const tenant = await Tenant.findById(tenantId);
      if (tenant) {
        tenant.flatId = flat._id;
        tenant.status = 'active';
        await tenant.save();
      }
    }
    
    // Add flat to manager's properties
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
      data: populatedFlat
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
    
    // Ensure all flats have a manager (inherit from house if needed)
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
    
    // Inherit manager from house if not set
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
    
    // Store old manager ID for cleanup
    const oldManagerId = flat.managerId?.toString();
    
    // Handle manager assignment
    if (!req.body.managerId && house.managerId) {
      req.body.managerId = house.managerId;
    }
    
    // Handle image updates properly for flats - FIXED with type-safe approach
    let existingImages: any[] = flat.images || [];
    
    if (req.body.existingImages) {
      try {
        let parsedExistingImages: any[] = [];
        
        if (typeof req.body.existingImages === 'string') {
          parsedExistingImages = JSON.parse(req.body.existingImages);
        } else if (Array.isArray(req.body.existingImages)) {
          parsedExistingImages = req.body.existingImages;
        }
        
        // Validate and format existing images properly
        existingImages = parsedExistingImages.map((img: any, index: number) => {
          if (typeof img === 'string') {
            return {
              url: img,
              publicId: `existing-img-${Date.now()}-${index}`,
              isPrimary: false
            };
          } else if (typeof img === 'object' && img.url) {
            return {
              url: img.url || '',
              publicId: img.publicId || `existing-img-${Date.now()}-${index}`,
              isPrimary: img.isPrimary || false
            };
          }
          return null;
        }).filter(img => img !== null);
        
      } catch (error) {
        console.error('Error parsing existingImages:', error);
        existingImages = flat.images || [];
      }
    }

    // Handle new images with type-safe approach
    let newImages: any[] = [];
    
    // Type-safe file handling
    if (req.files) {
      let files: Express.Multer.File[] = [];
      
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (typeof req.files === 'object') {
        // Handle case where files is an object with fieldnames
        files = Object.values(req.files).flat();
      }
      
      if (files.length > 0) {
        newImages = files.map(file => ({
          url: file.path,
          publicId: file.filename,
          isPrimary: false
        }));
      }
    }

    // Only update images if we have changes
    if (req.body.existingImages !== undefined || (req.files && (Array.isArray(req.files) ? req.files.length > 0 : Object.keys(req.files as object).length > 0))) {
      req.body.images = [...existingImages, ...newImages];
    } else {
      // Don't modify images if not explicitly provided
      delete req.body.images;
    }
    
    // Ensure all images have required URL field
    if (req.body.images && Array.isArray(req.body.images)) {
      req.body.images = req.body.images.filter((img: any) => img && img.url);
    }
    
    // Handle tenant assignment and status updates - FIXED
    const currentTenantId = flat.tenantId?.toString();
    const newTenantId = req.body.tenantId;
    
    delete req.body.status;
    
    // Handle tenant changes properly
    if (newTenantId !== undefined) {
      if (newTenantId && newTenantId !== '' && newTenantId !== 'null') {
        // Assigning a new tenant
        const tenant = await Tenant.findById(newTenantId);
        if (!tenant) {
          return next(new ErrorResponse(`Tenant not found`, 404));
        }
        
        // Check if tenant is already assigned to another flat
        if (tenant.flatId && tenant.flatId.toString() !== req.params.id) {
          return next(new ErrorResponse(`Tenant is already assigned to another property`, 400));
        }
        
        // Update tenant assignment
        tenant.flatId = flat._id;
        tenant.status = 'active';
        await tenant.save();
        
        req.body.status = 'occupied';
        
        // Clear previous tenant if different
        if (currentTenantId && currentTenantId !== newTenantId) {
          const previousTenant = await Tenant.findById(currentTenantId);
          if (previousTenant) {
            previousTenant.flatId = null;
            previousTenant.status = 'inactive';
            await previousTenant.save();
          }
        }
      } else if (newTenantId === '' || newTenantId === 'null') {
        // Removing tenant assignment
        if (currentTenantId) {
          const tenant = await Tenant.findById(currentTenantId);
          if (tenant) {
            tenant.flatId = null;
            tenant.status = 'inactive';
            await tenant.save();
          }
        }
        req.body.status = 'vacant';
        req.body.tenantId = null;
      }
    } else {
      // No tenantId provided, maintain current status
      req.body.status = currentTenantId ? 'occupied' : 'vacant';
    }
    
    // CORRECTED: Use proper field names from the model
    if (req.body.rentAmount !== undefined) {
      req.body.rentAmount = Number(req.body.rentAmount);
    }
    
    if (req.body.depositAmount !== undefined) {
      req.body.depositAmount = Number(req.body.depositAmount);
    }
    
    if (req.body.floorNumber !== undefined) {
      req.body.floorNumber = Number(req.body.floorNumber);
    }
    
    if (req.body.size !== undefined) {
      req.body.size = Number(req.body.size);
    }
    
    if (req.body.bedrooms !== undefined) {
      req.body.bedrooms = Number(req.body.bedrooms);
    }
    
    if (req.body.bathrooms !== undefined) {
      req.body.bathrooms = Number(req.body.bathrooms);
    }
    
    if (req.body.toilet !== undefined) {
      req.body.toilet = Number(req.body.toilet);
    }
    
    // Parse boolean fields
    if (req.body.furnished !== undefined) {
      req.body.furnished = req.body.furnished === 'true' || req.body.furnished === true;
    }
    
    if (req.body.palour !== undefined) {
      req.body.palour = req.body.palour === 'true' || req.body.palour === true;
    }
    
    if (req.body.kitchen !== undefined) {
      req.body.kitchen = req.body.kitchen === 'true' || req.body.kitchen === true;
    }
    

    // Define allowed fields for update - CORRECTED to match model
    const allowedFields = [
      'number', 'name', 'floorNumber', 'size', 'bedrooms', 'bathrooms', 'toilet',
      'palour', 'kitchen', 'rentAmount', 'depositAmount', 'rentDueDay', 
      'furnished', 'description', 'managerId', 'status', 'images', 'tenantId', 
    ];

    // Create update object with only allowed fields
    const updateData: any = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[field] = req.body[field];
      }
    });

    // Remove empty arrays and undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || 
          (Array.isArray(updateData[key]) && updateData[key].length === 0)) {
        delete updateData[key];
      }
    });

    console.log('Flat update data:', updateData);

    // Update the flat
    const updatedFlat = await Flat.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'managerId',
        select: 'name email phone specializations',
        populate: {
          path: 'userId',
          select: 'name email phone'
        }
      },
      { 
        path: 'tenantId', 
        select: 'name email phone emergencyContact' 
      },
      { 
        path: 'houseId', 
        select: 'name address landlordId managerId',
        populate: {
          path: 'managerId',
          select: 'name email'
        }
      }
    ]);
    
    if (!updatedFlat) {
      return next(new ErrorResponse('Failed to update flat', 500));
    }

    // Handle manager assignment changes
    const newManagerId = req.body.managerId;
    
    if (newManagerId !== undefined) {
      // Remove from old manager if manager changed
      if (oldManagerId && oldManagerId !== newManagerId) {
        await Manager.findOneAndUpdate(
          { userId: oldManagerId },
          { $pull: { 'properties.flats': flat._id } }
        );
      }

      // Add to new manager if provided and valid
      if (newManagerId && newManagerId !== 'null' && newManagerId !== '') {
        // Validate manager exists
        const user = await User.findOne({ 
          _id: newManagerId, 
          role: UserRole.MANAGER 
        });
        
        if (!user) {
          return next(new ErrorResponse(`Manager not found with id ${newManagerId}`, 404));
        }
        
        let manager = await Manager.findOne({ userId: user._id });
        if (!manager) {
          manager = await Manager.create({
            userId: user._id,
            properties: { houses: [], flats: [] },
          });
        }
        
        // Add flat to manager's properties if not already there
        if (!manager.properties.flats.includes(flat._id)) {
          manager.properties.flats.push(flat._id);
          await manager.save();
        }
      } else if (newManagerId === 'null' || newManagerId === '') {
        // Clear manager assignment - inherit from house
        if (house.managerId) {
          updatedFlat.managerId = house.managerId;
          await updatedFlat.save();
          
          // Add to house manager's properties
          const houseManager = await Manager.findOne({ userId: house.managerId });
          if (houseManager && !houseManager.properties.flats.includes(flat._id)) {
            houseManager.properties.flats.push(flat._id);
            await houseManager.save();
          }
        } else {
          updatedFlat.managerId = undefined;
          await updatedFlat.save();
        }
      }
    }

    // Re-populate to get fresh data
    const finalFlat = await Flat.findById(updatedFlat._id)
      .populate([
        {
          path: 'managerId',
          select: 'name email phone specializations',
          populate: {
            path: 'userId',
            select: 'name email phone'
          }
        },
        { 
          path: 'tenantId', 
          select: 'name email phone emergencyContact leaseStartDate leaseEndDate' 
        },
        { 
          path: 'houseId', 
          select: 'name address landlordId managerId',
          populate: {
            path: 'managerId',
            select: 'name email phone'
          }
        }
      ]);

    res.status(200).json({
      success: true,
      data: finalFlat
    });
  } catch (error) {
    console.error('Update flat error:', error);
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
    
    // FIXED: Delete images from Cloudinary with proper publicId checking
    if (flat.images && flat.images.length > 0) {
      for (const image of flat.images) {
        if (image.publicId) {
          await deleteFromCloudinary(image.publicId);
        }
      }
    }
    
    // Remove from manager's properties
    if (flat.managerId) {
      await Manager.findOneAndUpdate(
        { userId: flat.managerId },
        { $pull: { 'properties.flats': flat._id } }
      );
    }
    
    // Remove tenant association
    if (flat.tenantId) {
      const tenant = await Tenant.findById(flat.tenantId);
      if (tenant) {
        tenant.flatId = null;
        tenant.status = 'inactive';
        await tenant.save();
      }
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