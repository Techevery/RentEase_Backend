import express from 'express';
import { 
 getFinancialSummary,
getPropertyPerformance,
getExpensesBreakdown,


} from '../controllers/report.controller';
import { UserRole } from '../models/user.model';
import { protect, authorize } from '../middleware/auth.middleware';

const router = express.Router();
router.use(protect);

router.get('/financial', authorize(UserRole.LANDLORD),  getFinancialSummary);
router.get('/property-performance',  authorize(UserRole.LANDLORD),getPropertyPerformance);
router.get('/expense-category-breakdown',  authorize(UserRole.LANDLORD),getExpensesBreakdown);


export default router;