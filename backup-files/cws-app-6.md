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
   - System assigns quote number (Q00001, Q00002, etc.)
   - Email notification sent to operators
5. Receives priced quote within 24 hours
6. Can accept, decline, or request revisions

**Operator + Admin Flow:**
1. Operator picks pending quote
2. Reviews all line items (DXF files):
   - If issues found → marks "needs attention" with public comment
   - If all feasible → marks "ready for pricing":
     * Selects material from inventory
     * Sets cutting service price per item
     * Sets production time estimate (adjustable throughout process)
   - Can add internal comments (admin/operator only)
   
3. If "needs attention":
   - Customer sees public comment about issues
   - Email sent to customer about required changes
   - Customer can upload new files or comment back
   - Returns to operator queue for re-review
   - Cycle continues until ready
   
4. Once "ready for pricing" → Admin reviews:
   - System shows: material cost + (cutting price × 2) as suggestion
   - Admin sets final customer price
   - Uploads quote PDF (generated on external platform)
   - Sends to customer via email with quote number

5. Customer response to priced quote:
   - Accept → redirect to payment
   - Decline → mark closed
   - Request revision → returns to operator/admin for adjustment

## Revision Flow

**Revisions after quote is priced:**
- Available when quote is in "sent" status
- Customer requests revision with notes/new files
- System creates new revision number (Q00001-R1, Q00001-R2, etc.)
- Operator adjusts (material/cutting price/timeline)
- Admin sets new customer prices
- Sends revised quote with revision number
- Customer can accept, decline, or request further revisions
- Each revision tracked in quote history with its own PDF
- Admin can decline excessive revision requests via comments

Note: "Needs attention" phase before pricing allows unlimited back-and-forth

## Pricing Rules
- System suggests: Material cost + (Cutting service price × 2)
- Material costs: predefined per sheet type/size in inventory
- Cutting service price: set by operator per item
- Admin manually sets all final customer prices
- Bulk discounts: admin applies as needed

## Key Rules
- Quote numbering: Sequential Q00001, Q00002, etc.
  - Revisions: Q00001-R1, Q00001-R2, etc. (original has no suffix)
- Order numbering: Sequential F00001, F00002, etc.
- Each DXF = one line item
- One operator handles entire quote
- Manual pricing by admin (system shows suggestions)
- Unlimited revisions allowed (admin discretion on when to stop)
- 24-hour quote turnaround target
- "Needs attention" allows unlimited back-and-forth before pricing
- Two separate comment sections (public and internal)
- No partial orders - all items or nothing
- Comments carry from quote to order
- Simple status progression, no complex workflows
- Quotes expire after 14 days (non-editable, can be deleted if no orders)
- Stock/capacity issues handled via timeline adjustment + public comments

## Quote Statuses
- **pending**: New quote awaiting operator review
- **needs attention**: Issues found, customer action needed
- **ready for pricing**: Operator approved, awaiting admin pricing
- **sent**: Priced and sent to customer
- **accepted**: Customer accepted, awaiting payment
- **done**: Paid and order created (locked)
- **declined**: Customer declined quote
- **expired**: Quote older than 14 days (view-only, non-editable)

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
1. Customer accepts quote → Admin uploads invoice PDF (required)
2. Customer redirected to Mollie payment
3. Mollie payment page (quote ID in metadata)
4. Payment success → Mollie webhook triggers:
   - Creates production order with order number (F00001, F00002, etc.)
   - Order references accepted quote revision (e.g., "from Q00001-R2")
   - Quote marked as "done" (locked, non-editable)
   - Admin uploads order confirmation PDF (required)
   - Email confirmation sent to customer with order number
5. Payment failed → quote stays "accepted", customer can retry

**Manual payment option (admin only):**
- Admin uploads invoice PDF to "accepted" quote (required)
- Admin can mark quote as paid manually
- Creates order same as webhook flow
- Admin uploads order confirmation PDF (required)
- Payment method tracked: "online" or "manual"

**Order rules:**
- Orders only created after successful payment
- Quote becomes "done" and locked after order creation
- Quotes can only be deleted if no orders are linked
- Expired quotes can be deleted (for cleanup) but kept for history
- Each order links back to its originating quote
- Orders inherit files and specifications from accepted quote revision
- Order tracks which revision was accepted (e.g., Q00001-R2)
- Production estimate carries from quote to order (adjustable)

## Production Flow

**Operator workflow:**
1. Views order queue (all paid orders)
2. Picks order → marks "in production"
3. Cuts all items according to specifications
4. When complete → marks "ready for shipping"
   - Email notification sent to admin
5. Adds public comment if any issues arise

**Admin workflow:**
1. Sees "ready for shipping" orders
2. Arranges shipping or customer pickup
3. Adds tracking number or pickup details
4. Marks as "shipped" or "picked up"
   - Email sent to customer with tracking/pickup info
5. Order auto-completes after delivery confirmation (or manual)

## Order Statuses
- **pending production**: Paid, waiting in queue
- **in production**: Operator actively cutting
- **ready for shipping**: Cut complete, awaiting dispatch
- **shipped**: Out for delivery with tracking
- **picked up**: Customer collected from facility
- **completed**: Delivered/collected successfully

## Order Visibility
- **Operator sees**: Order details, files, quantities, deadline, production estimate (adjustable), public + internal comments
- **Operator never sees**: Customer prices, payment details
- **Admin sees**: Everything including shipping details and payment info
- **Customer sees**: Order status, updated production estimate, tracking info, public comments

## Shipping/Delivery
- **Simple manual process:**
  - Admin coordinates with shipping provider
  - Updates order with tracking/pickup info
  - Customer notified of shipping details
  - No automated label generation
  - No complex logistics integrations

## Comments on Orders
- Same system as quotes:
  - **Public comments**: For production updates, issues
  - **Internal comments**: For team coordination
- Comments from quote carry over to order for context

## Document Management

**PDF documents (admin uploads manually):**
- Generated on external platform, uploaded at key stages
- Types: Quote, Order Confirmation, Invoice
- Packing slip: Physical only (included with shipment)

**Upload points:**
1. **Quote PDF**: Required when sending priced quote (includes revision number if applicable)
2. **Invoice PDF**: Required after quote acceptance (references specific revision)
3. **Order Confirmation PDF**: Required after payment success (shows quote revision accepted)

**Document visibility:**
- **Admin**: Can upload and view all documents
- **Customer**: Can download their documents from quote/order pages
- **Operator**: No access to documents (not needed for production)

**Simple rules:**
- No auto-generation (admin generates externally)
- No document editing (upload only)
- No versioning (latest upload replaces previous)
- Customer always has access to their documents
- Document structure ready for future email automation

## Notifications

**Email notifications sent automatically at:**
- New quote created → Operators notified with quote number
- Quote needs attention → Customer notified with required changes
- Quote sent → Customer receives quote with Q-number (or revision Q00001-R1)
- Revision sent → Customer receives updated quote with revision number
- Quote accepted → Admin notified with specific revision accepted
- Payment received → Customer receives order confirmation with F-number
- Order ready for shipping → Admin notified
- Order shipped/pickup ready → Customer receives tracking/pickup details

**All emails include relevant reference numbers:**
- Quotes: Q00001 (original), Q00001-R1, Q00001-R2 (revisions)
- Orders: F00001 (references accepted quote revision)