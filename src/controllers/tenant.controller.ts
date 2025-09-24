import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Tenant from '../models/tenant.model';
import { Flat } from '../models/property.model';
import { ErrorResponse } from '../utils/errorResponse';
import mongoose from 'mongoose';

// Create a new tenant
//  POST /api/tenants
export const createTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    req.body.landlordId = req.user.id;
    
    // Calculate total rent if not provided
    if (!req.body.totalRent) {
      req.body.totalRent = (req.body.rentAmount || 0) + 
                          (req.body.cautionFee || 0) + 
                          (req.body.serviceCharge || 0);
    }

    if (req.body.flatId) {
      const flat = await Flat.findById(req.body.flatId).populate('houseId');
      
      if (!flat) {
        return next(new ErrorResponse(`Flat not found with id of ${req.body.flatId}`, 404));
      }

      const house = flat.houseId as any;

      // Make sure user is house owner
      if (house.landlordId.toString() !== req.user.id) {
        return next(new ErrorResponse(`User not authorized to add tenants to this flat`, 401));
      }

      // Check if flat already has a tenant
      if (flat.tenantId) {
        return next(new ErrorResponse(`Flat already has a tenant assigned`, 400));
      }
    }

    const tenant = await Tenant.create(req.body);
    
    // If flat is provided, update the flat with the tenant ID
    if (req.body.flatId) {
      await Flat.findByIdAndUpdate(
        req.body.flatId,
        { tenantId: tenant._id },
        { new: true }
      );
    }

    res.status(201).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// Get all tenants for landlord
// GET /api/tenants
export const getTenants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let query;

    // Find tenants for landlord
    if (req.user.role === 'landlord') {
      query = Tenant.find({ landlordId: req.user.id });
    } else if (req.user.role === 'manager') {
      // Find flats managed by this manager
      const flats = await Flat.find({ managerId: req.user.id });
      const flatIds = flats.map(flat => flat._id);

      // Find tenants in those flats
      query = Tenant.find({ flatId: { $in: flatIds } });
    } else {
      return next(new ErrorResponse('Not authorized to access tenants', 403));
    }

    query = query.populate([
      { path: 'unit', select: 'name number ' }, 
      { path: 'property', select: 'name ' } 
    ]);

    const tenants = await query;
   

    res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (error) {
    next(error);
  }
};

// Get single tenant
// GET /api/tenants/:id
export const getTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // For landlord, check if they own the tenant
    if (req.user.role === 'landlord' && tenant.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to access this tenant`, 401));
    }

    // For manager, check if they manage the flat where tenant lives
    // if (req.user.role === 'manager' && tenant.flatId) {
    //   const flat = await Flat.findById(tenant.flatId);
      
    //   if (!flat || flat.managerId?.toString() !== req.user.id) {
    //     return next(new ErrorResponse(`Not authorized to access this tenant`, 401));
    //   }
    // }

    res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    next(error);
  }
};

// Update the updateTenant function
export const updateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First find the tenant
    const existingTenant = await Tenant.findById(req.params.id);

    if (!existingTenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is tenant owner
    if (existingTenant.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to update this tenant`, 401));
    }

    // Calculate total rent if rentAmount, cautionFee, serviceCharge, agencyFee, or legalFee are being updated
    if (req.body.rentAmount !== undefined || req.body.cautionFee !== undefined || 
        req.body.serviceCharge !== undefined || req.body.agencyFee !== undefined || 
        req.body.legalFee !== undefined) {
      const rentAmount = req.body.rentAmount !== undefined ? req.body.rentAmount : existingTenant.rentAmount;
      const cautionFee = req.body.cautionFee !== undefined ? req.body.cautionFee : existingTenant.cautionFee;
      const serviceCharge = req.body.serviceCharge !== undefined ? req.body.serviceCharge : existingTenant.serviceCharge;
      const agencyFee = req.body.agencyFee !== undefined ? req.body.agencyFee : existingTenant.agencyFee;
      const legalFee = req.body.legalFee !== undefined ? req.body.legalFee : existingTenant.legalFee;
      
      req.body.totalRent = rentAmount + cautionFee + serviceCharge + agencyFee + legalFee;
    }

    // Handle flat assignment if it's being changed
    if (req.body.flatId && existingTenant.flatId?.toString() !== req.body.flatId) {
      // Check if new flat exists and belongs to landlord
      const newFlat = await Flat.findById(req.body.flatId).populate('houseId');
      
      if (!newFlat) {
        return next(new ErrorResponse(`Flat not found with id of ${req.body.flatId}`, 404));
      }
      
      const house = newFlat.houseId as any;
      
      if (house.landlordId.toString() !== req.user.id) {
        return next(new ErrorResponse(`User not authorized to assign tenants to this flat`, 401));
      }
      
      // Check if new flat already has a tenant
      if (newFlat.tenantId && existingTenant._id && newFlat.tenantId.toString() !== existingTenant._id.toString()) {
        return next(new ErrorResponse(`Flat already has a tenant assigned`, 400));
      }
      
      // If tenant was previously assigned to a flat, update that flat
      if (existingTenant.flatId) {
        await Flat.findByIdAndUpdate(
          existingTenant.flatId,
          { tenantId: null },
          { new: true }
        );
      }
      
      // Update new flat with tenant ID
      await Flat.findByIdAndUpdate(
        req.body.flatId,
        { tenantId: existingTenant._id },
        { new: true }
      );
    }

    // Now update the tenant
    const updatedTenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: updatedTenant,
    });
  } catch (error) {
    next(error);
  }
};

// Delete tenant
// DELETE /api/tenants/:id
export const deleteTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is tenant owner
    if (tenant.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to delete this tenant`, 401));
    }

    // If tenant is assigned to a flat, update the flat
    if (tenant.flatId) {
      await Flat.findByIdAndUpdate(
        tenant.flatId,
        { tenantId: null,
         status: 'active'
         },
        { new: true }
      );
    }

 const deactivateOnly = req.query.mode === 'deactivate';


     if (deactivateOnly) {
      // Soft delete - mark tenant as inactive
      tenant.status = 'inactive';
      tenant.flatId = undefined;
      await tenant.save();

       res.status(200).json({
        success: true,
        data: {
          message: 'Tenant deactivated successfully',
          tenant
        },
      });
    } else {

   await tenant.deleteOne(); 

  res.status(200).json({
        success: true,
        data: {
          message: 'Tenant deleted successfully',
          tenant: null
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

//  Deactivate tenant 
// PUT /api/tenants/:id/deactivate
export const deactivateTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is tenant owner
    if (tenant.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to deactivate this tenant`, 401));
    }

    // If tenant is assigned to a flat, update the flat
    if (tenant.flatId) {
      await Flat.findByIdAndUpdate(
        tenant.flatId,
        { 
          tenantId: null,
          status: 'active' 
        },
        { new: true }
      );
    }

    // Mark tenant as inactive
    tenant.status = 'inactive';
    tenant.flatId = undefined;
    await tenant.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Tenant deactivated successfully',
        tenant
      },
    });
  } catch (error) {
    next(error);
  }
};

// Assign tenant to flat
// PUT /api/tenants/:id/assign-flat/:flatId
export const assignTenantToFlat = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is tenant owner
    if (tenant.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to assign flat to this tenant`, 401));
    }

    // Validate the flatId
    const flat = await Flat.findById(req.params.flatId).populate('houseId');

    if (!flat) {
      return next(new ErrorResponse(`Flat not found with id of ${req.params.flatId}`, 404));
    }

    const house = flat.houseId as any;

    // Make sure user is house owner
    if (house.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to assign tenants to this flat`, 401));
    }

    // Check if flat already has a tenant
    if (flat.tenantId) {
      return next(new ErrorResponse(`Flat already has a tenant assigned`, 400));
    }

    // Update tenant and flat
    tenant.flatId = flat._id as mongoose.Schema.Types.ObjectId;
    tenant.status = 'active'; 
    flat.tenantId = tenant._id as mongoose.Schema.Types.ObjectId;
    flat.status = 'occupied'; 

    await tenant.save();
    await flat.save();

    res.status(200).json({
      success: true,
      data: tenant,
      flat
    });
  } catch (error) {
    next(error);
  }
};