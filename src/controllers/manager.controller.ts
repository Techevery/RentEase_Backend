import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User, { UserRole } from '../models/user.model';
import Tenant from '../models/tenant.model';
import { House, Flat } from '../models/property.model';
import Payment from '../models/payment.model';
import Expense from '../models/expense.model';
import { IUser } from '../models/user.model';
import { IFlat, IHouse } from '../models/property.model';
import { ErrorResponse } from '../utils/errorResponse';
import Manager from '../models/manager.model'; 
import mongoose from 'mongoose';
 
// Helper function to calculate next payment date
function calculateNextPaymentDate(leaseStartDate: Date, rentAmount: number): Date {
  if (!leaseStartDate) return new Date(); 
  
  const nextPayment = new Date(leaseStartDate);
  const today = new Date();
  
  while (nextPayment < today) {
    nextPayment.setMonth(nextPayment.getMonth() + 1);
  }
  
  return nextPayment;
}

function getPaymentStatus(
  lastPaymentDate: Date | null,
  nextPaymentDate: Date | null,
  lastPaymentStatus?: string
): string {
  const today = new Date();
  
  if (!lastPaymentDate) {
    return 'pending';
  }
  
  if (lastPaymentStatus === 'pending') {
    return 'pending';
  }
  
  if (nextPaymentDate && nextPaymentDate < today) {
    return 'late';
  }
  
  return 'current';
}

//  Get all properties managed by the manager
// GET /api/managers/properties

//  Get all properties managed by the manager
// GET /api/managers/properties

export const getManagedProperties = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get all houses managed by this user
    const houses = await House.find({ managerId: req.user.id })
      .select('_id name address managerId')
      .lean();

    // Get all flats managed by this user OR in houses managed by this user
    const flats = await Flat.find({
      $or: [
        { managerId: req.user.id },
        { houseId: { $in: houses.map(house => house._id) } }
      ]
    })
    .populate<{
      houseId: { _id: string; name: string; address: string };
      tenantId: { 
        _id: string;
        name?: string;
        email?: string;
        phone?: string;
        rentAmount?: number;
        leaseStartDate?: Date;
        leaseEndDate?: Date;
        status?: string;
        user?: { 
          name?: string; 
          email?: string; 
          phone?: string 
        };
      }
    }>([
      { path: 'houseId', select: 'name address' },
      { 
        path: 'tenantId', 
        select: 'name email phone rentAmount leaseStartDate leaseEndDate status',
        populate: { path: 'user', select: 'name email phone' }
      }
    ])
    .lean();

    // Update flats to ensure they have the correct managerId
    await Flat.updateMany(
      {
        houseId: { $in: houses.map(house => house._id) },
        managerId: { $ne: req.user.id }
      },
      { $set: { managerId: req.user.id } }
    );

    // Get unique house IDs from all managed flats (including those not directly managed by user)
    const allManagedHouseIds = [
      ...new Set([
        ...houses.map(house => house._id.toString()),
        ...flats.map(flat => flat.houseId?._id?.toString()).filter(Boolean)
      ])
    ];

    // Get complete house information for all managed properties
    const allManagedHouses = await House.find({
      _id: { $in: allManagedHouseIds }
    })
    .select('_id name address managerId')
    .lean();

    // Organize properties with their flats
    const propertiesWithTenants = allManagedHouses.map(house => {
      const houseFlats = flats.filter(flat => 
        flat.houseId && flat.houseId._id.toString() === house._id.toString()
      );

      return {
        _id: house._id,
        name: house.name || 'Unnamed Property',
        address: house.address || 'No address provided',
        managerId: house.managerId,
        flats: houseFlats.map(flat => ({
          _id: flat._id,
          number: flat.number || 'N/A',
          status: flat.status || 'unknown',
          size: flat.size || 'N/A',
          bedrooms: flat.bedrooms || 'N/A',
          bathrooms: flat.bathrooms || 'N/A',
          tenant: flat.tenantId ? {
            _id: flat.tenantId._id,
            name: flat.tenantId.user?.name || flat.tenantId.name || 'Unknown Tenant',
            email: flat.tenantId.user?.email || flat.tenantId.email || 'No email',
            phone: flat.tenantId.user?.phone || flat.tenantId.phone || 'No phone',
            rentAmount: flat.tenantId.rentAmount || 0,
            leaseStart: flat.tenantId.leaseStartDate || null,
            leaseEnd: flat.tenantId.leaseEndDate || null,
            status: flat.tenantId.status || 'unknown'
          } : null
        })),
        stats: {
          totalFlats: houseFlats.length,
          occupied: houseFlats.filter(f => f.tenantId).length,
          vacant: houseFlats.filter(f => !f.tenantId).length
        }
      };
    });

    // Ensure we include all houses even if they have no flats
    const allProperties = allManagedHouses.map(house => {
      const existingProperty = propertiesWithTenants.find(p => p._id.toString() === house._id.toString());
      
      if (existingProperty) {
        return existingProperty;
      }
      
      // Return property with empty flats array if no flats found
      return {
        _id: house._id,
        name: house.name || 'Unnamed Property',
        address: house.address || 'No address provided',
        managerId: house.managerId,
        flats: [],
        stats: {
          totalFlats: 0,
          occupied: 0,
          vacant: 0
        }
      };
    });

    res.status(200).json({
      success: true,
      data: {
        properties: allProperties,
        summary: {
          totalProperties: allManagedHouses.length,
          totalFlats: flats.length,
          totalOccupied: flats.filter(f => f.tenantId).length,
          totalVacant: flats.filter(f => !f.tenantId).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const managerId = req.user.id;

    // Get all house IDs managed by this manager in a single query
    const houseIds = (await House.find({ managerId }).select('_id').lean())
      .map(house => house._id);

    // Get all flat IDs in parallel with count
    const [flats, flatsCount] = await Promise.all([
      Flat.find({
        $or: [
          { managerId },
          { houseId: { $in: houseIds } }
        ]
      }).select('_id tenantId').lean(),
      Flat.countDocuments({
        $or: [
          { managerId },
          { houseId: { $in: houseIds } }
        ]
      })
    ]);

    const flatIds = flats.map(flat => flat._id);
    const tenantIds = flats.map(flat => flat.tenantId).filter(Boolean);

    // Execute all counts in parallel for better performance
    const [
      tenantsCount,
      pendingPayments,
      approvedPayments,
      rejectedPayments,
      pendingExpenses,
      approvedExpenses,
      rejectedExpenses,
      recentPayments,
      recentExpenses
    ] = await Promise.all([
      // Tenant count (more accurate using distinct tenant IDs)
      Tenant.countDocuments({ _id: { $in: tenantIds } }),
      
      // Payment stats
      Payment.countDocuments({ managerId, status: 'pending' }),
      Payment.countDocuments({ managerId, status: 'approved' }),
      Payment.countDocuments({ managerId, status: 'rejected' }),
      
      // Expense stats
      Expense.countDocuments({ managerId, status: 'pending' }),
      Expense.countDocuments({ managerId, status: 'approved' }),
      Expense.countDocuments({ managerId, status: 'rejected' }),
      
      // Recent payments with optimized projection
      Payment.find({ managerId })
        .sort('-createdAt')
        .limit(5)
        .select('amount status paymentDate dueDate description tenantId flatId houseId')
        .populate([
          { path: 'tenantId', select: 'name' },
          { path: 'flatId', select: 'number' },
          { path: 'houseId', select: 'name' }
        ])
        .lean(),
      
      // Recent expenses with optimized projection
      Expense.find({ managerId })
        .sort('-createdAt')
        .limit(5)
        .select('amount status expenseDate description flatId houseId')
        .populate([
          { path: 'flatId', select: 'number' },
          { path: 'houseId', select: 'name' }
        ])
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        propertyCounts: {
          houses: houseIds.length,
          flats: flatsCount,
          tenants: tenantsCount
        },
        paymentStats: { 
          pending: pendingPayments,
          approved: approvedPayments,
          rejected: rejectedPayments,
          total: pendingPayments + approvedPayments + rejectedPayments
        },
        expenseStats: {
          pending: pendingExpenses,
          approved: approvedExpenses,
          rejected: rejectedExpenses,
          total: pendingExpenses + approvedExpenses + rejectedExpenses
        },
        recentActivity: {
          payments: recentPayments.map(p => ({
            id: p._id,
            amount: p.amount,
            status: p.status,
            paymentDate: p.paymentDate,
            dueDate: p.dueDate,
            description: p.description,
            tenantId: p.tenantId,
            flatId: p.flatId,
            houseId: p.houseId
          })),
          expenses: recentExpenses.map(e => ({
            id: e._id,
            amount: e.amount,
            status: e.status,
            expenseDate: e.expenseDate,
            description: e.description,
            flatId: e.flatId,
            houseId: e.houseId
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};


//  Get all tenants managed by the manager with full details
// GET /api/managers/tenants

interface TenantInfo {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  emergencyContact?: any;
  rentAmount?: number;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  status?: string;
  user?: {
    name?: string;
    email?: string;
    phonenumber?: string;

  };
}


export const getManagedTenants = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // First get all properties managed by this manager
    const managedHouses = await House.find({ managerId: req.user.id })
      .select('_id name address')
      .lean();

    // Get all flats in these properties with populated tenant info
    const managedFlats = await Flat.find({
      $or: [
        { managerId: req.user.id },
        { houseId: { $in: managedHouses.map(h => h._id) } }
      ]
    })
    .populate<{ tenantId: TenantInfo }>({
      path: 'tenantId',
      select: 'name email phonenumber  emergencyContact rentAmount leaseStartDate leaseEndDate status',
      populate: {
        path: 'user',
        select: 'name email phonenumber '
      }
    })
    .populate<{ houseId: { _id: string; name?: string; address?: string } }>({
      path: 'houseId',
      select: 'name address'
    })
    .lean();

    // Filter out flats with tenants and get their IDs
    const flatsWithTenants = managedFlats.filter(flat => flat.tenantId);
    const tenantIds = flatsWithTenants.map(flat => flat.tenantId!._id);

    // Get payment info for all tenants in one query
    const lastPayments = await Payment.aggregate([
      { $match: { tenantId: { $in: tenantIds } } },
      { $sort: { paymentDate: -1 } },
      {
        $group: {
          _id: "$tenantId",
          lastPaymentDate: { $first: "$paymentDate" },
          lastPaymentAmount: { $first: "$amount" },
          lastPaymentStatus: { $first: "$status" }
        }
      }
    ]);

    // Map payment info for quick lookup
    const paymentMap = new Map(
      lastPayments.map(payment => [payment._id.toString(), payment])
    );

    // Prepare the response data
    const tenantsData = flatsWithTenants.map(flat => {
      const tenant = flat.tenantId!; 
      const paymentInfo = paymentMap.get(tenant._id.toString()) || {};
      const nextPaymentDate = tenant.leaseStartDate 
        ? calculateNextPaymentDate(tenant.leaseStartDate, tenant.rentAmount!)
        : null;

      return {
        id: tenant._id,
        name: tenant.user?.name || tenant.name,
        email: tenant.user?.email || tenant.email,
        phone: tenant.user?.phonenumber || tenant.phone,
        property: {
          id: flat.houseId?._id || '',
          name: flat.houseId?.name || 'Unknown Property',
          address: flat.houseId?.address
        },
        unit: {
          id: flat._id,
          number: flat.number,
        },
        leaseInfo: {
          start: tenant.leaseStartDate,
          end: tenant.leaseEndDate,
          rentAmount: tenant.rentAmount,
          status: tenant.status
        },
        paymentInfo: {
          lastPayment: paymentInfo.lastPaymentDate || null,
          lastAmount: paymentInfo.lastPaymentAmount || null,
          lastStatus: paymentInfo.lastPaymentStatus || 'none',
          nextPayment: nextPaymentDate,
          paymentStatus: getPaymentStatus(
            paymentInfo.lastPaymentDate,
            nextPaymentDate,
            paymentInfo.lastPaymentStatus
          )
        },
        emergencyContact: tenant.emergencyContact,
      };
    });

    res.status(200).json({
      success: true,
      count: tenantsData.length,
      data: tenantsData,
      summary: {
        totalProperties: managedHouses.length,
        totalUnits: managedFlats.length,
        occupiedUnits: tenantsData.length,
        vacantUnits: managedFlats.length - tenantsData.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single tenant details with payment history
//  GET /api/managers/tenants/:id
export const getTenantDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const manager = await Manager.findOne({ userId: req.user.id });
    
    if (!manager) {
      return next(new ErrorResponse('Manager not found', 404));
    }

    // Find the tenant and populate user info
    const tenant = await Tenant.findById(req.params.id)
      .populate<{ user: IUser }>('user', 'name email phone');

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
    }

    // Find the flat that this tenant occupies
    const flat = await Flat.findOne({ tenantId: tenant._id })
      .populate<{ houseId: IHouse }>({
        path: 'houseId',
        select: 'name address managerId'
      });

    // Verify that the manager has access to this tenant's property
    if (flat && flat.houseId && flat.houseId.managerId?.toString() !== req.user.id) {
      return next(new ErrorResponse('Not authorized to access this tenant', 403));
    }

    const payments = await Payment.find({ tenantId: tenant._id })
      .sort('-paymentDate')
      .populate([
        { path: 'flatId', select: 'number' },
        { path: 'houseId', select: 'name' }
      ]);

    const nextPaymentDate = tenant.leaseStartDate 
      ? calculateNextPaymentDate(tenant.leaseStartDate, tenant.rentAmount)
      : null;

    const tenantData = {
      id: tenant._id,
      name: tenant.user?.name || tenant.name,
      email: tenant.user?.email || tenant.email,
      phone: tenant.user?.phonenumber || tenant.phone,
      property: flat?.houseId?.name || 'Unknown Property',
      propertyAddress: flat?.houseId?.address || 'Unknown Address',
      propertyId: flat?.houseId?._id || null,
      unit: flat?.number || 'Unknown Unit',
      unitId: flat?._id || null,
      leaseStart: tenant.leaseStartDate,
      leaseEnd: tenant.leaseEndDate,
      rentAmount: tenant.rentAmount,
      status: tenant.status,
      nextPayment: nextPaymentDate,
      paymentHistory: payments,
      emergencyContact: tenant.emergencyContact,
      createdAt: tenant.createdAt
    };

    res.status(200).json({
      success: true,
      data: tenantData
    });
  } catch (error) {
    next(error);
  }
};