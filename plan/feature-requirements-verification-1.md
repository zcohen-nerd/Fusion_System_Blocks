---
goal: "Implement Milestone 18: Requirements & Verification + Visual Version Control"
version: 1.0
date_created: 2026-02-10
last_updated: 2026-02-10
owner: zcohen-nerd
status: 'In progress'
tags: [feature, milestone, requirements, verification, version-control]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Milestone 18 adds a **Requirements & Verification** engine and foundational **Visual Version Control** capabilities to Fusion System Blocks. System-level requirements (mass budgets, cost constraints, power limits) are defined on the `Graph`, evaluated against aggregated block attributes, and surfaced as pass/fail results to both the Python core and the JavaScript frontend. Version control primitives (snapshots, fingerprinting, diffing) enable future history tracking and undo-at-scale features.

This plan covers five implementation tasks spanning core models, a requirements logic engine, a version control/diffing engine, Fusion adapter integration, and frontend UI.

## 1. Requirements & Constraints

- **REQ-001**: All new code must live in `fsb_core/` (pure Python, NO `adsk` imports) or `fusion_addin/` (adapter layer).
- **REQ-002**: Requirements must round-trip through `graph_to_dict` / `dict_to_graph` serialization.
- **REQ-003**: `RequirementResult.to_dict()` must produce camelCase keys for the JS bridge.
- **REQ-004**: `validate_requirements(graph)` must handle missing attributes, non-numeric values, and empty graphs gracefully.
- **REQ-005**: `block_fingerprint()` must be deterministic and change-sensitive (name, attributes, ports).
- **REQ-006**: All new public symbols must be exported from `fsb_core/__init__.py` and listed in `__all__`.
- **SEC-001**: No secrets or PII in any new module. Hashing uses `hashlib.sha256` (stdlib).
- **CON-001**: Python >= 3.9 compatibility — use `from __future__ import annotations` where needed.
- **CON-002**: Zero new external dependencies — stdlib only.
- **CON-003**: CI must pass: `ruff check .`, `ruff format --check .`, `mypy fsb_core/`, `pytest` on 3.9–3.12.
- **GUD-001**: Follow existing dataclass patterns in `fsb_core/models.py` (frozen where appropriate, `field(default_factory=...)` for mutable defaults).
- **GUD-002**: Test classes follow `Test<ClassName>` naming; test methods follow `test_<behavior>` naming.
- **PAT-001**: Serialization helpers follow `_<type>_to_dict` / `_parse_<type>` pattern from `serialization.py`.
- **PAT-002**: New modules include a module-level docstring with BOUNDARY note and function/class listing.

## 2. Implementation Steps

### Phase 1: Core Models (Task 1)

- GOAL-001: Add requirement, snapshot, and diffing dataclasses to `fsb_core/models.py`.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Add `ComparisonOperator` enum to `fsb_core/models.py` with values `LE="<="`, `GE=">="`, `EQ="=="`. Include `from __future__ import annotations`. | ✅ | 2026-02-10 |
| TASK-002 | Add `Requirement` dataclass to `fsb_core/models.py` with fields: `id`, `name`, `target_value`, `operator` (ComparisonOperator), `unit`, `linked_attribute`, `tolerance`. Add `check(actual_value) -> bool` method implementing LE/GE/EQ logic with tolerance. Support string operator coercion in `__post_init__`. | ✅ | 2026-02-10 |
| TASK-003 | Add `requirements: list[Requirement]` field to `Graph` dataclass with `field(default_factory=list)`. | ✅ | 2026-02-10 |
| TASK-004 | Add `block_fingerprint(block: Block) -> str` function: SHA-256 hash of `{name, block_type, attributes, ports}` serialized as sorted JSON, returning first 16 hex characters. | ✅ | 2026-02-10 |
| TASK-005 | Add `Snapshot` dataclass with fields: `id` (uuid4 default), `graph_json` (str), `timestamp` (datetime, default UTC now), `author` (str), `description` (str). | ✅ | 2026-02-10 |
| TASK-006 | Add `ConnectionChange` dataclass with fields: `connection_id`, `change_type`, `details`. Add `DiffResult` dataclass with fields: `added_block_ids`, `removed_block_ids`, `modified_block_ids` (all `list[str]`), `connection_changes` (`list[ConnectionChange]`). | ✅ | 2026-02-10 |
| TASK-007 | Update `fsb_core/__init__.py` to import and export all new symbols: `ComparisonOperator`, `Requirement`, `Snapshot`, `ConnectionChange`, `DiffResult`, `block_fingerprint`. | ✅ | 2026-02-10 |

### Phase 2: Requirements Logic Engine (Task 2)

- GOAL-002: Create `fsb_core/requirements.py` with requirements validation and attribute aggregation.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-008 | Create `fsb_core/requirements.py` with module docstring and BOUNDARY note. | ✅ | 2026-02-10 |
| TASK-009 | Implement `RequirementResult` dataclass with 9 fields (`requirement_id`, `requirement_name`, `passed`, `target_value`, `actual_value`, `delta`, `operator`, `unit`, `contributing_blocks`) and `to_dict()` method returning camelCase keys. | ✅ | 2026-02-10 |
| TASK-010 | Implement `aggregate_attribute(graph, attribute_key) -> tuple[float, list[str]]` — sums numeric values of the named attribute across all blocks, returns `(total, contributing_block_ids)`. Skips missing/non-numeric values gracefully. | ✅ | 2026-02-10 |
| TASK-011 | Implement `validate_requirements(graph) -> list[RequirementResult]` — iterates `graph.requirements`, calls `aggregate_attribute` for each, evaluates `requirement.check(actual)`, returns list of `RequirementResult`. | ✅ | 2026-02-10 |
| TASK-012 | Update `fsb_core/__init__.py` to import and export: `RequirementResult`, `aggregate_attribute`, `validate_requirements`. | ✅ | 2026-02-10 |

### Phase 3: Serialization Round-Trip (Task 2b)

- GOAL-003: Ensure requirements persist through JSON serialization.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-013 | Add `_requirement_to_dict(req: Requirement) -> dict` helper to `fsb_core/serialization.py`. | ✅ | 2026-02-10 |
| TASK-014 | Add `_parse_requirement(data: dict) -> Requirement` helper to `fsb_core/serialization.py`. | ✅ | 2026-02-10 |
| TASK-015 | Update `graph_to_dict()` to include `"requirements"` key in output. | ✅ | 2026-02-10 |
| TASK-016 | Update `dict_to_graph()` to parse `"requirements"` from input and populate `Graph.requirements`. | ✅ | 2026-02-10 |

### Phase 4: Tests for Tasks 1–2 (Task 2c)

- GOAL-004: Achieve comprehensive test coverage for all new models and the requirements engine.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-017 | Create `tests/test_requirements.py` with `TestComparisonOperator` (4 tests: enum values, string construction). | ✅ | 2026-02-10 |
| TASK-018 | Add `TestRequirement` (9 tests: defaults, LE/GE/EQ pass/fail/edge, operator coercion from string). | ✅ | 2026-02-10 |
| TASK-019 | Add `TestSnapshot` (3 tests: defaults, auto-timestamp, custom fields). | ✅ | 2026-02-10 |
| TASK-020 | Add `TestDiffResultModel` (2 tests: empty defaults, ConnectionChange fields). | ✅ | 2026-02-10 |
| TASK-021 | Add `TestBlockFingerprint` (4 tests: determinism, name sensitivity, attribute sensitivity, hex format). | ✅ | 2026-02-10 |
| TASK-022 | Add `TestAggregateAttribute` (5 tests: sum, missing key, non-numeric, empty graph, string coercion). | ✅ | 2026-02-10 |
| TASK-023 | Add `TestValidateRequirements` (8 tests: LE pass/fail, GE, EQ, multiple, empty, contributors, to_dict). | ✅ | 2026-02-10 |
| TASK-024 | Add `TestRequirementSerialization` (2 tests: round-trip, empty round-trip). | ✅ | 2026-02-10 |
| TASK-025 | Update `tests/test_serialization.py` — add `"requirements"` to expected keys in `test_graph_to_dict_structure`. | ✅ | 2026-02-10 |

### Phase 5: Version Control & Diffing Engine (Task 3)

- GOAL-005: Create `fsb_core/version_control.py` with snapshot management and graph diffing.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-026 | Create `fsb_core/version_control.py` with module docstring and BOUNDARY note. | | |
| TASK-027 | Implement `create_snapshot(graph, author, description) -> Snapshot` — serializes graph to JSON, creates Snapshot with auto-generated ID and timestamp. | | |
| TASK-028 | Implement `diff_graphs(old_graph, new_graph) -> DiffResult` — compares two graphs by block IDs, detects added/removed/modified blocks (using `block_fingerprint`), and detects connection changes. | | |
| TASK-029 | Implement `restore_snapshot(snapshot) -> Graph` — deserializes `snapshot.graph_json` back into a Graph object. | | |
| TASK-030 | Implement `SnapshotStore` class with `add(snapshot)`, `get(snapshot_id)`, `list_all()`, `get_latest()` — in-memory storage with ordered history. | | |
| TASK-031 | Update `fsb_core/__init__.py` to import and export: `create_snapshot`, `diff_graphs`, `restore_snapshot`, `SnapshotStore`. | | |
| TASK-032 | Create `tests/test_version_control.py` with comprehensive tests (target: 20+ tests covering snapshot creation, diffing added/removed/modified blocks, connection change detection, snapshot store CRUD, restore round-trip). | | |

### Phase 6: Fusion Adapter Integration (Task 4)

- GOAL-006: Wire requirements validation and version control into the Fusion bridge handler.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-033 | Add `BridgeAction.VALIDATE_REQUIREMENTS` and `BridgeAction.CREATE_SNAPSHOT` to `fsb_core/bridge_actions.py`. | | |
| TASK-034 | Add `BridgeAction` mirror entries to `src/types/bridge-actions.js`. | | |
| TASK-035 | Add `_handle_validate_requirements(args)` handler in `Fusion_System_Blocks.py` — calls `validate_requirements(graph)`, returns list of `RequirementResult.to_dict()`. | | |
| TASK-036 | Add `_handle_create_snapshot(args)` handler in `Fusion_System_Blocks.py` — calls `create_snapshot()`, stores in session `SnapshotStore`. | | |
| TASK-037 | Add `_handle_list_snapshots(args)` handler in `Fusion_System_Blocks.py`. | | |
| TASK-038 | Add `_handle_diff_snapshots(args)` handler in `Fusion_System_Blocks.py`. | | |

### Phase 7: Frontend Implementation (Task 5)

- GOAL-007: Add Requirements tab and History tab to the palette UI.

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-039 | Add "Requirements" tab to `src/ui/palette-tabs.js` tab definitions. | | |
| TASK-040 | Create `src/features/requirements-panel.js` — renders requirement results as a table with pass/fail badges, actual vs target values, and contributing block IDs. | | |
| TASK-041 | Wire "Validate Requirements" button in Requirements tab to `BridgeAction.VALIDATE_REQUIREMENTS`. | | |
| TASK-042 | Add "History" tab to `src/ui/palette-tabs.js` tab definitions. | | |
| TASK-043 | Create `src/features/history-panel.js` — renders snapshot list with timestamps, author, and description. Add "Create Snapshot" and "Compare" buttons. | | |
| TASK-044 | Wire snapshot buttons to `BridgeAction.CREATE_SNAPSHOT`, `BridgeAction.LIST_SNAPSHOTS`, `BridgeAction.DIFF_SNAPSHOTS`. | | |
| TASK-045 | Include new JS files in `src/palette.html` script tags. | | |

## 3. Alternatives

- **ALT-001**: Use a third-party constraint solver (e.g., `z3-solver`) for requirements validation. Rejected because it adds an external dependency and the current LE/GE/EQ logic with tolerance covers all identified use cases.
- **ALT-002**: Store snapshots in a SQLite database. Rejected in favor of in-memory `SnapshotStore` with JSON serialization to maintain zero-dependency and attribute-based persistence alignment.
- **ALT-003**: Implement full git-like branching for version control. Rejected as over-engineering for the current scope; linear snapshot history is sufficient for initial release.

## 4. Dependencies

- **DEP-001**: Python stdlib only (`hashlib`, `json`, `datetime`, `uuid`, `dataclasses`).
- **DEP-002**: Existing `fsb_core/models.py` dataclasses (`Block`, `Graph`, `Connection`).
- **DEP-003**: Existing `fsb_core/serialization.py` (`graph_to_dict`, `dict_to_graph`).
- **DEP-004**: Existing `fsb_core/bridge_actions.py` (`BridgeAction`, `BridgeEvent` enums).
- **DEP-005**: Existing `src/interface/python-bridge.js` for frontend-backend communication.

## 5. Files

- **FILE-001**: `fsb_core/models.py` — Added `ComparisonOperator`, `Requirement`, `Snapshot`, `ConnectionChange`, `DiffResult`, `block_fingerprint()`. Added `requirements` field to `Graph`.
- **FILE-002**: `fsb_core/requirements.py` — New file: `RequirementResult`, `aggregate_attribute()`, `validate_requirements()`.
- **FILE-003**: `fsb_core/__init__.py` — Updated imports and `__all__` with 9 new exports.
- **FILE-004**: `fsb_core/serialization.py` — Added `_requirement_to_dict()`, `_parse_requirement()`, updated `graph_to_dict()` and `dict_to_graph()`.
- **FILE-005**: `tests/test_requirements.py` — New file: 39 tests across 8 test classes.
- **FILE-006**: `tests/test_serialization.py` — Updated expected keys.
- **FILE-007**: `fsb_core/version_control.py` — Planned: `create_snapshot()`, `diff_graphs()`, `restore_snapshot()`, `SnapshotStore`.
- **FILE-008**: `tests/test_version_control.py` — Planned: 20+ tests for version control engine.
- **FILE-009**: `fsb_core/bridge_actions.py` — Planned: new bridge action constants.
- **FILE-010**: `src/types/bridge-actions.js` — Planned: JS mirror of new bridge actions.
- **FILE-011**: `Fusion_System_Blocks.py` — Planned: new bridge handlers.
- **FILE-012**: `src/features/requirements-panel.js` — Planned: Requirements tab UI.
- **FILE-013**: `src/features/history-panel.js` — Planned: History tab UI.
- **FILE-014**: `src/ui/palette-tabs.js` — Planned: new tab definitions.
- **FILE-015**: `src/palette.html` — Planned: new script includes.

## 6. Testing

- **TEST-001**: `tests/test_requirements.py` — 39 tests: ComparisonOperator (4), Requirement (9), Snapshot (3), DiffResult (2), block_fingerprint (4), aggregate_attribute (5), validate_requirements (8), serialization round-trip (2). **Status: PASSING.**
- **TEST-002**: `tests/test_serialization.py` — Updated `test_graph_to_dict_structure` to expect `"requirements"` key. **Status: PASSING.**
- **TEST-003**: `tests/test_version_control.py` — Planned: 20+ tests for snapshot creation, graph diffing, snapshot store, restore round-trip.
- **TEST-004**: CI pipeline validates all 557 tests pass on Python 3.9–3.12 with ruff + mypy.

## 7. Risks & Assumptions

- **RISK-001**: `block_fingerprint()` uses sorted JSON; if block attributes contain non-serializable types, fingerprinting will raise. Mitigated by the existing constraint that attributes are always JSON-compatible dicts.
- **RISK-002**: `aggregate_attribute()` silently skips non-numeric values. If a requirement references an attribute that is always non-numeric, the actual value will be 0.0 and may produce misleading results. Mitigated by documenting the behavior and adding a `contributing_blocks` field for transparency.
- **RISK-003**: In-memory `SnapshotStore` loses history on add-in restart. Acceptable for initial release; future work can persist snapshots to Fusion attributes.
- **ASSUMPTION-001**: Requirements target numeric attributes only (mass, cost, power, weight). String-based requirements are out of scope.
- **ASSUMPTION-002**: The JS bridge can handle the `RequirementResult.to_dict()` payload without modification to the existing bridge infrastructure.

## 8. Related Specifications / Further Reading

- [tasks.md](../tasks.md) — Full development backlog with milestone tracking.
- [docs/MILESTONES.md](../docs/MILESTONES.md) — Milestone status overview.
- [CHANGELOG.md](../CHANGELOG.md) — Version history.
- [fsb_core/models.py](../fsb_core/models.py) — Core data models.
- [fsb_core/requirements.py](../fsb_core/requirements.py) — Requirements engine implementation.
- [tests/test_requirements.py](../tests/test_requirements.py) — Test suite for requirements.
