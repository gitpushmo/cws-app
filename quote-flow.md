# Quote Flow Specification

## Authentication & User Setup

### User Roles
- **Customer**: Businesses/individuals requesting waterjet cutting services
- **Operator**: Partner engineers who cut panels (work as subcontractors)
- **Admin**: Your team (pricing control, order management, business oversight)

### Customer Registration
- Name (required)
- Phone (required)
- Email (required)
- Company name (optional)
- Invoice address (required)

## Quote Entity Structure

### Quote
- Unique ID: Sequential Q00001, Q00002, etc.
- Revisions: Q00001-R1, Q00001-R2, etc. (original has no suffix)
- Contains multiple LineItems
- Links to Customer
- Assigned to one Operator
- Tracks revision history

### LineItem
- Each DXF file = one LineItem
- DXF file (required)
- Quantity
- Selected material
- Cutting price (set by operator)
- Customer price (set by admin)
- Production time estimate

### Files
- DXF files (cutting patterns) - Required
- PDF files (technical drawings) - Required
- Quote PDF (uploaded by admin when sending)

## Quote Status Flow

```
pending → needs attention ↻ (unlimited)
       ↓
     ready for pricing → sent → accepted → done
                        ↓        ↓
                      declined  expired (14 days)
```

### Status Definitions
- **pending**: New quote awaiting operator review
- **needs attention**: Issues found, customer action needed (unlimited back-and-forth)
- **ready for pricing**: Operator approved, awaiting admin pricing
- **sent**: Priced and sent to customer
- **accepted**: Customer accepted, awaiting payment
- **done**: Paid and order created (locked, non-editable)
- **declined**: Customer declined quote
- **expired**: Quote older than 14 days (view-only, non-editable)

## Workflows

### Customer Quote Flow

1. **Quote Request**
   - Login to platform
   - Upload DXF files (required)
   - Upload PDF technical drawings (required)
   - Set quantity per DXF file
   - Provide shipping address for this quote (required)
   - Add notes/deadline (optional)
   - System auto-creates LineItems from DXF files
   - Quote assigned number (Q00001) and enters "pending" status

2. **Quote Review Process**
   - Receive notification if "needs attention"
   - View public comments from operator explaining issues
   - Upload new files or respond with comments
   - Cycle continues until operator marks "ready for pricing"

3. **Quote Response**
   - Receive priced quote within 24 hours
   - View quote with all LineItems and total price
   - Options:
     - Accept quote → Status: "accepted"
     - Decline quote → Status: "declined"
     - Request revision → Admin creates new revision (Q00001-R1)

4. **Payment**
   - On acceptance: Redirected to payment (triggers order creation after success)
   - Quote becomes "done" after successful payment

### Operator Quote Flow

1. **Quote Review**
   - View pending quotes queue
   - Pick quote to review
   - Download and review all DXF files
   - Review customer requirements
   - Decision:
     - If issues: Mark "needs attention" + add public comment
     - If feasible: Mark "ready for pricing"

2. **Quote Preparation** (if marking ready)
   - Select material from inventory for each LineItem
   - Set cutting service price per LineItem
   - Set production time estimate
   - Add internal comments for admin (optional)
   - Submit for admin pricing

### Admin Quote Flow

1. **Quote Pricing** (for "ready for pricing" quotes)
   - Review operator's input
   - View system suggestion: Material cost + (Cutting price × 2)
   - Set final customer price per LineItem
   - Add/remove LineItems if needed
   - Apply bulk discounts (optional)
   - Generate and upload Quote PDF
   - Send to customer (status → "sent")

2. **Revision Handling**
   - Receive revision request from customer
   - Coordinate with operator for adjustments
   - Create new revision (Q00001-R1, Q00001-R2, etc.)
   - Re-price revised quote
   - Upload revised Quote PDF
   - Send to customer

3. **Quote Acceptance**
   - Receive notification when quote accepted
   - Upload Invoice PDF (required)
   - Enable payment for customer
   - After payment: Quote status → "done"

## Comments System

### Public Comments
- Visible to: Customer, Operator, Admin
- Used for: Quote clarifications, issue explanations
- Available in all quote statuses

### Internal Comments
- Visible to: Operator, Admin only
- Used for: Margin discussions, internal notes
- Never visible to customer

## Business Rules

### Quote Rules
- Each DXF file = one LineItem
- One operator per quote (no reassignment)
- 24-hour quote turnaround target
- Unlimited revisions allowed
- Each revision gets new number
- Quotes expire after 14 days (become read-only)
- "Needs attention" allows unlimited back-and-forth

### Pricing Rules
- Material costs: Predefined in system
- Cutting price: Set by operator
- Customer price: Set by admin
- System suggests: Material + (Cutting × 2)
- Admin can override any pricing

## Permissions Matrix

| Action | Customer | Operator | Admin |
|--------|----------|----------|-------|
| Upload DXF/PDF | ✓ Own | ✗ | ✗ |
| View DXF/PDF | ✓ Own | ✓ Assigned | ✓ All |
| Set cutting price | ✗ | ✓ | ✓ Override |
| Set customer price | ✗ | ✗ | ✓ |
| View customer price | ✓ Own | ✗ | ✓ |
| View margins | ✗ | ✗ | ✓ |
| Public comments | ✓ R/W | ✓ R/W | ✓ R/W |
| Internal comments | ✗ | ✓ R/W | ✓ R/W |
| Change quote status | ✗ | ✓ Limited | ✓ All |
| Create revision | ✗ | ✗ | ✓ |

## Email Notifications

| Event | Recipient | Content |
|-------|-----------|---------|
| New quote created | Operators | New quote Q00001 in queue |
| Quote needs attention | Customer | Action required with operator comments |
| Quote sent | Customer | Priced quote Q00001 ready |
| Revision sent | Customer | Updated quote Q00001-R1 ready |
| Quote accepted | Admin | Quote Q00001-R2 accepted by customer |
