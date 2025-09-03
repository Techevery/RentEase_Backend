import express from 'express';
import { 
  createExpense,
  getExpenses,
  getExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
  updateExpense,
  getPropertyExpensesSummary
} from '../controllers/expense.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { expenseUpload } from '../config/cloudinary';
import { validateCreateExpense } from '../middleware/validation.middleware';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getExpenses)

  .post(
    authorize(UserRole.MANAGER, UserRole.LANDLORD),
    expenseUpload.single('document'),
    validateCreateExpense,
    createExpense
  );

router.route('/:id/summary')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getPropertyExpensesSummary);

router.route('/:id')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getExpense)
   .put(updateExpense)
  .delete(deleteExpense)

router.put(
  '/:id/approve', 
  authorize(UserRole.LANDLORD), 
  approveExpense
);

router.put(
  '/:id/reject', 
  authorize(UserRole.LANDLORD),

  rejectExpense
);

export default router;