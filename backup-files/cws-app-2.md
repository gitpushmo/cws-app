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
   - Checks feasibility (if impossible, adds rejection reason - customer visible)
   - For feasible items:
     * Selects material from inventory
     * Sets cutting service price per item
   - Sets production time for entire quote
   - Adds comments if needed (customer visible)
   
3. Admin reviews before sending:
   - System shows: material cost + (cutting price × 2) as suggestion
   - Admin sets final customer price
   - Sends to customer (or rejects if not feasible)

4. Customer response:
   - Accept → redirect to payment
   - Decline → mark closed
   - Request revision → one revision allowed

## Revision Flow

**One revision allowed per quote:**
- Customer adds revision notes and/or uploads new files (.dxf/.pdf)
- Operator reviews changes and adjusts (material/cutting price/timeline)
- Admin sets new customer prices
- Sends revised quote
- Customer must accept or decline (no further revisions)

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
- One revision total allowed
- 24-hour quote turnaround target
- Customer can comment on quotes anytime
- Customer can update files during revision

## Visibility
- **Operator sees**: Files, quantities, materials needed
- **Operator never sees**: Material costs, customer prices, margins
- **Admin sees**: Everything (material costs, cutting service prices, margins, final prices)
- **Customer sees**: Item prices, total, production timeline, operator comments

## Order Flow

**After quote acceptance:**
1. Customer accepts quote → redirected to Mollie payment
2. Mollie payment page (quote ID in metadata)
3. Payment success → Mollie webhook triggers:
   - Creates production order
   - Quote marked as "done" (locked, non-editable)
   - Customer receives order confirmation
4. Payment failed → quote stays "accepted", customer can retry

**Order rules:**
- Orders only created after successful payment
- Quote becomes "done" and locked after order creation
- Quotes can only be deleted if no orders are linked
- Each order links back to its originating quote