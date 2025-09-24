import express from 'express';
import { 
  createHouse,
  getHouses,
  getHouse,
  updateHouse,
  deleteHouse,
  createFlat,
  getFlats,
  getFlat,
  updateFlat,
  deleteFlat,
  getTenantsInHouse

} from '../controllers/property.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.model';
import { validateCreateHouse, validateCreateFlat } from '../middleware/validation.middleware';
import { propertyUpload } from '../config/cloudinary';
import { unitUpload,multiParser } from '../config/cloudinary';
import { deleteFromCloudinary } from '../config/cloudinary';

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Houses routes
router.route('/houses')
  .get(authorize(UserRole.LANDLORD,UserRole.MANAGER),getHouses)
  .post(authorize(UserRole.LANDLORD),propertyUpload.array("images", 10), validateCreateHouse, createHouse,deleteFromCloudinary);

router.route('/houses/:id')
  .get(authorize(UserRole.LANDLORD,UserRole.MANAGER), getHouse)
  .put(authorize(UserRole.LANDLORD),  multiParser.fields([
  { name: 'images', maxCount: 10 },
  { name: 'existingImages' }
]), updateHouse)
  .delete(authorize(UserRole.LANDLORD), deleteHouse);

  router.get(
  '/houses/:houseId/tenants',
  authorize(UserRole.LANDLORD, UserRole.MANAGER),
  getTenantsInHouse
);

// Flats routes
router.route('/houses/:houseId/flats')
  .get(getFlats)
  .post(authorize(UserRole.LANDLORD),  unitUpload.array("images", 10),validateCreateFlat, createFlat, deleteFromCloudinary);

router.route('/flats/:id')
  .get(getFlat)
  .put(authorize(UserRole.LANDLORD,UserRole.MANAGER), updateFlat, deleteFromCloudinary)
  .delete(authorize(UserRole.LANDLORD), deleteFlat);                      

export default router;