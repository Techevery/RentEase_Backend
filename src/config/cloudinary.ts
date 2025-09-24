import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

export const initializeCloudinary = (): void => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

// Setup for payment proof uploads
export const paymentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'property-management/payments',
    allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
    resource_type: 'auto',
  } as any,
});

// Setup for expense document uploads
export const expenseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'property-management/expenses',
    allowed_formats: ['jpg', 'png', 'pdf', 'jpeg'],
    resource_type: 'auto',
  } as any,
});

// Setup for property image uploads
export const propertyStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'property-management/properties',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto' },
    ],
  } as any,
});

// Setup for unit image uploads
export const unitStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'property-management/units',
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto' },
    ],
  } as any,
});


// Create multer instances that handle BOTH files and fields
export const propertyUpload = multer({ 
  storage: propertyStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export const unitUpload = multer({ 
  storage: unitStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  }
});

export const multiParser = multer({
  storage: multer.memoryStorage(), 
  limits: {
    fileSize: 10 * 1024 * 1024, 
    fieldSize: 10 * 1024 * 1024, 
  }
});


// Add this function to cloudinary.ts
export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  folder: string
): Promise<{ url: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 800, crop: 'limit' },
          { quality: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        } else {
          reject(new Error('Upload failed: No result returned'));
        }
      }
    );
    
    uploadStream.end(buffer);
  });
};

// For forms that don't require file uploads but need field parsing
export const formParser = multer();
export const paymentUpload = multer({ storage: paymentStorage });
export const expenseUpload = multer({ storage: expenseStorage });





export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
  }
};

