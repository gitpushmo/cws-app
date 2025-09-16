## Roles
- **admin**: your team (pricing control, order management)
- **operator**: engineers who cut panels (internal team only initially)
- **customer**: requesting waterjet cutting services

## Quote Flow

**Customer Journey:**
1. Customer signs up → completes profile:
   - Name, Phone, Email
   - Company name (optional)
   - Shipping address
   
2. Requests quote → uploads:
   - .dxf files (cutting patterns - required)
   - .pdf files (technical drawings - optional)
   - Quantity per DXF file
   - Notes/deadline (optional)
   
3. System auto-creates line items from DXF files
4. Quote enters queue → status: "pending"
5. Receives priced quote within 24 hours
6. Can accept, decline, or request one revision

**Operator + Admin Flow:**
1. Operator picks pending quote
2. Reviews all line items (DXF files):
   - If issues found → marks "needs attention" with public comment
   - If all feasible → marks "ready for pricing":
     * Selects material from inventory
     * Sets cutting service price per item
     * Sets production time for entire quote
   - Can add internal comments (admin/operator only)
   
3. If "needs attention":
   - Customer sees public comment about issues
   - Customer can upload new files or comment back
   - Returns to operator queue for re-review
   - Cycle continues until ready
   
4. Once "ready for pricing" → Admin reviews:
   - System shows: material cost + (cutting price × 2) as suggestion
   - Admin sets final customer price
   - Sends to customer

5. Customer response to priced quote:
   - Accept → redirect to payment
   - Decline → mark closed
   - Request revision → one revision allowed

## Revision Flow

**One revision allowed per priced quote:**
- Only available after quote is "sent" status
- Customer requests revision with notes/new files
- Operator adjusts (material/cutting price/timeline)
- Admin sets new customer prices
- Sends revised quote
- Customer must accept or decline (no further revisions)

Note: "Needs attention" phase before pricing allows unlimited back-and-forth

## Pricing Rules
- System suggests: Material cost + (Cutting service price × 2)
- Material costs: predefined per sheet type/size in inventory
- Cutting service price: set by operator per item
- Admin manually sets all final customer prices
- Bulk discounts: admin applies as needed

## Key Rules
- Each DXF = one line item
- One operator handles entire quote
- Manual pricing by admin (system shows suggestions)
- One revision total allowed after pricing
- 24-hour quote turnaround target
- "Needs attention" allows unlimited back-and-forth before pricing
- Two separate comment sections (public and internal)

## Quote Statuses
- **pending**: New quote awaiting operator review
- **needs attention**: Issues found, customer action needed
- **ready for pricing**: Operator approved, awaiting admin pricing
- **sent**: Priced and sent to customer
- **accepted**: Customer accepted, awaiting payment
- **done**: Paid and order created (locked)
- **declined**: Customer declined quote

## Comments System
- **Public comments**: Visible to all (customer, operator, admin)
  - Used for quote clarifications and issue resolution
  - Customer can comment anytime
  - Shows in quote details page
- **Internal comments**: Operator & admin only
  - Used for margin discussions, internal notes
  - Never visible to customer

## Visibility
- **Operator sees**: Files, quantities, materials needed, public + internal comments
- **Operator never sees**: Material costs, customer prices, margins
- **Admin sees**: Everything (all costs, prices, margins, both comment types)
- **Customer sees**: Final prices, production timeline, public comments only

## Order Flow

**After quote acceptance:**
1. Customer accepts quote → redirected to Mollie payment
2. Mollie payment page (quote ID in metadata)
3. Payment success → Mollie webhook triggers:
   - Creates production order
   - Quote marked as "done" (locked, non-editable)
   - Customer receives order confirmation
4. Payment failed → quote stays "accepted", customer can retry

**Manual payment option (admin only):**
- Admin can mark "accepted" quote as paid manually
- Creates order same as webhook flow
- Payment method tracked: "online" or "manual"

**Order rules:**
- Orders only created after successful payment
- Quote becomes "done" and locked after order creation
- Quotes can only be deleted if no orders are linked
- Each order links back to its originating quote