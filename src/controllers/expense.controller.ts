import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import Expense, { ExpenseStatus } from '../models/expense.model';
import { House, Flat } from '../models/property.model';
import { ErrorResponse } from '../utils/errorResponse';
import { deleteFromCloudinary } from '../config/cloudinary';


// Upload property expense (by manager)
// POST /api/expenses
export const createExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { houseId, flatId, amount, expenseDate, category, description, vendor } = req.body;
    const house = await House.findById(houseId);
    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${houseId}`, 404));
    }
    if (
    (!house.managerId || house.managerId.toString() !== req.user.id) &&
    (!house.landlordId || house.landlordId.toString() !== req.user.id)
  ) {
    return next(new ErrorResponse(`User not authorized to manage this house`, 401));
  }
    if (flatId) {
      const flat = await Flat.findById(flatId);
      
      if (!flat) {
        return next(new ErrorResponse(`Flat not found with id of ${flatId}`, 404));
      }
      
      if (flat.houseId.toString() !== houseId) {
        return next(new ErrorResponse(`Flat does not belong to the specified house`, 400));
      }
      
      if (!flat.managerId || flat.managerId.toString() !== req.user.id) {
        return next(new ErrorResponse(`Manager not authorized to manage this flat`, 401));
      }
    }

    // Check if user is landlord
    const isLandlord = house.landlordId && house.landlordId.toString() === req.user.id;

    const expense = await Expense.create({
      amount,
      expenseDate,
      category,
      description,
      houseId,
      vendor,
      flatId: flatId || null,
      managerId: req.user.id,
      landlordId: house.landlordId,
      // Automatically approve if added by landlord
      status: isLandlord ? ExpenseStatus.APPROVED : ExpenseStatus.PENDING,
      documentUrl: req.file?.path || null,
      documentPublicId: req.file?.filename || null,
      // Set approvedAt if approved by landlord
      approvedAt: isLandlord ? new Date() : null,
    });



    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// Get all expenses
// GET /api/expenses
export const getExpenses = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let query: any;
    if (req.user.role === 'landlord') {
  query = Expense.find({ 
    landlordId: req.user.id,
    houseId: { $exists: true, $ne: null } 
  });
} 

   else if (req.user.role === 'manager') {
  query = Expense.find({ 
    managerId: req.user.id,
    houseId: { $exists: true, $ne: null } 
  });
}

    if (req.query.status) {
      query = query.find({ status: req.query.status });
    }

    if (req.query.category) {
      query = query.find({ category: req.query.category });
    }

    if (req.query.houseId) {
      query = query.find({ houseId: req.query.houseId });
    }

    if (req.query.flatId) {
      query = query.find({ flatId: req.query.flatId });
    }

   
    if (req.query.fromDate) {
      query = query.find({ 
        expenseDate: { 
          $gte: new Date(req.query.fromDate as string) 
        } 
      });
    }

    if (req.query.toDate) {
      query = query.find({ 
        expenseDate: { 
          $lte: new Date(req.query.toDate as string) 
        } 
      });
    }

    // Sorting
    if (req.query.sort) {
      const sortBy = (req.query.sort as string).split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-expenseDate');
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Expense.countDocuments(query.getQuery());

    query = query.skip(startIndex).limit(limit);

    
    query = query.populate([
      { path: 'houseId', select: 'name address' },
      { path: 'flatId', select: 'number' },
      { path: 'managerId', select: 'name email' },
    ]);

   
    const expenses = await query;
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
      count: expenses.length,
      pagination,
      data: expenses,
    });
  } catch (error) {
    next(error);
  }
};

// Get single expense
// GET /api/expenses/:id

export const getExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = await Expense.findById(req.params.id).populate([
      { path: 'houseId', select: 'name address' },
      { path: 'flatId', select: 'number' },
      { path: 'managerId', select: 'name email' },
    ]);

    if (!expense) {
      return next(new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
    }

    if (
      expense.landlordId.toString() !== req.user.id &&
      expense.managerId.toString() !== req.user.id
    ) {
      return next(new ErrorResponse(`User not authorized to access this expense`, 401));
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// Approve expense (by landlord)
// PUT /api/expenses/:id/approve

export const approveExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is landlord
    if (expense.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to approve this expense`, 401));
    }

    // Make sure expense is in pending status
    if (expense.status !== ExpenseStatus.PENDING) {
      return next(new ErrorResponse(`Expense is not in pending status`, 400));
    }

    // Update expense status
    expense.status = ExpenseStatus.APPROVED;
    expense.approvedAt = new Date();
    await expense.save();

   
    const house = await House.findById(expense.houseId);
    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${expense.houseId}`, 404));
    }

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

// Reject expense (by landlord)
// PUT /api/expenses/:id/reject
export const rejectExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rejectionReason } = req.body;

    // if (!rejectionReason) {
    //   return next(new ErrorResponse('Please provide a reason for rejection', 400));
    // }

    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is landlord
    if (expense.landlordId.toString() !== req.user.id) {
      return next(new ErrorResponse(`User not authorized to reject this expense`, 401));
    }

   
    if (expense.status !== ExpenseStatus.PENDING) {
      return next(new ErrorResponse(`Expense is not in pending status`, 400));
    }

    // Update expense status
    expense.status = ExpenseStatus.REJECTED;
    expense.rejectedAt = new Date();
    expense.rejectionReason = rejectionReason;
    await expense.save();

 
    const house = await House.findById(expense.houseId);
    if (!house) {
      return next(new ErrorResponse(`House not found with id of ${expense.houseId}`, 404));

      
    }
    
    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

//  Delete expense
//   DELETE /api/expenses/:id
export const deleteExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return next(new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
    }

    // Authorization check
    if (
      expense.landlordId.toString() !== req.user.id &&
      expense.managerId?.toString() !== req.user.id
    ) {
      return next(new ErrorResponse(`User not authorized to delete this expense`, 401));
    }

    // Delete document from Cloudinary if exists
    if (expense.documentPublicId) {
      await deleteFromCloudinary(expense.documentPublicId);
    }

    await expense.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
// Update expense
// PUT /api/expenses/:id
export const updateExpense = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount, expenseDate, category, description, vendor, houseId, flatId } = req.body;

    // Find the expense
    let expense = await Expense.findById(req.params.id);
    if (!expense) {
      return next(new ErrorResponse(`Expense not found with id of ${req.params.id}`, 404));
    }

    
    if (expense.managerId.toString() !== req.user.id) {
      return next(new ErrorResponse(`Not authorized to update this expense`, 401));
    }

  
    if (expense.status !== ExpenseStatus.PENDING) {
      return next(new ErrorResponse(`Only pending expenses can be updated`, 400));
    }

  
    expense.amount = amount || expense.amount;
    expense.expenseDate = expenseDate || expense.expenseDate;
    expense.category = category || expense.category;
    expense.description = description || expense.description;
    expense.vendor = vendor || expense.vendor;

   
    if (houseId && houseId !== expense.houseId.toString()) {
      const house = await House.findById(houseId);
      if (!house) {
        return next(new ErrorResponse(`House not found with id of ${houseId}`, 404));
      }
      expense.houseId = houseId;
      expense.landlordId = house.landlordId;
    }

    if (flatId !== undefined) {
      if (flatId) {
        const flat = await Flat.findById(flatId);
        if (!flat) {
          return next(new ErrorResponse(`Flat not found with id of ${flatId}`, 404));
        }
        if (flat.houseId.toString() !== expense.houseId.toString()) {
          return next(new ErrorResponse(`Flat does not belong to the expense's house`, 400));
        }
        expense.flatId = flatId;
      } else {
        expense.flatId = undefined;
      }
    }

    if (req.file) {
      if (expense.documentPublicId) {
        await deleteFromCloudinary(expense.documentPublicId);
      }
      expense.documentUrl = req.file.path;
      expense.documentPublicId = req.file.filename;
    }

    await expense.save();

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};



// Get expenses summary for a particular property
// GET /api/expenses/property/:propertyId/summary
export const getPropertyExpensesSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const  propertyId  = req.params.id || req.query.propertyId;

    const { fromDate, toDate, category } = req.query;

    // Validate property exists and user has access
    const house = await House.findById(propertyId);
    if (!house) {
      return next(new ErrorResponse(`Property not found with id of ${propertyId}`, 404));
    }

    // Authorization check
    if (
      house.landlordId.toString() !== req.user.id &&
      (!house.managerId || house.managerId.toString() !== req.user.id)
    ) {
      return next(new ErrorResponse(`User not authorized to access expenses for this property`, 401));
    }

    // Build query
    let query: any = { houseId: propertyId };

    // Date range filter
    if (fromDate || toDate) {
      query.expenseDate = {};
      if (fromDate) query.expenseDate.$gte = new Date(fromDate as string);
      if (toDate) query.expenseDate.$lte = new Date(toDate as string);
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Get all expenses for the property
    const expenses = await Expense.find(query)
      .populate([
        { path: 'flatId', select: 'number' },
        { path: 'managerId', select: 'name email' }
      ])
      .sort('-expenseDate');

    // Calculate summary
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate breakdown by category
    const categoryBreakdown = expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = {
          count: 0,
          totalAmount: 0,
          percentage: 0
        };
      }
      acc[category].count += 1;
      acc[category].totalAmount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; percentage: number }>);

    // Calculate percentages
    Object.keys(categoryBreakdown).forEach(category => {
      categoryBreakdown[category].percentage = 
        (categoryBreakdown[category].totalAmount / totalAmount) * 100;
    });

    // Calculate breakdown by status
    const statusBreakdown = expenses.reduce((acc, expense) => {
      const status = expense.status;
      if (!acc[status]) {
        acc[status] = {
          count: 0,
          totalAmount: 0,
          percentage: 0
        };
      }
      acc[status].count += 1;
      acc[status].totalAmount += expense.amount;
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; percentage: number }>);

    // Calculate percentages for status
    Object.keys(statusBreakdown).forEach(status => {
      statusBreakdown[status].percentage = 
        (statusBreakdown[status].totalAmount / totalAmount) * 100;
    });

    // Calculate monthly breakdown
    const monthlyBreakdown = expenses.reduce((acc, expense) => {
      const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM format
      if (!acc[monthYear]) {
        acc[monthYear] = {
          count: 0,
          totalAmount: 0,
          expenses: []
        };
      }
      acc[monthYear].count += 1;
      acc[monthYear].totalAmount += expense.amount;
      acc[monthYear].expenses.push(expense);
      return acc;
    }, {} as Record<string, { count: number; totalAmount: number; expenses: any[] }>);

    // Get top expenses
    const topExpenses = [...expenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: {
        property: {
          id: house._id,
          name: house.name,
          address: house.address
        },
        summary: {
          totalExpenses: expenses.length,
          totalAmount,
          averageExpense: expenses.length > 0 ? totalAmount / expenses.length : 0,
          pendingExpenses: expenses.filter(e => e.status === ExpenseStatus.PENDING).length,
          approvedExpenses: expenses.filter(e => e.status === ExpenseStatus.APPROVED).length,
          rejectedExpenses: expenses.filter(e => e.status === ExpenseStatus.REJECTED).length
        },
        breakdown: {
          byCategory: categoryBreakdown,
          byStatus: statusBreakdown,
          monthly: monthlyBreakdown
        },
        topExpenses,
        allExpenses: expenses
      }
    });
  } catch (error) {
    next(error);
  }
};