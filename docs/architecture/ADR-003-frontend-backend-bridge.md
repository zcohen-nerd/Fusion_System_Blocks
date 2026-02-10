# ADR-003: Frontend-Backend Communication Bridge

## Status
Accepted

## Context
The add-in's UI runs in a web context (Chromium-based palette), while the logic runs in a Python context. They cannot share memory. We need a reliable mechanism for them to communicate.
Fusion 360 provides `palette.sendInfoToHTML` (Python -> JS) and `adsk.core.HTMLEventHandler` (JS -> Python).

## Decision
We implement a **Command-Dispatch Bridge Pattern**.

### Mechanism
1.  **JS -> Python:** The frontend sends a JSON stringified object `{ action: "command_name", ...data }` via `adsk.fusionSendData`.
2.  **Python -> JS:** The backend receives this in `PaletteHTMLEventHandler`. It uses a dispatcher method to route the `action` to a specific handler function (e.g., `_handle_save_diagram`).
3.  **Response:** The backend returns a JSON stringified response directly to the `htmlArgs.returnData` property, which the JS promise resolves with.

## Rationale
- **Asynchronous:** Matches the web's event-driven nature.
- **Structured:** Enforcing a specific JSON structure (`action`, `data`) prevents "spaghetti code" in event handlers.
- **Error Handling:** The bridge wraps all calls in try/catch blocks to ensure that backend errors are serialized and sent back to the frontend for display, rather than crashing the add-in silently.

## Consequences

### Positive
- **Decoupling:** The frontend doesn't need to know *how* the backend implements a command, just the API contract.
- **Debuggability:** All messages are JSON, making them easy to log and inspect.
- **Shared Constants:** `BridgeAction` / `BridgeEvent` enums (`fsb_core/bridge_actions.py`) and their JavaScript mirror (`src/types/bridge-actions.js`) eliminate magic strings across both layers.

### Negative
- **Serialization Cost:** All data must be serialized to JSON, which can be slow for very large datasets. _Mitigation:_ delta serialization (`fsb_core/delta.py`, `src/utils/delta-utils.js`) sends only JSON-Patch style diffs for incremental saves, reducing payload size.
- **Complexity:** Requires boilerplate code on both sides to marshal/unmarshal data.

## Compliance
- **Security:** Input validation is performed on the Python side (`json.loads` and schema validation) before acting on data, mitigating injection risks from the web view.
