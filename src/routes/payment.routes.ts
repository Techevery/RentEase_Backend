import express from 'express';
import { 
  createPayment,
  getPayments,
  getPayment,
  approvePayment,
  rejectPayment,
  getTenantPaymentSummary 
} from '../controllers/payment.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { paymentUpload } from '../config/cloudinary';
import { validateCreatePayment} from '../middleware/validation.middleware';
import { get } from 'https';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

router.route('/')
  .get(authorize(UserRole.LANDLORD,UserRole.MANAGER), getPayments)
  .post(
    authorize(UserRole.MANAGER, UserRole.LANDLORD),
    paymentUpload.single('receipt'),
    validateCreatePayment,
    createPayment
  );

router.route('/:id')
  .get(authorize(UserRole.LANDLORD, UserRole.MANAGER), getPayment)
 

  router.get(
  '/tenant/:id/summary', 
  authorize(UserRole.LANDLORD, UserRole.MANAGER),
  getTenantPaymentSummary
);
router.put(
  '/:id/approve', 
  authorize(UserRole.LANDLORD), 
  approvePayment
);

router.put(
  '/:id/reject', 
  authorize(UserRole.LANDLORD),
  rejectPayment
);

router.post(
  '/send-reminders',
  authorize(UserRole.LANDLORD),
 
);

export default router;