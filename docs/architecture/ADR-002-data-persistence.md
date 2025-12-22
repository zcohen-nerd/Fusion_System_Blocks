# ADR-002: Data Persistence via Fusion 360 Attributes

## Status
Accepted

## Context
The add-in needs to persist the system diagram data (blocks, connections, layout) so that it travels with the Fusion 360 design file (`.f3d`).
Options considered:
1.  **External File:** Save a separate `.json` file alongside the `.f3d` file.
2.  **Custom Data:** Use Fusion 360's `attributes` API to embed data directly into the component.
3.  **Cloud Storage:** Save data to an external cloud database linked by Document ID.

## Decision
We chose **Option 2: Custom Data (Fusion 360 Attributes)**.
Specifically, we store the entire diagram as a serialized JSON string in a named attribute group `systemBlocks` on the root component of the active design.

## Rationale
- **Portability:** The diagram data is embedded in the CAD file. If a user shares the `.f3d` file, the diagram goes with it automatically. No broken links or missing sidecar files.
- **Version Control:** Fusion 360's native versioning handles the data. Reverting to a previous version of the design also reverts the diagram state.
- **API Support:** The `attributes` API is robust and allows for large string storage (though we must be mindful of limits).

## Consequences

### Positive
- **Zero-Config Sharing:** Users don't need to manage separate files.
- **Atomic Saves:** Diagram saves happen within the Fusion document context.

### Negative
- **Data Size Limits:** Extremely large diagrams might hit attribute size limits (though rare for typical system diagrams).
- **Opaque Data:** The data is hidden inside the binary `.f3d` file and cannot be easily inspected without opening Fusion 360 (unlike a plain text file).
- **Serialization Overhead:** Parsing and serializing large JSON strings on every save/load can be a performance bottleneck.

## Mitigation
- We implement validation (`diagram_data.validate_diagram`) before saving to ensure data integrity.
- Future optimization: Compress the JSON string if size becomes an issue.
