## Roles
- **admin**: your team (full control, pricing decisions)
- **operator**: engineers who cut panels (your team or partners)
- **customer**: requesting waterjet cutting services

## Quote Flow

**Customer Journey:**
1. Customer visits app → signup → completes profile:
   - Company name (optional), First name, Last name, Phone number
   - Address (street, street 2, city, state/province, postal/zip, country)
   - Notes field
2. Requests quote → uploads:
   - .dxf files (cutting patterns - required, multiple allowed)
   - .pdf files (technical drawings - required, multiple allowed)
   - Quantity needed per DXF (number input for each file)
   - Additional notes (special requirements, deadline)
3. System auto-creates line items from each DXF (filename = item name)
4. Submits → status: "pending" → locked for editing → redirects to /quotes/[id]
5. Sees estimated production time once operator adds it
6. Can "request revision" → creates new version

**Admin + Operator Flow:**
1. Admin reviews new quote → assigns to operator(s)

2. Operators review DXF patterns and either:
   - Mark as "not feasible" → back to admin → reject to customer
   - OR proceed with each line item (each DXF):
     * Select material needed (carbon panel type, thickness, size)
     * Enter cutting cost per item (what they charge you for cutting)
     * Enter total estimated production time (all items together)
     * Internal comments if needed

3. Admin reviews feasible quotes:
   - Sees all line items with materials and cutting costs
   - Sets customer price per item (material cost + cutting cost + margin)
   - Submits quote to customer

4. Customer response:
   - Accept → status: "accepted" → admin creates production order
   - Decline → status: "declined"
   - Request revision → see revision flow

## Revision Flow

**Customer requests revision with:**
- Reason selection: "Price too high" / "Different material" / "Quantity change" / "Other"
- Comments field (what they want changed)
- Creates quote v2 (original remains for reference)

**Admin reviews revision request:**

1. **Price negotiation** (customer wants lower price):
   - Admin adjusts margin directly OR
   - Sends back to operator requesting cheaper material options
   - Operator suggests alternatives → admin reprices → sends v2

2. **Material change** (different thickness/type):
   - Goes to operator → selects new materials → recalculates cutting cost
   - Admin sets new customer prices → sends v2

3. **Quantity change**:
   - Goes to operator → verifies feasibility at new quantity
   - May affect cutting costs (bulk efficiency)
   - Admin reprices → sends v2

4. **Other changes**:
   - Admin decides if it needs operator input or just admin adjustment
   - Proceeds accordingly

**Revision rules:**
- Each revision creates new version (v1, v2, v3...)
- Previous versions visible but inactive
- Major scope changes (new DXF files) = new quote, not revision
- Customer can comment on each revision
- No limit on revisions (but admin can decline further revisions)

## Key Rules
- Each DXF file = automatic line item with quantity
- Materials are YOUR panels (operators select what's needed)
- Operators only set CUTTING costs (not material costs)
- Customer sees total price per item (materials + cutting + margin combined)
- Single production time estimate for entire order
- Operators can reject at feasibility stage
- Revisions maintain full history

## Visibility Rules
- **Operators see**: DXF files, quantities, materials needed, cutting costs, revision reason
- **Operators NEVER see**: customer prices or your margins
- **Admin sees**: everything (material costs, cutting costs, margins, final prices, revision history)
- **Customer sees**: price per item, total price, production time estimate, their revision history