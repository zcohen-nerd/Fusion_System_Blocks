---
description: 'Diagram editor block-creation and metadata contract patterns'
applyTo: 'src/**/*.js'
---

# Diagram Editor Memory

Keep block creation behavior consistent so metadata, export flows, and UI editing tools stay aligned.

## Maintain default engineering attribute slots at block creation

When implementing or refactoring `addBlock`-style creation paths, initialize a shared default attributes map with these keys as empty strings:

- Manufacturer
- Part Number
- Datasheet URL
- Rating / Specification
- Cost
- Lead Time
- Notes

Use a single merge path that starts with defaults and then applies caller attributes.

```javascript
const defaultAttributes = {
  'Manufacturer': '',
  'Part Number': '',
  'Datasheet URL': '',
  'Rating / Specification': '',
  'Cost': '',
  'Lead Time': '',
  'Notes': ''
};
const attributes = { ...defaultAttributes, ...(blockData.attributes || {}) };
```

## Preserve caller overrides without dropping required keys

If object spreads or late assignment can overwrite `attributes`, re-apply the default+incoming merge after the spread sequence so caller values still win while all required keys remain present.
