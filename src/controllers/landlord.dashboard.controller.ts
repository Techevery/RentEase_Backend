import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User, { UserRole } from '../models/user.model';
import { House, Flat } from '../models/property.model';
import Payment, { PaymentStatus } from '../models/payment.model';
import Expense, { ExpenseStatus } from '../models/expense.model';
import Tenant from '../models/tenant.model'
import Manager from '../models/manager.model';;
import { ErrorResponse } from '../utils/errorResponse';

// Get landlord dashboard stats
// GET /api/landlords/dashboard

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    const housesCount = await House.countDocuments({ landlordId: req.user.id });
    const flatsCount = await Flat.countDocuments({ houseId: { $in: (await House.find({ landlordId: req.user.id })).map(h => h._id) } });
    const tenantsCount = await Tenant.countDocuments({ landlordId: req.user.id });
 const managersCount = await Manager.countDocuments({ landlordId: req.user.id });
    
    // Get payment stats
    const pendingPayments = await Payment.countDocuments({ 
      landlordId: req.user.id, 
      status: PaymentStatus.PENDING 
    });
    
    const approvedPayments = await Payment.countDocuments({ 
      landlordId: req.user.id, 
      status: PaymentStatus.APPROVED 
    });
    
    const rejectedPayments = await Payment.countDocuments({ 
      landlordId: req.user.id, 
      status: PaymentStatus.REJECTED 
    });
    
    // Get expense stats
    const pendingExpenses = await Expense.countDocuments({ 
      landlordId: req.user.id, 
      status: ExpenseStatus.PENDING 
    });
    
    const approvedExpenses = await Expense.countDocuments({ 
      landlordId: req.user.id, 
      status: ExpenseStatus.APPROVED 
    });
    
    const rejectedExpenses = await Expense.countDocuments({ 
      landlordId: req.user.id, 
      status: ExpenseStatus.REJECTED 
    });
    
    // Get financial overview
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    // Get current month income
    const monthlyPayments = await Payment.find({
      landlordId: req.user.id,
      status: PaymentStatus.APPROVED,
      paymentDate: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    });
    
    const monthlyExpenses = await Expense.find({
      landlordId: req.user.id,
      status: ExpenseStatus.APPROVED,
      expenseDate: {
        $gte: firstDayOfMonth,
        $lte: lastDayOfMonth
      }
    });
    
    const monthlyIncome = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const monthlyExpenseTotal = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyNetIncome = monthlyIncome - monthlyExpenseTotal;
    
    // Calculate occupancy rate
    const occupiedFlatsCount = await Flat.countDocuments({ 
      houseId: { $in: (await House.find({ landlordId: req.user.id })).map(h => h._id) },
      tenantId: { $ne: null }
    });
    
    const occupancyRate = flatsCount > 0 ? (occupiedFlatsCount / flatsCount) * 100 : 0;
    
    // Get recent activities
    const recentPayments = await Payment.find({ landlordId: req.user.id })
      .sort('-createdAt')
      .limit(5)
      .populate([
        { path: 'tenantId', select: 'name' },
        { path: 'flatId', select: 'number' },
        { path: 'houseId', select: 'name' },
        { path: 'managerId', select: 'name' }
      ]);
    
    const recentExpenses = await Expense.find({ landlordId: req.user.id })
      .sort('-createdAt')
      .limit(5)
      .populate([
        { path: 'flatId', select: 'number' },
        { path: 'houseId', select: 'name' },
        { path: 'managerId', select: 'name' }
      ]);
    
    // Get unread notifications count
    
    
    res.status(200).json({
      success: true,
      data: {
        propertyCounts: {
          houses: housesCount,
          flats: flatsCount,
          tenants: tenantsCount,
          managers: managersCount,
          occupancyRate: parseFloat(occupancyRate.toFixed(2))
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
        financialOverview: {
          currentMonth: {
            income: monthlyIncome,
            expenses: monthlyExpenseTotal,
            netIncome: monthlyNetIncome
          }
        },
       
        recentActivity: {
          payments: recentPayments,
          expenses: recentExpenses
        }
      }
    });
  } catch (error) {
    next(error);
  }
};