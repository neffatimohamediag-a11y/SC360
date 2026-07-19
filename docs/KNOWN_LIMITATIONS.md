# Known Limitations

- The first build does not persist full daily snapshots; only a small import summary is written to browser local storage.
- Text-formatted ASN and staggered-delivery quantities are not fully allocated by date.
- Customer and revenue impact are not present in the supplied Expedite report, so the app focuses on quantity and production-cell exposure.
- Constraint rules are an initial operational model and should be calibrated with planners.
- “Create recovery mission” is a UI action in this release; workflow persistence comes next.
