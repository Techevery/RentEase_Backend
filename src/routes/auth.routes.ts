import express from 'express';
import { register, login, getMe, forgotPassword, resetPassword, updatePassword } from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';
import { validateLogin, validateRegistration, validatePasswordReset } from '../middleware/validation.middleware';
import { updateMe } from '../controllers/auth.controller';


const router = express.Router();

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', validatePasswordReset, resetPassword);
router.put('/updatepassword', protect, updatePassword);
router.put('/update-me', protect, updateMe);


export default router;