# API Documentation

Base URL: `http://localhost:5000/api/v1`

All protected routes require header:
```
Authorization: Bearer <jwt_token>
```

All responses follow this envelope:
```json
{
  "success": true,
  "message": "Description of result",
  "data": { },
  "meta": { }
}
```

Errors:
```json
{
  "success": false,
  "message": "Error description"
}
```

---

## 1. Authentication — `/auth`

### Register
`POST /auth/register` — Public
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123"
}
```
Always creates a `customer` role account. Returns `{ user, token }`.

### Login
`POST /auth/login` — Public
```json
{ "email": "john@example.com", "password": "SecurePass123" }
```
Returns `{ user, token }`.

### Logout
`POST /auth/logout` — Private (any role)
Stateless — client should discard the token.

### Get My Profile
`GET /auth/me` — Private

### Update My Profile
`PATCH /auth/me` — Private
```json
{ "name": "John D.", "phone": "9876500000", "addresses": [ { "line1": "12 MG Road", "city": "Chennai", "state": "TN", "pincode": "600001", "isDefault": true } ] }
```

### Update Password
`PATCH /auth/update-password` — Private
```json
{ "currentPassword": "SecurePass123", "newPassword": "EvenMoreSecure456" }
```

---

## 2. Food / Menu — `/foods`

### Get All Foods
`GET /foods?category=Main+Course&isVeg=true&search=paneer&page=1&limit=20` — Public

### Get Food By ID
`GET /foods/:id` — Public

### Create Food
`POST /foods` — Private (Staff, Owner)
```json
{
  "name": "Paneer Butter Masala",
  "description": "Rich, creamy tomato-based curry with paneer cubes",
  "price": 220,
  "category": "Main Course",
  "imageUrl": "https://example.com/pbm.jpg",
  "isVeg": true,
  "preparationTimeMinutes": 20
}
```

### Update Food
`PATCH /foods/:id` — Private (Staff, Owner)

### Delete Food
`DELETE /foods/:id` — Private (Owner only)

---

## 3. Cart — `/cart`
All routes Private (Customer only)

### Get Cart
`GET /cart`

### Add To Cart
`POST /cart`
```json
{ "foodId": "665f1c2e8b1d4a0012345678", "quantity": 2 }
```

### Update Cart Item Quantity
`PATCH /cart/:itemId`
```json
{ "quantity": 3 }
```

### Remove Item From Cart
`DELETE /cart/:itemId`

### Clear Cart
`DELETE /cart`

---

## 4. Orders — `/orders`
All routes Private (auth required; role per-route below)

### Create Order (Checkout)
`POST /orders` — Customer
```json
{
  "deliveryAddress": {
    "line1": "12 MG Road",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600001",
    "landmark": "Near City Mall"
  },
  "paymentMethod": "Razorpay",
  "customerNote": "Please make it less spicy"
}
```
Builds the order from the customer's current cart, validates live food prices/availability, computes pricing, and clears the cart.

### Get My Orders
`GET /orders/my-orders?status=Placed&page=1&limit=20` — Customer

### Get All Orders (Dashboard)
`GET /orders?status=Accepted` — Staff, Owner

### Get My Deliveries
`GET /orders/my-deliveries?status=OutForDelivery` — Delivery Staff, Owner

### Get Single Order
`GET /orders/:id` — Owner of order / assigned delivery staff / staff / owner

### Accept Order
`PATCH /orders/:id/accept` — Staff, Owner
`Placed → Accepted`

### Mark Preparing
`PATCH /orders/:id/preparing` — Staff, Owner
`Accepted → Preparing`

### Mark Ready For Delivery
`PATCH /orders/:id/ready` — Staff, Owner
`Preparing → ReadyForDelivery`

### Assign Delivery Staff
`PATCH /orders/:id/assign-delivery` — Owner
```json
{ "deliveryStaffId": "665f1c2e8b1d4a0012345699" }
```
Only allowed when order status is `ReadyForDelivery`.

### Pickup Order
`PATCH /orders/:id/pickup` — Delivery Staff (must be assigned), Owner
`ReadyForDelivery → OutForDelivery`

### Mark Delivered
`PATCH /orders/:id/delivered` — Delivery Staff (must be assigned), Owner
`OutForDelivery → Delivered`. For COD orders, automatically marks payment as Paid.

### Complete Order
`PATCH /orders/:id/complete` — Customer (owner of order), Staff, Owner
`Delivered → Completed`

### Cancel Order
`PATCH /orders/:id/cancel` — Customer (owner of order), Staff, Owner
```json
{ "reason": "Changed my mind" }
```
Only allowed from `Placed` or `Accepted` states.

---

## 5. Payments — `/payments`
All routes Private

### Create Razorpay Order
`POST /payments/create-order` — Customer
```json
{ "orderId": "665f1c2e8b1d4a0012345700" }
```
Response:
```json
{
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "razorpayOrderId": "order_Lk2x...",
    "amount": 26500,
    "currency": "INR",
    "keyId": "rzp_test_xxxxxxxxxxxxx",
    "internalOrderId": "665f1c2e8b1d4a0012345700",
    "orderNumber": "ORD-20260623-482910"
  }
}
```
Use `razorpayOrderId` and `keyId` to open Razorpay Checkout on the frontend.

### Verify Payment
`POST /payments/verify` — Customer
```json
{
  "razorpayOrderId": "order_Lk2x...",
  "razorpayPaymentId": "pay_Lk2y...",
  "razorpaySignature": "5f4dcc3b5aa765d61d8327deb882cf99..."
}
```
Backend verifies the HMAC SHA256 signature before marking payment/order `Paid`.

### Mark Payment Failed
`POST /payments/failed` — Customer
```json
{ "razorpayOrderId": "order_Lk2x...", "reason": "User cancelled checkout" }
```

### Get Payment By Order
`GET /payments/order/:orderId` — Customer (owner), Staff, Owner

---

## 6. Admin — `/admin`

### Get Delivery Staff List
`GET /admin/delivery-staff?available=true` — Owner, Staff

### Create Staff / Delivery Staff / Owner Account
`POST /admin/users` — Owner
```json
{
  "name": "Priya Kumar",
  "email": "priya@restaurant.com",
  "phone": "9123456789",
  "password": "StaffPass123",
  "role": "deliveryStaff"
}
```

### Get All Users
`GET /admin/users?role=customer&isActive=true&page=1&limit=20` — Owner

### Get User By ID
`GET /admin/users/:id` — Owner

### Update User
`PATCH /admin/users/:id` — Owner
```json
{ "isActive": false }
```
or
```json
{ "role": "staff" }
```
Owner cannot modify their own role/active status through this route.

### Deactivate User
`DELETE /admin/users/:id` — Owner
Soft-delete (sets `isActive: false`); does not permanently remove the record.

### Sales Report
`GET /admin/reports/sales?startDate=2026-06-01&endDate=2026-06-23` — Owner
Returns total order count, breakdown by status, and daily order trend.

### Revenue Report
`GET /admin/reports/revenue?startDate=2026-06-01&endDate=2026-06-23` — Owner
Returns total revenue, average order value, daily revenue trend, and top 10 selling food items (based on paid orders only).

---

## Database Collections

| Collection | Purpose |
|---|---|
| `users` | Customers, Staff, Delivery Staff, Owners (single collection, differentiated by `role`) |
| `foods` | Menu items |
| `carts` | One active cart per customer |
| `orders` | Order documents with embedded item snapshots and status history |
| `payments` | Razorpay payment records linked to orders |

## Order Status Enum
```
Placed, Accepted, Preparing, ReadyForDelivery, OutForDelivery, Delivered, Completed, Cancelled
```

## Payment Status Enum
```
Pending, Paid, Failed, Refunded
```

## Example curl: Full happy-path flow

```bash
# 1. Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","phone":"9876543210","password":"SecurePass123"}'

# 2. Login (save the returned token as $TOKEN)
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'

# 3. Browse menu
curl http://localhost:5000/api/v1/foods

# 4. Add to cart
curl -X POST http://localhost:5000/api/v1/cart \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"foodId":"<FOOD_ID>","quantity":2}'

# 5. Checkout
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"deliveryAddress":{"line1":"12 MG Road","city":"Chennai","state":"TN","pincode":"600001"},"paymentMethod":"Razorpay"}'

# 6. Create Razorpay order for payment
curl -X POST http://localhost:5000/api/v1/payments/create-order \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"orderId":"<ORDER_ID>"}'

# 7. (After Razorpay Checkout completes on frontend) Verify payment
curl -X POST http://localhost:5000/api/v1/payments/verify \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"razorpayOrderId":"...","razorpayPaymentId":"...","razorpaySignature":"..."}'
```
