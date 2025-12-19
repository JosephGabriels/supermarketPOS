# POS System API Endpoints

**Base URL**: `http://localhost:8000/api/`

## Authentication

### Login
- **POST** `/api/auth/token/`
  - Body: `{"username": "joesky", "password": "Tavor@!07"}`
  - Returns: `{"access": "...", "refresh": "...", "user": {...}}`

### Refresh Token
- **POST** `/api/auth/token/refresh/`
  - Body: `{"refresh": "..."}`
  - Returns: `{"access": "..."}`

### Logout
- **POST** `/api/auth/logout/`
  - Body: `{"refresh_token": "..."}`
  - Headers: `Authorization: Bearer <access_token>`

### User Profile
- **GET** `/api/auth/profile/`
- **PUT** `/api/auth/profile/`
  - Headers: `Authorization: Bearer <access_token>`

---

## Users & Branches

### Users
- **GET** `/api/users/` - List all users (Admin only)
- **POST** `/api/users/` - Create user (Admin only)
- **GET** `/api/users/{id}/` - Get user details
- **PUT** `/api/users/{id}/` - Update user
- **DELETE** `/api/users/{id}/` - Delete user
- **GET** `/api/users/me/` - Get current user

### Branches
- **GET** `/api/branches/` - List branches
- **POST** `/api/branches/` - Create branch (Admin only)
- **GET** `/api/branches/{id}/` - Get branch details
- **PUT** `/api/branches/{id}/` - Update branch
- **DELETE** `/api/branches/{id}/` - Delete branch

### Categories
- **GET** `/api/categories/` - List categories
- **POST** `/api/categories/` - Create category (Manager+)
- **GET** `/api/categories/{id}/` - Get category details
- **PUT** `/api/categories/{id}/` - Update category
- **DELETE** `/api/categories/{id}/` - Delete category

---

## Inventory

### Products
- **GET** `/api/products/` - List products
  - Query params: `?search=...&category=...&barcode=...&low_stock=true`
- **POST** `/api/products/` - Create product (Manager+)
- **GET** `/api/products/{id}/` - Get product details
- **PUT** `/api/products/{id}/` - Update product
- **DELETE** `/api/products/{id}/` - Delete product
- **GET** `/api/products/lookup/?barcode=...` - Lookup product by barcode
- **GET** `/api/products/low_stock/` - Get low stock products
- **POST** `/api/products/{id}/adjust_stock/` - Adjust stock (Manager+)
  - Body: `{"quantity": 10, "reason": "...", "movement_type": "adjustment"}`

### Stock Movements
- **GET** `/api/stock-movements/` - List stock movements (Manager+)
  - Query params: `?product=...&movement_type=...`
- **GET** `/api/stock-movements/{id}/` - Get movement details

---

## Sales

### Sales
- **GET** `/api/sales/` - List sales
  - Query params: `?status=...&cashier=...&date_from=...&date_to=...`
- **POST** `/api/sales/` - Create sale
  - Body: See SaleCreateSerializer
- **GET** `/api/sales/{id}/` - Get sale details
- **POST** `/api/sales/{id}/complete/` - Complete sale (deduct inventory, award points)

### Discounts
- **GET** `/api/discounts/` - List discounts
  - Query params: `?code=...&is_active=true`
- **POST** `/api/discounts/` - Create discount (Manager+)
- **GET** `/api/discounts/{id}/` - Get discount details
- **PUT** `/api/discounts/{id}/` - Update discount
- **POST** `/api/discounts/validate_code/` - Validate discount code
  - Body: `{"code": "..."}`

### Returns
- **GET** `/api/returns/` - List returns
- **POST** `/api/returns/` - Create return request
- **GET** `/api/returns/{id}/` - Get return details

---

## Customers

### Customers
- **GET** `/api/customers/` - List customers
  - Query params: `?search=...&phone=...&tier=...`
- **POST** `/api/customers/` - Create customer
- **GET** `/api/customers/{id}/` - Get customer details
- **PUT** `/api/customers/{id}/` - Update customer
- **POST** `/api/customers/lookup/` - Lookup customer by phone
  - Body: `{"phone": "..."}`
- **POST** `/api/customers/{id}/add_points/` - Add loyalty points
  - Body: `{"points": 100, "description": "..."}`
- **POST** `/api/customers/{id}/redeem_points/` - Redeem points
  - Body: `{"points": 50, "sale_id": ...}`

### Loyalty Tiers
- **GET** `/api/loyalty-tiers/` - List loyalty tiers
- **GET** `/api/loyalty-tiers/{id}/` - Get tier details

### Loyalty Transactions
- **GET** `/api/loyalty-transactions/` - List transactions
  - Query params: `?customer=...&transaction_type=...`

---

## Payments

### Payments
- **GET** `/api/payments/` - List payments
  - Query params: `?sale=...&payment_method=...&status=...`
- **POST** `/api/payments/` - Create payment
  - Body: `{"sale_id": ..., "payment_method": "cash", "amount": "1000.00"}`
- **GET** `/api/payments/{id}/` - Get payment details
- **POST** `/api/payments/mpesa_stk_push/` - Initiate M-Pesa STK Push
  - Body: `{"sale_id": ..., "phone_number": "254...", "amount": "1000.00"}`
- **POST** `/api/payments/{id}/confirm_mpesa/` - Manually confirm M-Pesa payment
  - Body: `{"mpesa_receipt_number": "..."}`

### M-Pesa Callback
- **POST** `/api/mpesa/callback/` - M-Pesa callback endpoint (No auth required)

---

## Shifts

### Shifts
- **GET** `/api/shifts/` - List shifts
  - Query params: `?status=...&cashier=...&date_from=...&date_to=...`
- **GET** `/api/shifts/{id}/` - Get shift details
- **POST** `/api/shifts/open_shift/` - Open new shift
  - Body: `{"opening_cash": "5000.00", "notes": "..."}`
- **POST** `/api/shifts/{id}/close_shift/` - Close shift
  - Body: `{"closing_cash": "15000.00", "notes": "..."}`
- **GET** `/api/shifts/current/` - Get current open shift
- **GET** `/api/shifts/{id}/report/` - Get shift report

### Shift Transactions
- **GET** `/api/shift-transactions/` - List shift transactions
  - Query params: `?shift=...&payment_method=...`

---

## Approvals

### Approval Requests
- **GET** `/api/approval-requests/` - List approval requests
  - Query params: `?status=...&request_type=...&requester=...`
- **POST** `/api/approval-requests/` - Create approval request
  - Body: `{"request_type": "return", "details": {...}, "reason": "..."}`
- **GET** `/api/approval-requests/{id}/` - Get request details
- **POST** `/api/approval-requests/{id}/approve/` - Approve request (Manager+)
  - Body: `{"action": "approve", "notes": "..."}`
- **POST** `/api/approval-requests/{id}/reject/` - Reject request (Manager+)
  - Body: `{"action": "reject", "notes": "..."}`
- **GET** `/api/approval-requests/pending/` - Get pending approvals (Manager+)
- **GET** `/api/approval-requests/my_requests/` - Get my requests

---

## Reports

### Daily Sales Report
- **GET** `/api/reports/daily-sales/?date=YYYY-MM-DD&branch=...` (Manager+)

### Cashier Performance
- **GET** `/api/reports/cashier-performance/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&branch=...` (Manager+)

### Stock Alerts
- **GET** `/api/reports/stock-alerts/?branch=...` (Manager+)

### Tax Report
- **GET** `/api/reports/tax-report/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&branch=...` (Manager+)

### Sales Summary
- **GET** `/api/reports/sales-summary/?period=today|week|month&branch=...` (Manager+)

---

## Permission Levels

- **Admin**: Full system access
- **Manager**: Approvals, reports, inventory management
- **Cashier**: Sales, payments, customer lookup

---

## Example Workflow

### 1. Login
```bash
curl -X POST http://localhost:8000/api/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"username": "joesky", "password": "Tavor@!07"}'
```

### 2. Open Shift
```bash
curl -X POST http://localhost:8000/api/shifts/open_shift/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"opening_cash": "5000.00"}'
```

### 3. Create Sale
```bash
curl -X POST http://localhost:8000/api/sales/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"barcode": "123456", "quantity": 2},
      {"product_id": 1, "quantity": 1}
    ]
  }'
```

### 4. Process Payment
```bash
curl -X POST http://localhost:8000/api/payments/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": 1,
    "payment_method": "cash",
    "amount": "1500.00"
  }'
```

### 5. Complete Sale
```bash
curl -X POST http://localhost:8000/api/sales/1/complete/ \
  -H "Authorization: Bearer <access_token>"
```

---

## Notes

- All authenticated endpoints require `Authorization: Bearer <access_token>` header
- Access tokens expire after 8 hours
- Refresh tokens expire after 7 days
- All amounts are in Kenyan Shillings (KES)
- All dates should be in ISO format (YYYY-MM-DD)
- Tax rate default is 16% VAT
