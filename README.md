# Restaurant Food Ordering & Home Delivery — Backend

A complete, production-ready backend for a restaurant food ordering and home delivery platform, built with **Node.js**, **Express.js**, and **MongoDB**. Implements JWT authentication, role-based authorization, full order lifecycle management, and Razorpay payment integration.

## Tech Stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JSON Web Tokens (JWT) + bcryptjs password hashing
- **Payments:** Razorpay
- **Security:** helmet, express-mongo-sanitize, xss-clean, express-rate-limit, cors

## Folder Structure

```
backend/
├── config/            # DB connection, constants, Razorpay client
├── controllers/       # Request handlers (business logic entry points)
├── models/             # Mongoose schemas (User, Food, Cart, Order, Payment)
├── routes/             # Express routers per resource
├── middleware/         # Auth, role-check, error handling, validation runner
├── services/           # Reusable business logic (pricing, status rules, Razorpay)
├── utils/               # AppError, catchAsync, JWT helpers, response formatter, seeder
├── validations/        # Pure input-validation functions per resource
├── .env.example        # Environment variable template
├── .env                 # Your local environment config (not committed)
├── app.js               # Express app setup (middleware + route mounting)
├── server.js            # Entry point — connects DB and starts the server
└── package.json
```

## Getting Started

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your actual values:
```bash
cp .env.example .env
```

Key variables:
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random secret for signing tokens (min 32 chars) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | From your Razorpay dashboard |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | Used only by the seeder to create the first Owner account |

### 3. Seed the first Owner (Admin) account
Since Staff, Delivery Staff, and Owner accounts can only be created by an existing Owner, you must seed the very first one:
```bash
npm run seed
```
This creates an Owner account using `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env`. **Change this password immediately after first login.**

### 4. Run the server
```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:5001` (or your configured `PORT`).

## Roles & Permissions

| Role | Description |
|---|---|
| `customer` | Browses menu, manages cart, places orders, pays online |
| `staff` | Manages food menu, accepts/prepares orders |
| `deliveryStaff` | Picks up and delivers assigned orders |
| `owner` | Full admin access — manages staff, assigns deliveries, views reports |

**Note:** Public registration (`POST /api/v1/auth/register`) always creates a `customer` account. Staff, Delivery Staff, and Owner accounts are created exclusively by an existing Owner via `POST /api/v1/admin/users`, or by the seeder script for the first Owner.

## Order Status Workflow

```
Placed → Accepted → Preparing → ReadyForDelivery → (Owner assigns delivery staff)
       → OutForDelivery → Delivered → Completed
```

Each transition is enforced server-side (`services/orderStatusService.js`) — only specific roles can perform specific transitions, and transitions must follow the defined sequence. Orders can also be `Cancelled` from `Placed` or `Accepted` states only.

## Payment Flow (Razorpay)

1. Customer creates an order (`POST /api/v1/orders`) → status `Placed`, paymentStatus `Pending`.
2. Frontend calls `POST /api/v1/payments/create-order` with the `orderId` → backend creates a Razorpay order and returns `razorpayOrderId` + `keyId`.
3. Frontend opens Razorpay Checkout using these details.
4. On success, frontend calls `POST /api/v1/payments/verify` with `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`.
5. Backend verifies the HMAC SHA256 signature server-side before marking payment/order as `Paid`. **Never trust a "success" callback alone — always verify the signature.**

## API Documentation

See [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) for the full endpoint reference, including request/response examples for every route.

## Security Notes

- Passwords hashed with bcrypt (configurable salt rounds via `BCRYPT_SALT_ROUNDS`).
- JWT signed with `JWT_SECRET`; tokens invalidated automatically if the password is changed afterward.
- Input sanitized against NoSQL injection (`express-mongo-sanitize`) and XSS (`xss-clean`).
- Rate limiting applied globally and more strictly on `/auth/login` and `/auth/register`.
- Razorpay webhook/payment signatures verified server-side using HMAC SHA256 — payment status is never trusted from client input alone.
- Role-based middleware (`restrictTo`) guards every sensitive route.

## Testing the API

A Postman collection is not included by default, but every route is documented in `API_DOCUMENTATION.md` with example `curl` requests you can adapt directly.
