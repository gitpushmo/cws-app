# Waterjet Cutting Service - Technical Specification

## 1. System Overview

### Business Purpose
A waterjet cutting service platform that connects customers needing parts cut with operators who perform the cutting. Admin team handles pricing and business operations.

### Core Roles
- **Admin**: Your team (pricing control, order management, business oversight)
- **Operator**: Partner engineers who cut panels (set their own cutting rates, work as subcontractors)
- **Customer**: Businesses/individuals requesting waterjet cutting services

### Key Concepts
- Operators are autonomous partners who price their own cutting services
- Admin maintains pricing control and customer relationships
- Linear flow: Quote → Payment → Order → Production → Delivery
- 24-hour quote turnaround target

## 2. Data Model

### Core Entities

**Quote**
- Unique ID: Sequential Q00001, Q00002, etc.
- Revisions: Q00001-R1, Q00001-R2, etc. (original has no suffix)
- Contains multiple LineItems
- Links to Customer
- Assigned to one Operator
- Tracks revision history

**Order**
- Unique ID: Sequential F00001, F00002, etc.
- Created only after successful payment
- References accepted Quote revision (e.g., "from Q00001-R2")
- Inherits all data from Quote
- Tracks production and shipping

**LineItem**
- Each DXF file = one LineItem
- Contains: DXF file, quantity, selected material, cutting price, production estimate
- Admin sets final customer price per item

**Files**
- DXF files (cutting patterns) - Required
- PDF files (technical drawings) - Required
- Quote PDFs, Invoice PDFs, Order Confirmation PDFs

### Entity Relationships
```
Customer 1:N Quote 1:N LineItem
Quote 1:1 Order (after payment)
Quote N:1 Operator (assigned)
Quote 1:N Comment
Order 1:N Comment (inherited + new)
```

## 3. Status Management

### Quote Status Flow
```
pending → needs attention ↻ (unlimited)
       ↓
     ready for pricing → sent → accepted → done
                        ↓        ↓
                      declined  expired (14 days)
```

**Quote Statuses:**
- **pending**: New quote awaiting operator review
- **needs attention**: Issues found, customer action needed (unlimited back-and-forth)
- **ready for pricing**: Operator approved, awaiting admin pricing
- **sent**: Priced and sent to customer
- **accepted**: Customer accepted, awaiting payment
- **done**: Paid and order created (locked, non-editable)
- **declined**: Customer declined quote
- **expired**: Quote older than 14 days (view-only, non-editable)

### Order Status Flow
```
pending production → in production → ready for shipping → shipped/picked up → completed
```

**Order Statuses:**
- **pending production**: Paid, waiting in production queue
- **in production**: Operator actively cutting
- **ready for shipping**: Cut complete, awaiting dispatch
- **shipped**: Out for delivery with tracking
- **picked up**: Customer collected from facility
- **completed**: Delivered/collected successfully

## 4. User Workflows

### Customer Journey
1. **Registration**
   - Completes profile: Name, Phone, Email, Company name (optional), Shipping address

2. **Quote Request**
   - Uploads DXF files (cutting patterns - required)
   - Uploads PDF files (technical drawings - required)
   - Sets quantity per DXF file
   - Adds notes/deadline (optional)
   - System auto-creates LineItems from DXF files
   - Quote assigned number and enters "pending" status

3. **Quote Review Process**
   - If issues: Receives "needs attention" notification with public comments
   - Can upload new files or respond with comments
   - Cycle continues until operator marks "ready"

4. **Quote Response**
   - Receives priced quote within 24 hours
   - Can accept, decline, or request revisions (unlimited)
   - Each revision gets new number (Q00001-R1, etc.)

5. **Payment & Order**
   - On acceptance: Redirected to Mollie payment
   - Payment success creates Order with F-number
   - Receives order confirmation

### Operator Workflow
1. **Quote Review**
   - Picks pending quotes from queue
   - Reviews all DXF files and requirements
   - If issues found: Marks "needs attention" with public comment explaining problems
   - If feasible: Marks "ready for pricing"

2. **Quote Preparation (if ready)**
   - Selects appropriate material from inventory
   - Sets cutting service price per LineItem (their rate)
   - Sets production time estimate
   - Can add internal comments for admin

3. **Production**
   - Views paid orders in production queue
   - Picks order and marks "in production"
   - Cuts all items according to specifications
   - When complete: Marks "ready for shipping"
   - Adds public comments if issues arise

### Admin Workflow
1. **Quote Pricing**
   - Reviews "ready for pricing" quotes
   - System shows suggestion: Material cost + (Cutting price × 2)
   - Sets final customer price per LineItem (can adjust anything)
   - Can add/remove LineItems as needed
   - Applies bulk discounts if applicable
   - Generates and uploads Quote PDF
   - Sends to customer

2. **Revision Handling**
   - Receives revision requests from customers
   - Coordinates with operator for adjustments
   - Re-prices revised quote
   - Can decline excessive revision requests

3. **Order Management**
   - On quote acceptance: Uploads Invoice PDF (required)
   - After payment: Uploads Order Confirmation PDF (required)
   - Handles manual payment option if needed

4. **Shipping**
   - Receives notification when orders are "ready for shipping"
   - Arranges shipping or customer pickup
   - Adds tracking number or pickup details
   - Marks as "shipped" or "picked up"

## 5. Business Rules

### Pricing Rules
- System suggests: Material cost + (Cutting service price × 2)
- Material costs: Predefined per sheet type/size in inventory
- Cutting service price: Set by operator per LineItem
- Admin manually sets all final customer prices
- Bulk discounts: Admin applies as needed

### Revision Rules
- Unlimited revisions allowed after quote is sent
- Each revision gets new number (Q00001-R1, Q00001-R2, etc.)
- Each revision tracked in history with own PDF
- Admin has discretion to decline excessive revision requests
- "Needs attention" phase before pricing allows unlimited back-and-forth

### Order Rules
- No partial orders - all LineItems or nothing
- Orders only created after successful payment
- Quote becomes "done" and locked after order creation
- Orders inherit files and specifications from accepted quote revision
- Production estimate carries from quote to order (adjustable)

### General Rules
- Each DXF file = one LineItem
- One operator handles entire quote
- 24-hour quote turnaround target
- Quotes expire after 14 days (non-editable, can be deleted if no orders)
- Quotes can only be deleted if no orders are linked
- Comments carry from quote to order
- Stock/capacity issues handled via timeline adjustment + public comments

## 6. Permissions & Visibility

### Role-Based Access Control

| What | Operator | Admin | Customer |
|------|----------|-------|-----------|
| Files (DXF/PDF) | ✓ View | ✓ View | ✓ View own |
| Quantities | ✓ View | ✓ View | ✓ View own |
| Materials | ✓ Select | ✓ View/Edit | ✓ View final |
| Cutting prices | ✓ Set own | ✓ View/Edit | ✗ Never |
| Material costs | ✗ Never | ✓ View/Edit | ✗ Never |
| Customer prices | ✗ Never | ✓ Set | ✓ View own |
| Margins | ✗ Never | ✓ View | ✗ Never |
| Production estimates | ✓ Set/Adjust | ✓ View | ✓ View own |
| Public comments | ✓ Read/Write | ✓ Read/Write | ✓ Read/Write |
| Internal comments | ✓ Read/Write | ✓ Read/Write | ✗ Never |
| Payment details | ✗ Never | ✓ View | ✓ View own |
| Shipping details | ✗ Never | ✓ Manage | ✓ View own |
| Order status | ✓ Update production | ✓ Update all | ✓ View own |

### Comments System
**Public Comments:**
- Visible to all roles (customer, operator, admin)
- Used for quote clarifications and issue resolution
- Customer can comment anytime
- Shows in quote/order details pages
- Used for production updates and customer communication

**Internal Comments:**
- Operator & admin only
- Used for margin discussions, internal coordination
- Never visible to customer
- Used for team coordination and business notes

## 7. Technical Implementation

### Payment Integration (Mollie)
**Standard Flow:**
1. Customer accepts quote → Admin uploads Invoice PDF (required)
2. Customer redirected to Mollie payment page (quote ID in metadata)
3. Payment success → Mollie webhook triggers order creation
4. Payment failed → Quote stays "accepted", customer can retry

**Manual Payment (Admin only):**
- Admin uploads Invoice PDF to "accepted" quote (required)
- Admin can mark quote as paid manually
- Creates order same as webhook flow
- Payment method tracked: "online" or "manual"

### Document Management
**PDF Types:**
- Quote PDF: Generated externally, uploaded when sending priced quote
- Invoice PDF: Generated externally, uploaded after quote acceptance
- Order Confirmation PDF: Generated externally, uploaded after payment success
- Packing slip: Physical only (included with shipment)

**Document Rules:**
- Admin generates externally and uploads at key stages
- No auto-generation in system
- No document editing (upload only)
- No versioning (latest upload replaces previous)
- Customer always has access to their documents
- Operator has no access to documents

### Notification System (Email)
**Automated Email Triggers:**

| Event | Recipient | Content |
|-------|-----------|---------|
| New quote created | Operators | Quote number notification |
| Quote needs attention | Customer | Required changes with public comments |
| Quote sent | Customer | Quote with Q-number (or revision Q00001-R1) |
| Revision sent | Customer | Updated quote with revision number |
| Quote accepted | Admin | Specific revision accepted notification |
| Payment received | Customer | Order confirmation with F-number |
| Order ready for shipping | Admin | Production complete notification |
| Order shipped/pickup ready | Customer | Tracking/pickup details |

**Reference Number Format:**
- Original quotes: Q00001, Q00002, etc.
- Quote revisions: Q00001-R1, Q00001-R2, etc.
- Orders: F00001, F00002, etc. (references accepted quote revision)

### File Handling
**Supported File Types:**
- DXF files: Required for cutting patterns
- PDF files: Optional for technical drawings
- Generated PDFs: Quote, Invoice, Order Confirmation documents

**File Storage:**
- Customer uploads during quote request
- Files inherited by orders from accepted quote revision
- Admin uploads PDF documents at specified stages
- Simple manual process, no complex integrations

### Shipping/Delivery
**Simple Manual Process:**
- Admin coordinates with shipping provider
- Updates order with tracking/pickup info
- Customer notified of shipping details
- No automated label generation
- No complex logistics integrations
- Manual completion after delivery confirmation