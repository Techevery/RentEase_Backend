import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Payment, { PaymentStatus } from '../models/payment.model';
import Tenant from '../models/tenant.model';
import { Flat, House } from '../models/property.model';
import { IFlat, IHouse } from '../models/property.model';
import { ErrorResponse } from '../utils/errorResponse';
import { deleteFromCloudinary } from '../config/cloudinary';
import { UserRole } from '../models/user.model';
import { sendPaymentReminderEmail } from '../utils/emailService';


// Upload tenant payment (by manager)
// POST /api/payments
export const createPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { flatId, amount, paymentDate, dueDate, paymentMethod, description, paymentTypes } = req.body;
    const flat = await Flat.findById(flatId).populate('houseId');
    if (!flat) {
      return next(new ErrorResponse(`Flat not found with id of ${flatId}`, 404));
    }
    if (!flat.tenantId) {
      return next(new ErrorResponse(`No tenant assigned to this flat`, 400));
    }

    const tenant = await Tenant.findById(flat.tenantId);
    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found`, 404));
    }

    const house = flat.houseId as any;

    // Validate payment types
    const validPaymentTypes = ['Rent', 'Service Charge', 'Caution', 'Agency', 'Legal'];
    let selectedPaymentTypes = [];
    
    if (paymentTypes) {
      if (typeof paymentTypes === 'string') {
        selectedPaymentTypes = [paymentTypes];
      } else if (Array.isArray(paymentTypes)) {
        selectedPaymentTypes = paymentTypes;
      }
      
      // Validate each payment type
      for (const type of selectedPaymentTypes) {
        if (!validPaymentTypes.includes(type)) {
          return next(new ErrorResponse(`Invalid payment type: ${type}`, 400));
        }
      }
    }
    
    // If no payment types specified, default to Rent
    if (selectedPaymentTypes.length === 0) {
      selectedPaymentTypes = ['Rent'];
    }

    // Add file upload details if present
    const payment = await Payment.create({
      amount,
      paymentDate,
      dueDate,
      paymentMethod,
      description,
      paymentTypes: selectedPaymentTypes,
      tenantId: flat.tenantId, // Use tenant from flat
      flatId,
      houseId: house._id,
      managerId: req.user.id,
      landlordId: house.landlordId,
      status: PaymentStatus.PENDING,
      receiptUrl: req.file?.path || null,
      receiptPublicId: req.file?.filename || null,
      reference: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Get all payments
// GET /api/payments

export const getPayments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let query: any;

    // For landlords, get all payments for their properties
    if (req.user.role === 'landlord') {
      query = Payment.find({ landlordId: req.user.id });
    } 
    // For managers, get payments for properties they manage
    else if (req.user.role === 'manager') {
      query = Payment.find({ managerId: req.user.id });
    } else {
      return next(new ErrorResponse('Unauthorized access', 401));
    }

    // Add filters
    if (req.query.status) {
      query = query.find({ status: req.query.status });
    }

    if (req.query.tenantId) {
      query = query.find({ tenantId: req.query.tenantId });
    }

    if (req.query.flatId) {
      query = query.find({ flatId: req.query.flatId });
    }

    if (req.query.houseId) {
      query = query.find({ houseId: req.query.houseId });
    }

    // Add date filters
    if (req.query.fromDate) {
      query = query.find({ 
        paymentDate: { 
          $gte: new Date(req.query.fromDate as string) 
        } 
      });
    }

    if (req.query.toDate) {
      query = query.find({ 
        paymentDate: { 
          $lte: new Date(req.query.toDate as string) 
        } 
      });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-paymentDate');
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Payment.countDocuments(query.getQuery());

    query = query.skip(startIndex).limit(limit);

    // Add population
    query = query.populate([
      { path: 'tenantId', select: 'name email phone' },
      { path: 'flatId', select: 'number rentAmount' },
      { path: 'houseId', select: 'name address' },
      { path: 'managerId', select: 'name email' },
    ]);

    // Execute query
    const payments = await query;

    // Pagination result
    const pagination: any = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit,
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit,
      };
    }

    res.status(200).json({
      success: true,
      count: payments.length,
      pagination,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

//  Get single payment
//  GET /api/payments/:id

export const getPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id).populate([
      { path: 'tenantId', select: 'name email phone' },
      { path: 'flatId', select: 'number rentAmount' },
      { path: 'houseId', select: 'name address' },
      { path: 'managerId', select: 'name email' },
    ]);

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is authorized
    if (
      payment.landlordId.toString() !== req.user.id &&
      payment.managerId.toString() !== req.user.id
    ) {
      return next(new ErrorResponse(`User not authorized to access this payment`, 401));
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// Approve payment (by landlord)
// PUT /api/payments/:id/approve
export const approvePayment = async (
  req: AuthRequest, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is landlord
    if (payment.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to approve this payment`, 401));
    }

    // Make sure payment is in pending status
    if (payment.status !== PaymentStatus.PENDING) {
      return next(new ErrorResponse(`Payment is not in pending status`, 400));
    }

    // Update payment status
    payment.status = PaymentStatus.APPROVED;
    payment.approvedAt = new Date();
    await payment.save();

    // Get tenant and flat details for notification
    const tenant = await Tenant.findById(payment.tenantId);
    const flat = await Flat.findById(payment.flatId).populate('houseId');
    
    if (!tenant || !flat) {
      return next(new ErrorResponse(`Tenant or flat data not found`, 404));
    }

    const house = flat.houseId as any;

   
    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

//  Reject payment (by landlord)
// PUT /api/payments/:id/reject

export const rejectPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rejectionReason } = req.body;

    // if (!rejectionReason) {
    //   return next(new ErrorResponse('Please provide a reason for rejection', 400));
    // }

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return next(new ErrorResponse(`Payment not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is landlord
    if (payment.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to reject this payment`, 401));
    }

    // Make sure payment is in pending status
    if (payment.status !== PaymentStatus.PENDING) {
      return next(new ErrorResponse(`Payment is not in pending status`, 400));

    }

    // Update payment status
    payment.status = PaymentStatus.REJECTED;
    payment.rejectedAt = new Date();
    payment.rejectionReason = rejectionReason;
    await payment.save();

    // Get tenant and flat details for notification
    const tenant = await Tenant.findById(payment.tenantId);
    const flat = await Flat.findById(payment.flatId).populate('houseId');
    
    if (!tenant || !flat) {
      return next(new ErrorResponse(`Tenant or flat data not found`, 404));
    }

    const house = flat.houseId as any;


    // If there's a receipt, delete it from Cloudinary
    if (payment.receiptPublicId) {
      await deleteFromCloudinary(payment.receiptPublicId);
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};


// Get tenant payment summary with details and totals
// GET /api/payments/tenant/:tenantId/summary
export const getTenantPaymentSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
   const tenantId = req.params.id || req.query.tenantId;
    
    if (!tenantId) {
      return next(new ErrorResponse('Tenant ID parameter is required', 400));
    }
  
    const tenant = await Tenant.findById(tenantId)
      .populate([
        { 
          path: 'flat', 
          select: 'number houseId',
          populate: {
            path: 'houseId',
            select: 'name address'
          }
        },
        { 
          path: 'user', 
          select: 'name email phone' 
        }
      ]);

    if (!tenant) {
      return next(new ErrorResponse(`Tenant not found with id of ${tenantId}`, 404));
    }

    const payments = await Payment.find({ tenantId })
      .populate([
        { path: 'flatId', select: 'number' },
        { path: 'houseId', select: 'name address' },
        { path: 'managerId', select: 'name email' }
      ])
      .sort('-paymentDate');

    // Calculate summary statistics
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    
    const approvedPayments = payments.filter(p => p.status === PaymentStatus.APPROVED);
    const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDING);
    const rejectedPayments = payments.filter(p => p.status === PaymentStatus.REJECTED);
    
    const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRejectedAmount = rejectedPayments.reduce((sum, p) => sum + p.amount, 0);

    // Get payment method breakdown
    const paymentMethodBreakdown = payments.reduce((acc, payment) => {
      const method = payment.paymentMethod;
      if (!acc[method]) {
        acc[method] = { count: 0, totalAmount: 0 };
      }
      acc[method].count += 1;
      acc[method].totalAmount += payment.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number }>);

    // Get monthly breakdown
    const monthlyBreakdown = payments.reduce((acc, payment) => {
      const monthYear = payment.paymentDate.toISOString().substring(0, 7); // YYYY-MM format
      if (!acc[monthYear]) {
        acc[monthYear] = { count: 0, totalAmount: 0, payments: [] };
      }
      acc[monthYear].count += 1;
      acc[monthYear].totalAmount += payment.amount;
      acc[monthYear].payments.push(payment);
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; payments: any[] }>);

    // Get recent activity (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentPayments = payments.filter(p => 
      p.paymentDate >= sixMonthsAgo
    );

    // Format response
    const response = {
      success: true,
      data: {
        tenant: {
          id: tenant._id,
          name: tenant.name || tenant.name,
          email: tenant.email || tenant.email,
          phone: tenant.phone || tenant.phone,
          emergencyContact: tenant.emergencyContact,
          rentAmount: tenant.rentAmount,
          leaseStart: tenant.leaseStartDate,
          leaseEnd: tenant.leaseEndDate,
          status: tenant.status,
                  property: (tenant.flatId as any)?.houseId?.name || 'Unknown Property',
          propertyAddress: (tenant.flatId as any)?.houseId?.address || 'Unknown Address',
          unit: (tenant.flatId as any)?.number || 'Unknown Unit'
        },

        summary: {
          totalPayments,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          approved: {
            count: approvedPayments.length,
            amount: parseFloat(totalApprovedAmount.toFixed(2))
          },
          pending: {
            count: pendingPayments.length,
            amount: parseFloat(totalPendingAmount.toFixed(2))
          },
          rejected: {
            count: rejectedPayments.length,
            amount: parseFloat(totalRejectedAmount.toFixed(2))
          },
          averagePayment: totalPayments > 0 
            ? parseFloat((totalAmount / totalPayments).toFixed(2))
            : 0
        },
        paymentMethodBreakdown,
        monthlyBreakdown: Object.entries(monthlyBreakdown)
          .sort(([a], [b]) => b.localeCompare(a)) 
          .slice(0, 12) // Last 12 months
          .reduce((acc, [month, data]) => {
            acc[month] = {
              count: data.count,
              totalAmount: parseFloat(data.totalAmount.toFixed(2)),
              payments: data.payments.map(p => ({
                id: p._id,
                amount: p.amount,
                status: p.status,
                paymentDate: p.paymentDate,
                paymentMethod: p.paymentMethod,
                description: p.description
              }))
            };
            return acc;
          }, {} as Record<string, any>),
        recentActivity: {
          period: 'last-6-months',
          payments: recentPayments.map(payment => ({
            id: payment._id,
            amount: payment.amount,
            status: payment.status,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            description: payment.description,
           flat: (payment.flatId as any)?.number,
            property: (payment.houseId as any)?.name,
            uploadedBy: (payment.managerId as any)?.name || 'System',
            reference: payment.reference
          }))
        },
        allPayments: payments.map(payment => ({
          id: payment._id,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate,
          dueDate: payment.dueDate,
          paymentMethod: payment.paymentMethod,
          description: payment.description,
          reference: payment.reference,
          receiptUrl: payment.receiptUrl,
          approvedAt: payment.approvedAt,
          rejectedAt: payment.rejectedAt,
          rejectionReason: payment.rejectionReason,
        flat: (payment.flatId as any)?.number,
          property: (payment.houseId as any)?.name,
          uploadedBy: (payment.managerId as any)?.name || 'System',
          createdAt: payment.createdAt
        }))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};