# Property Rent Management System Backend

A comprehensive backend system for managing rental properties, focusing on the relationship between landlords, property managers, and tenants.

## Features

- Authentication for landlords and managers
- Property and unit management (houses, flats)
- User management (landlords, managers, tenants)
- Payment tracking with approval workflow
- Expense management with documentation
- Email notifications for account creation and payment reminders
- File upload system for payment proofs and expense documentation
- Reporting and analytics for payments, expenses, and manager performance

## Tech Stack

- Node.js and Express.js
- TypeScript
- MongoDB with Mongoose
- JWT for authentication
- Cloudinary for file storage
- Multer for file uploads
- Nodemailer for email notifications

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the `.env.example` file
4. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new landlord
- `POST /api/auth/login` - Login a user (landlord or manager)
- `GET /api/auth/me` - Get the currently logged in user
- `POST /api/auth/forgotpassword` - Request password reset
- `PUT /api/auth/resetpassword/:token` - Reset password with token
- `PUT /api/auth/updatepassword` - Update password (authenticated)

### Landlord Management

- `POST /api/landlords/managers` - Create a new manager
- `GET /api/landlords/managers` - Get all managers
- `GET /api/landlords/managers/:id` - Get a specific manager
- `PUT /api/landlords/managers/:id` - Update a manager
- `DELETE /api/landlords/managers/:id` - Delete a manager
- `GET /api/landlords/dashboard` - Get landlord dashboard statistics

### Property Management

- `POST /api/properties/houses` - Create a new house
- `GET /api/properties/houses` - Get all houses for landlord
- `GET /api/properties/houses/:id` - Get a specific house
- `PUT /api/properties/houses/:id` - Update a house
- `DELETE /api/properties/houses/:id` - Delete a house
- `PUT /api/properties/houses/:id/assign-manager/:managerId` - Assign manager to house
- `POST /api/properties/houses/:houseId/flats` - Create a new flat in a house
- `GET /api/properties/houses/:houseId/flats` - Get all flats in a house
- `GET /api/properties/flats/:id` - Get a specific flat
- `PUT /api/properties/flats/:id` - Update a flat
- `DELETE /api/properties/flats/:id` - Delete a flat
- `PUT /api/properties/flats/:id/assign-manager/:managerId` - Assign manager to flat

### Tenant Management

- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - Get all tenants for landlord
- `GET /api/tenants/:id` - Get a specific tenant
- `PUT /api/tenants/:id` - Update a tenant
- `DELETE /api/tenants/:id` - Delete a tenant
- `PUT /api/tenants/:id/assign-flat/:flatId` - Assign tenant to flat

### Payment Management

- `POST /api/payments` - Create a new payment (manager)
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get a specific payment
- `PUT /api/payments/:id/approve` - Approve a payment (landlord)
- `PUT /api/payments/:id/reject` - Reject a payment (landlord)
- `POST /api/payments/send-reminders` - Send payment reminders to tenants

### Expense Management

- `POST /api/expenses` - Create a new expense (manager)
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get a specific expense
- `PUT /api/expenses/:id/approve` - Approve an expense (landlord)
- `PUT /api/expenses/:id/reject` - Reject an expense (landlord)

### Manager Actions

- `GET /api/managers/properties` - Get all properties managed by the manager
- `GET /api/managers/tenants` - Get all tenants managed by the manager
- `GET /api/managers/dashboard` - Get manager dashboard statistics

### Reports

- `GET /api/reports/payments/property/:houseId` - Get payment summary by property
- `GET /api/reports/expenses/property/:houseId` - Get expense summary by property
- `GET /api/reports/managers/:managerId` - Get manager performance summary

### Notifications

- `GET /api/notifications` - Get all notifications for the user
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete a notification

## Environment Variables

```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:3000
```