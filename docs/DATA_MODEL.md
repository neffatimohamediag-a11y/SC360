# SC360 Canonical Data Model

- Snapshot: the imported daily report.
- ExpediteRow: buyer, supplier, part, description, production cell, past due, weekly demand, PO, promise, ASN and supplier message.
- Constraint: a rule-generated operational signal linked to an ExpediteRow.
- SupplierRisk: aggregate of constraints by supplier.
- CellRisk: aggregate of constraints by production cell.
- Mission: the planner's action view generated from a selected constraint.
