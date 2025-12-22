# ADR-001: Monolithic Add-in Architecture with Modular Frontend

## Status
Accepted

## Context
Fusion System Blocks is a Fusion 360 add-in that requires tight integration with the Fusion 360 API (Python) while delivering a rich, interactive user interface (HTML/JavaScript). The Fusion 360 add-in environment imposes specific constraints:
- Single process execution for the Python backend.
- `adsk.core` and `adsk.fusion` libraries are only available within this process.
- UI must be rendered via `UI.palettes` which uses a web view.

We needed to decide how to structure the application to balance code maintainability with these platform constraints.

## Decision
We have adopted a **Monolithic Backend with Modular Frontend** architecture.

### Backend (Python)
- **Single Entry Point:** `Fusion_System_Blocks.py` serves as the single entry point and controller. It manages the add-in lifecycle (start/stop), command definitions, and event handling.
- **Logic Separation:** Core logic is separated into `src/diagram_data.py` (and potentially other modules) but is imported and orchestrated by the main script.
- **No Microservices:** Due to the embedded nature of the add-in, a microservices approach is over-engineered and technically infeasible for direct API access.

### Frontend (JavaScript)
- **Modular Design:** The frontend is split into distinct modules (`core/`, `ui/`, `features/`, `interface/`) to manage complexity.
- **Bridge Pattern:** Communication between Python and JS is handled via a strict message-passing bridge (`interface/python-bridge.js` <-> `PaletteHTMLEventHandler`).

## Consequences

### Positive
- **Simplicity:** Easy to package and deploy as a single folder.
- **Performance:** Direct access to Fusion API without inter-process communication overhead (except for the UI bridge).
- **State Management:** Simplified state management as the Python process persists for the session duration.

### Negative
- **Coupling:** The backend can become tightly coupled to the Fusion API, making it hard to test logic in isolation (mitigated by separating `diagram_data.py`).
- **UI Latency:** The asynchronous nature of the Palette bridge can introduce slight latency in UI updates compared to native OS controls.

## Compliance
- **Well-Architected Framework:** Aligns with "Operational Excellence" by simplifying deployment and "Performance Efficiency" by minimizing IPC.
