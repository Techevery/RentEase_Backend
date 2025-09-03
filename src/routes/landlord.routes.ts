import express from 'express';
import { 
  createManager, 
  getManagers, 
  getManager,
  updateManager,
  deleteManager
} from '../controllers/landlord.controller';
import { getDashboardStats } from '../controllers/landlord.dashboard.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { validateCreateManager } from '../middleware/validation.middleware';

const router = express.Router();


router.use(protect);
router.use(authorize(UserRole.LANDLORD));


router.get('/dashboard', getDashboardStats);


router.route('/managers')
  .get(getManagers)
  .post(validateCreateManager, createManager);

router.route('/managers/:id')
  .get(getManager)
  .put(updateManager)
  .delete(deleteManager);

export default router;