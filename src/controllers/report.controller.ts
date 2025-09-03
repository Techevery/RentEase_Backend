import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ErrorResponse } from '../utils/errorResponse';
import Payment, { PaymentStatus } from '../models/payment.model';
import Expense, { ExpenseStatus, ExpenseCategory } from '../models/expense.model';
import { House } from '../models/property.model';
import mongoose from 'mongoose';

// Get financial summary for all properties
// GET /api/reports/financial-summary
export const getFinancialSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get all approved payments for landlord's properties
    const approvedPayments = await Payment.find({
      landlordId: req.user.id,
      status: PaymentStatus.APPROVED
    });

    // Get all approved expenses for landlord's properties
    const approvedExpenses = await Expense.find({
      landlordId: req.user.id,
      status: ExpenseStatus.APPROVED
    });

    // Calculate totals
    const totalRevenue = approvedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpenses = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    // Calculate monthly breakdown
    const currentDate = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

    const monthlyRevenue = approvedPayments
      .filter(payment => payment.paymentDate >= sixMonthsAgo)
      .reduce((acc, payment) => {
        const monthYear = payment.paymentDate.toISOString().slice(0, 7); // YYYY-MM
        if (!acc[monthYear]) acc[monthYear] = 0;
        acc[monthYear] += payment.amount;
        return acc;
      }, {} as Record<string, number>);

    const monthlyExpenses = approvedExpenses
      .filter(expense => expense.expenseDate >= sixMonthsAgo)
      .reduce((acc, expense) => {
        const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM
        if (!acc[monthYear]) acc[monthYear] = 0;
        acc[monthYear] += expense.amount;
        return acc;
      }, {} as Record<string, number>);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          totalExpenses: parseFloat(totalExpenses.toFixed(2)),
          netIncome: parseFloat(netIncome.toFixed(2)),
          profitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(2)) : 0
        },
        counts: {
          totalPayments: approvedPayments.length,
          totalExpenses: approvedExpenses.length
        },
        monthlyBreakdown: {
          revenue: monthlyRevenue,
          expenses: monthlyExpenses
        },
        timeframe: {
          from: sixMonthsAgo,
          to: currentDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get property performance breakdown
// GET /api/reports/property-performance
export const getPropertyPerformance = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get all properties for the landlord
    const properties = await House.find({ landlordId: req.user.id });

    const propertyPerformance = await Promise.all(
      properties.map(async (property) => {
        // Get approved payments for this property
        const propertyPayments = await Payment.find({
          houseId: property._id,
          status: PaymentStatus.APPROVED
        });

        // Get approved expenses for this property
        const propertyExpenses = await Expense.find({
          houseId: property._id,
          status: ExpenseStatus.APPROVED
        });

        const totalRevenue = propertyPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenses = propertyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netIncome = totalRevenue - totalExpenses;

        // Get occupancy rate (assuming you have flats data)
        const flats = await mongoose.model('Flat').find({ houseId: property._id });
        const occupiedFlats = flats.filter(flat => flat.status === 'occupied').length;
        const occupancyRate = flats.length > 0 ? (occupiedFlats / flats.length) * 100 : 0;

        return {
          property: {
            id: property._id,
            name: property.name,
            address: property.address,
            totalFlats: property.totalFlats,
            occupiedFlats,
            occupancyRate: parseFloat(occupancyRate.toFixed(2))
          },
          financials: {
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalExpenses: parseFloat(totalExpenses.toFixed(2)),
            netIncome: parseFloat(netIncome.toFixed(2)),
            profitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(2)) : 0
          },
          counts: {
            payments: propertyPayments.length,
            expenses: propertyExpenses.length
          }
        };
      })
    );

    // Sort by net income (highest first)
    propertyPerformance.sort((a, b) => b.financials.netIncome - a.financials.netIncome);

    res.status(200).json({
      success: true,
      data: propertyPerformance,
      summary: {
        totalProperties: properties.length,
        averageOccupancyRate: propertyPerformance.length > 0 
          ? parseFloat((propertyPerformance.reduce((sum, prop) => sum + prop.property.occupancyRate, 0) / properties.length).toFixed(2))
          : 0,
        totalRevenueAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.totalRevenue, 0).toFixed(2)),
        totalExpensesAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.totalExpenses, 0).toFixed(2)),
        totalNetIncomeAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.netIncome, 0).toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get expenses breakdown by category
// GET /api/reports/expenses-breakdown
export const getExpensesBreakdown = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fromDate, toDate, propertyId } = req.query;

    // Build query
    let query: any = { 
      landlordId: req.user.id,
      status: ExpenseStatus.APPROVED
    };

    // Date range filter
    if (fromDate || toDate) {
      query.expenseDate = {};
      if (fromDate) query.expenseDate.$gte = new Date(fromDate as string);
      if (toDate) query.expenseDate.$lte = new Date(toDate as string);
    }

    // Property filter
    if (propertyId) {
      query.houseId = propertyId;
    }

    // Get all approved expenses with proper population
    const expenses = await Expense.find(query)
      .populate([
        { 
          path: 'houseId', 
          select: 'name address',
          match: { _id: { $exists: true } } // Ensure house exists
        },
        { 
          path: 'flatId', 
          select: 'number',
          match: { _id: { $exists: true } } // Ensure flat exists
        },
        { 
          path: 'managerId', 
          select: 'name email',
          match: { _id: { $exists: true } } // Ensure manager exists
        }
      ])
      .sort('-expenseDate');

    // Filter out expenses with null houseId after population
    const validExpenses = expenses.filter(expense => expense.houseId !== null);

    // Calculate category breakdown
    const categoryBreakdown = validExpenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalAmount: 0,
          averageAmount: 0,
          percentage: 0,
          expenses: []
        };
      }
      acc[category].count += 1;
      acc[category].totalAmount += expense.amount;
      acc[category].expenses.push(expense);
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; averageAmount: number; percentage: number; expenses: any[] }>);

    // Calculate total amount for percentages
    const totalAmount = validExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate averages and percentages
    Object.keys(categoryBreakdown).forEach(category => {
      categoryBreakdown[category].averageAmount = 
        categoryBreakdown[category].totalAmount / categoryBreakdown[category].count;
      categoryBreakdown[category].percentage = totalAmount > 0
        ? (categoryBreakdown[category].totalAmount / totalAmount) * 100
        : 0;
    });

    // Calculate monthly breakdown
    const monthlyBreakdown = validExpenses.reduce((acc, expense) => {
      const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM
      if (!acc[monthYear]) {
        acc[monthYear] = {
          totalAmount: 0,
          count: 0,
          byCategory: {} as Record<string, number>
        };
      }
      acc[monthYear].totalAmount += expense.amount;
      acc[monthYear].count += 1;
      
      // Category breakdown within month
      if (!acc[monthYear].byCategory[expense.category]) {
        acc[monthYear].byCategory[expense.category] = 0;
      }
      acc[monthYear].byCategory[expense.category] += expense.amount;
      
      return acc;
    }, {} as Record<string, { totalAmount: number; count: number; byCategory: Record<string, number> }>);

    // Get top expenses
    const topExpenses = [...validExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Get property-wise breakdown if no specific property filter
    let propertyBreakdown = {};
    if (!propertyId) {
      propertyBreakdown = validExpenses.reduce((acc, expense) => {
        const house = expense.houseId as any;
        if (!house || !house._id) return acc; // Skip if house is null
        
        const propertyId = house._id.toString();
        const propertyName = house.name || 'Unknown Property';
        
        if (!acc[propertyId]) {
          acc[propertyId] = {
            name: propertyName,
            totalAmount: 0,
            count: 0,
            byCategory: {} as Record<string, number>
          };
        }
        acc[propertyId].totalAmount += expense.amount;
        acc[propertyId].count += 1;
        
        // Category breakdown within property
        if (!acc[propertyId].byCategory[expense.category]) {
          acc[propertyId].byCategory[expense.category] = 0;
        }
        acc[propertyId].byCategory[expense.category] += expense.amount;
        
        return acc;
      }, {} as Record<string, { name: string; totalAmount: number; count: number; byCategory: Record<string, number> }>);
    }

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalExpenses: validExpenses.length,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          averageExpense: validExpenses.length > 0 ? parseFloat((totalAmount / validExpenses.length).toFixed(2)) : 0
        },
        categoryBreakdown: Object.entries(categoryBreakdown)
          .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
          .reduce((acc, [category, data]) => {
            acc[category] = {
              ...data,
              totalAmount: parseFloat(data.totalAmount.toFixed(2)),
              averageAmount: parseFloat(data.averageAmount.toFixed(2)),
              percentage: parseFloat(data.percentage.toFixed(2))
            };
            return acc;
          }, {} as Record<string, any>),
        monthlyBreakdown,
        propertyBreakdown,
        topExpenses: topExpenses.map(expense => {
          const house = expense.houseId as any;
          const flat = expense.flatId as any;
          const manager = expense.managerId as any;
          
          return {
            id: expense._id,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            vendor: expense.vendor,
            expenseDate: expense.expenseDate,
            property: house?.name || 'Unknown Property',
            flat: flat?.number || 'N/A',
            manager: manager?.name || 'Unknown Manager'
          };
        }),
        allExpenses: validExpenses.map(expense => {
          const house = expense.houseId as any;
          const flat = expense.flatId as any;
          const manager = expense.managerId as any;
          
          return {
            id: expense._id,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            vendor: expense.vendor,
            expenseDate: expense.expenseDate,
            property: house?.name || 'Unknown Property',
            flat: flat?.number || 'N/A',
            manager: manager?.name || 'Unknown Manager'
          };
        })
      },
      filters: {
        fromDate: fromDate || 'All time',
        toDate: toDate || 'All time',
        propertyId: propertyId || 'All properties'
      },
      warnings: expenses.length !== validExpenses.length 
        ? `Filtered out ${expenses.length - validExpenses.length} expenses with missing property data`
        : undefined
    });
  } catch (error) {
    next(error);
  }
};