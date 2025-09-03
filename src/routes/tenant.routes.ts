import express from 'express';
import { 
  createTenant,
  getTenants,
  getTenant,
  updateTenant,
  deleteTenant,
  assignTenantToFlat,
  deactivateTenant
} from '../controllers/tenant.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { validateCreateTenant } from '../middleware/validation.middleware';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getTenants)
  .post(authorize(UserRole.LANDLORD), validateCreateTenant, createTenant);

router.route('/:id')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getTenant)
  .put(authorize(UserRole.LANDLORD), updateTenant)
  .delete(authorize(UserRole.LANDLORD), deleteTenant); // Handles both delete modes via query param

// New deactivation endpoint
router.put(
  '/:id/deactivate',
  authorize(UserRole.LANDLORD),
  deactivateTenant
);

// Tenant to flat assignment
router.put(
  '/:id/assign-flat/:flatId', 
  authorize(UserRole.LANDLORD, UserRole.MANAGER), 
  assignTenantToFlat
);

export default router;