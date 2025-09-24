import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import User, { UserRole } from '../models/user.model';
import { ErrorResponse } from '../utils/errorResponse';
import { generateRandomPassword } from '../utils/passwordGenerator';
import { sendManagerInviteEmail } from '../utils/emailService';
import Manager from '../models/manager.model';

// Create a new manager
// POST /api/landlords/managers
export const createManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, phone } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse('Email already in use', 400));
    }
    const password = generateRandomPassword();
    const user = await User.create({
      name,
      phonenumber:phone,
      email,
      password,
      role: UserRole.MANAGER,
    });
    

     const manager =await Manager.create({
      userId: user._id,
      landlordId: req.user._id 
    })
   
    await sendManagerInviteEmail(email, password, name);

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: 'Manager created successfully. Credentials sent via email.',
    });
  } catch (error) {
    next(error);
  }
};

// Get all managers created by landlord
// GET /api/landlords/managers
export const getManagers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    console.log({id:req.user._id})

    const managerRecords = await Manager.find({ landlordId: req.user._id });
    console.log({managerRecords})


     const managerUserIds = managerRecords.map(record => record.userId);


    const managers = await User.find({
      _id: { $in: managerUserIds },
      role: UserRole.MANAGER
    });

    res.status(200).json({
      success: true,
      count: managers.length,
      data: managers,
    });
  } catch (error) {
    next(error);
  }
};

// Get single manager
// GET /api/landlords/managers/:id
export const getManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    const managerRecord = await Manager.findOne({
      userId: req.params.id,
      landlordId: req.user._id
    });

    if (!managerRecord) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }

    const manager = await User.findById(req.params.id);
   

    if (!manager) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }
    if (manager.role !== UserRole.MANAGER) {
      return next(new ErrorResponse(`User is not a manager`, 400));
    }

    res.status(200).json({
      success: true,
      data: manager,
    });
  } catch (error) {
    next(error);
  }
};

// Update manager
// PUT /api/landlords/managers/:id
export const updateManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email } = req.body;

    const managerRecord = await Manager.findOne({
      userId: req.params.id,
      landlordId: req.user._id
    });

    if (!managerRecord) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }

    const manager = await User.findById(req.params.id);

    if (!manager) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }

    if (manager.role !== UserRole.MANAGER) {
      return next(new ErrorResponse(`User is not a manager`, 400));
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== manager.email) {
      const existingUser = await User.findOne({ email });
      
      // Fix: Proper type checking for _id comparison
      if (existingUser && existingUser.id.toString() !== req.params.id.toString()) {
        return next(new ErrorResponse('Email already in use', 400));
      }
      
      // Generate new password and send invite email to new email
      const newPassword = generateRandomPassword();
      manager.password = newPassword; // Update password
      await sendManagerInviteEmail(email, newPassword, name || manager.name);
    }

    manager.name = name || manager.name;
    manager.email = email || manager.email;

    await manager.save();

    res.status(200).json({
      success: true,
      data: {
        id: manager._id,
        name: manager.name,
        email: manager.email,
        role: manager.role,
      },
      message: email && email !== manager.email ? 
        'Manager updated successfully. New credentials sent via email.' : 
        'Manager updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

//  Delete manager
// DELETE /api/landlords/managers/:id

export const deleteManager = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    const managerRecord = await Manager.findOne({
      userId: req.params.id,
      landlordId: req.user._id
    });

    if (!managerRecord) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }
    const manager = await User.findById(req.params.id);

    if (!manager) {
      return next(new ErrorResponse(`Manager not found with id of ${req.params.id}`, 404));
    }
    if (manager.role !== UserRole.MANAGER) {
      return next(new ErrorResponse(`User is not a manager`, 400));
    }

   await manager.deleteOne({ _id: manager._id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};