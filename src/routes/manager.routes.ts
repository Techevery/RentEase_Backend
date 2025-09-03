import express from 'express';
import { 
  getManagedProperties,
  getManagedTenants,
  getDashboardStats,
  getTenantDetails,
} from '../controllers/manager.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';

const router = express.Router();


router.use(protect);
router.use(authorize(UserRole.MANAGER, UserRole.LANDLORD));


router.get('/properties', getManagedProperties);

router.get('/tenants', getManagedTenants);
router.get('/tenants/:id', getTenantDetails);


router.get('/dashboard', getDashboardStats);

export default router;