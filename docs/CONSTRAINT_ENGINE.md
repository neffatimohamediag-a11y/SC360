# Constraint Engine v1

The first release deliberately uses transparent rules so planners can understand why an issue was raised.

1. Past Due > 0 → Past Due constraint.
2. Past Due + current-week demand > visible commitment → Current-week shortage.
3. Current-week demand exists with no promise and no ASN → Missing commitment.
4. Promised quantity is below current-week demand → Insufficient promise.
5. Supplier message contains risk language → Supplier risk signal.

`visible commitment` is currently the greater of numeric Promised Qty and Qty Due. ASN text is used as an evidence flag, but free-text ASN quantities are not yet fully normalized.
