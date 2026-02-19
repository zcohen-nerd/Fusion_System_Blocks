"""Graph validation with structured error reporting.

This module provides comprehensive validation for System Blocks graphs,
detecting structural issues, invalid references, and design rule violations.

BOUNDARY: This module contains NO Fusion dependencies. All validation
logic operates on pure Python data structures and can be tested independently.

Functions:
    validate_graph: Main validation entry point returning structured errors.

Classes:
    ValidationErrorCode: Enum of all possible validation error types.
    ValidationError: Structured error with code, message, and context.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any

from .models import Block, Graph, Group, Port, PortDirection


class ValidationErrorCode(Enum):
    """Enumeration of all validation error types.

    Each code represents a specific type of validation failure with
    a consistent identifier for programmatic handling.
    """

    # Block-level errors
    DUPLICATE_BLOCK_ID = "DUPLICATE_BLOCK_ID"
    EMPTY_BLOCK_NAME = "EMPTY_BLOCK_NAME"
    INVALID_BLOCK_POSITION = "INVALID_BLOCK_POSITION"

    # Port-level errors
    DUPLICATE_PORT_ID = "DUPLICATE_PORT_ID"
    MISSING_PORT = "MISSING_PORT"
    INVALID_PORT_REFERENCE = "INVALID_PORT_REFERENCE"

    # Connection-level errors
    MISSING_SOURCE_BLOCK = "MISSING_SOURCE_BLOCK"
    MISSING_TARGET_BLOCK = "MISSING_TARGET_BLOCK"
    MISSING_SOURCE_PORT = "MISSING_SOURCE_PORT"
    MISSING_TARGET_PORT = "MISSING_TARGET_PORT"
    SELF_CONNECTION = "SELF_CONNECTION"
    DUPLICATE_CONNECTION = "DUPLICATE_CONNECTION"
    INVALID_CONNECTION_DIRECTION = "INVALID_CONNECTION_DIRECTION"

    # Graph-level errors
    CYCLE_DETECTED = "CYCLE_DETECTED"
    DISCONNECTED_BLOCK = "DISCONNECTED_BLOCK"

    # Group-level errors
    DUPLICATE_GROUP_ID = "DUPLICATE_GROUP_ID"
    INVALID_GROUP_BLOCK_REFERENCE = "INVALID_GROUP_BLOCK_REFERENCE"
    INVALID_GROUP_PARENT_REFERENCE = "INVALID_GROUP_PARENT_REFERENCE"
    GROUP_BLOCK_ID_COLLISION = "GROUP_BLOCK_ID_COLLISION"
    CIRCULAR_GROUP_PARENT = "CIRCULAR_GROUP_PARENT"

    # Schema errors
    INVALID_SCHEMA_VERSION = "INVALID_SCHEMA_VERSION"


@dataclass
class ValidationError:
    """Structured validation error with context.

    Provides detailed information about a validation failure including
    the error code, human-readable message, and references to the
    affected graph elements.

    Attributes:
        code: The type of validation error.
        message: Human-readable description of the error.
        block_id: ID of the affected block, if applicable.
        port_id: ID of the affected port, if applicable.
        connection_id: ID of the affected connection, if applicable.
        details: Additional error-specific context.
    """

    code: ValidationErrorCode
    message: str
    block_id: str | None = None
    port_id: str | None = None
    connection_id: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert error to dictionary for serialization.

        Returns:
            Dictionary representation of the error.
        """
        return {
            "code": self.code.value,
            "message": self.message,
            "block_id": self.block_id,
            "port_id": self.port_id,
            "connection_id": self.connection_id,
            "details": self.details,
        }


def validate_graph(graph: Graph) -> list[ValidationError]:
    """Validate a graph and return all validation errors.

    Performs comprehensive validation including:
    - Duplicate block/port ID detection
    - Missing block/port reference validation
    - Connection validity checks
    - Cycle detection in directed connections
    - Port direction compatibility

    Args:
        graph: The Graph instance to validate.

    Returns:
        List of ValidationError instances. Empty list indicates valid graph.

    Example:
        >>> graph = Graph()
        >>> errors = validate_graph(graph)
        >>> if errors:
        ...     for error in errors:
        ...         print(f"{error.code.value}: {error.message}")
    """
    errors: list[ValidationError] = []

    # Run all validation checks
    errors.extend(_validate_block_ids(graph))
    errors.extend(_validate_port_ids(graph))
    errors.extend(_validate_connections(graph))
    errors.extend(_validate_groups(graph))
    errors.extend(_detect_cycles(graph))

    return errors


def _validate_block_ids(graph: Graph) -> list[ValidationError]:
    """Check for duplicate block IDs and empty names.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: list[ValidationError] = []
    seen_ids: dict[str, Block] = {}

    for block in graph.blocks:
        # Check for duplicate IDs
        if block.id in seen_ids:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.DUPLICATE_BLOCK_ID,
                    message=(
                        f"Duplicate block ID '{block.id}' found. "
                        f"Blocks '{seen_ids[block.id].name}' and '{block.name}' "
                        f"share the same ID."
                    ),
                    block_id=block.id,
                    details={
                        "first_block_name": seen_ids[block.id].name,
                        "second_block_name": block.name,
                    },
                )
            )
        else:
            seen_ids[block.id] = block

        # Check for empty names (warning-level, but included)
        if not block.name or not block.name.strip():
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.EMPTY_BLOCK_NAME,
                    message=f"Block with ID '{block.id}' has an empty name.",
                    block_id=block.id,
                )
            )

    return errors


def _validate_port_ids(graph: Graph) -> list[ValidationError]:
    """Check for duplicate port IDs across the graph.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: list[ValidationError] = []
    seen_port_ids: dict[str, tuple[str, str]] = {}  # port_id -> (block_id, port_name)

    for block in graph.blocks:
        for port in block.ports:
            if port.id in seen_port_ids:
                prev_block_id, prev_port_name = seen_port_ids[port.id]
                errors.append(
                    ValidationError(
                        code=ValidationErrorCode.DUPLICATE_PORT_ID,
                        message=(
                            f"Duplicate port ID '{port.id}' found in block "
                            f"'{block.name}'. Previously seen in block "
                            f"with ID '{prev_block_id}'."
                        ),
                        block_id=block.id,
                        port_id=port.id,
                        details={
                            "first_block_id": prev_block_id,
                            "first_port_name": prev_port_name,
                            "second_block_name": block.name,
                            "second_port_name": port.name,
                        },
                    )
                )
            else:
                seen_port_ids[port.id] = (block.id, port.name)

    return errors


def _validate_connections(graph: Graph) -> list[ValidationError]:
    """Validate all connections in the graph.

    Checks for:
    - Missing source/target blocks
    - Missing source/target ports
    - Self-connections
    - Duplicate connections
    - Direction compatibility

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: list[ValidationError] = []
    block_ids: set[str] = {block.id for block in graph.blocks}
    group_ids: set[str] = {g.id for g in graph.groups}
    # Valid connection endpoints include both blocks and groups
    valid_endpoint_ids: set[str] = block_ids | group_ids
    seen_connections: set[tuple[str, str, str, str]] = set()

    # Build port lookup: block_id -> set of port_ids
    port_lookup: dict[str, set[str]] = {}
    for block in graph.blocks:
        port_lookup[block.id] = {port.id for port in block.ports}

    for conn in graph.connections:
        # Check for missing source block (or group)
        if conn.from_block_id not in valid_endpoint_ids:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.MISSING_SOURCE_BLOCK,
                    message=(
                        f"Connection '{conn.id}' references non-existent "
                        f"source block '{conn.from_block_id}'."
                    ),
                    connection_id=conn.id,
                    details={"missing_block_id": conn.from_block_id},
                )
            )
            continue  # Skip further checks for this connection

        # Check for missing target block (or group)
        if conn.to_block_id not in valid_endpoint_ids:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.MISSING_TARGET_BLOCK,
                    message=(
                        f"Connection '{conn.id}' references non-existent "
                        f"target block '{conn.to_block_id}'."
                    ),
                    connection_id=conn.id,
                    details={"missing_block_id": conn.to_block_id},
                )
            )
            continue  # Skip further checks for this connection

        # Check for self-connection
        if conn.from_block_id == conn.to_block_id:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.SELF_CONNECTION,
                    message=(
                        f"Connection '{conn.id}' is a self-connection on "
                        f"block '{conn.from_block_id}'."
                    ),
                    connection_id=conn.id,
                    block_id=conn.from_block_id,
                )
            )

        # Check for missing source port (if specified)
        if conn.from_port_id:
            source_ports = port_lookup.get(conn.from_block_id, set())
            if conn.from_port_id not in source_ports:
                errors.append(
                    ValidationError(
                        code=ValidationErrorCode.MISSING_SOURCE_PORT,
                        message=(
                            f"Connection '{conn.id}' references non-existent "
                            f"port '{conn.from_port_id}' on source block "
                            f"'{conn.from_block_id}'."
                        ),
                        connection_id=conn.id,
                        block_id=conn.from_block_id,
                        port_id=conn.from_port_id,
                    )
                )

        # Check for missing target port (if specified)
        if conn.to_port_id:
            target_ports = port_lookup.get(conn.to_block_id, set())
            if conn.to_port_id not in target_ports:
                errors.append(
                    ValidationError(
                        code=ValidationErrorCode.MISSING_TARGET_PORT,
                        message=(
                            f"Connection '{conn.id}' references non-existent "
                            f"port '{conn.to_port_id}' on target block "
                            f"'{conn.to_block_id}'."
                        ),
                        connection_id=conn.id,
                        block_id=conn.to_block_id,
                        port_id=conn.to_port_id,
                    )
                )

        # Check for duplicate connections
        conn_key = (
            conn.from_block_id,
            conn.from_port_id or "",
            conn.to_block_id,
            conn.to_port_id or "",
        )
        if conn_key in seen_connections:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.DUPLICATE_CONNECTION,
                    message=(
                        f"Duplicate connection found between "
                        f"'{conn.from_block_id}' and '{conn.to_block_id}'."
                    ),
                    connection_id=conn.id,
                    details={
                        "from_block_id": conn.from_block_id,
                        "to_block_id": conn.to_block_id,
                    },
                )
            )
        else:
            seen_connections.add(conn_key)

    # Validate port direction compatibility
    errors.extend(_validate_port_directions(graph))

    return errors


def _validate_port_directions(graph: Graph) -> list[ValidationError]:
    """Check that connected ports have compatible directions.

    A valid connection should go from an OUTPUT/BIDIRECTIONAL port
    to an INPUT/BIDIRECTIONAL port.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: list[ValidationError] = []

    # Build port lookup: port_id -> Port
    port_by_id: dict[str, Port] = {}
    for block in graph.blocks:
        for port in block.ports:
            port_by_id[port.id] = port

    for conn in graph.connections:
        if conn.from_port_id and conn.to_port_id:
            from_port = port_by_id.get(conn.from_port_id)
            to_port = port_by_id.get(conn.to_port_id)

            if from_port and to_port:
                # Check direction compatibility
                from_valid = from_port.direction in (
                    PortDirection.OUTPUT,
                    PortDirection.BIDIRECTIONAL,
                )
                to_valid = to_port.direction in (
                    PortDirection.INPUT,
                    PortDirection.BIDIRECTIONAL,
                )

                if not from_valid:
                    errors.append(
                        ValidationError(
                            code=ValidationErrorCode.INVALID_CONNECTION_DIRECTION,
                            message=(
                                f"Connection '{conn.id}': Source port "
                                f"'{from_port.name}' has direction "
                                f"'{from_port.direction.value}' which cannot "
                                f"be a connection source."
                            ),
                            connection_id=conn.id,
                            port_id=conn.from_port_id,
                            details={
                                "port_direction": from_port.direction.value,
                                "expected": "output or bidirectional",
                            },
                        )
                    )

                if not to_valid:
                    errors.append(
                        ValidationError(
                            code=ValidationErrorCode.INVALID_CONNECTION_DIRECTION,
                            message=(
                                f"Connection '{conn.id}': Target port "
                                f"'{to_port.name}' has direction "
                                f"'{to_port.direction.value}' which cannot "
                                f"be a connection target."
                            ),
                            connection_id=conn.id,
                            port_id=conn.to_port_id,
                            details={
                                "port_direction": to_port.direction.value,
                                "expected": "input or bidirectional",
                            },
                        )
                    )

    return errors


def _validate_groups(graph: Graph) -> list[ValidationError]:
    """Validate all groups in the graph.

    Checks for:
    - Duplicate group IDs
    - Block IDs that reference non-existent blocks
    - Parent group IDs that reference non-existent groups

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: list[ValidationError] = []
    block_ids: set[str] = {block.id for block in graph.blocks}
    seen_group_ids: dict[str, Group] = {}
    group_ids: set[str] = {g.id for g in graph.groups}

    for group in graph.groups:
        # Duplicate group ID check
        if group.id in seen_group_ids:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.DUPLICATE_GROUP_ID,
                    message=(
                        f"Duplicate group ID '{group.id}' found. "
                        f"Groups '{seen_group_ids[group.id].name}'"
                        f" and '{group.name}' share the same ID."
                    ),
                    details={
                        "group_id": group.id,
                        "first_group_name": (seen_group_ids[group.id].name),
                        "second_group_name": group.name,
                    },
                )
            )
        else:
            seen_group_ids[group.id] = group

        # Validate block references
        for bid in group.block_ids:
            if bid not in block_ids:
                errors.append(
                    ValidationError(
                        code=(ValidationErrorCode.INVALID_GROUP_BLOCK_REFERENCE),
                        message=(
                            f"Group '{group.name}' references "
                            f"non-existent block '{bid}'."
                        ),
                        block_id=bid,
                        details={"group_id": group.id},
                    )
                )

        # Validate parent group reference
        if group.parent_group_id is not None and group.parent_group_id not in group_ids:
            errors.append(
                ValidationError(
                    code=(ValidationErrorCode.INVALID_GROUP_PARENT_REFERENCE),
                    message=(
                        f"Group '{group.name}' references "
                        f"non-existent parent group "
                        f"'{group.parent_group_id}'."
                    ),
                    details={
                        "group_id": group.id,
                        "parent_group_id": group.parent_group_id,
                    },
                )
            )

        # Check for group/block ID collisions
        if group.id in block_ids:
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.GROUP_BLOCK_ID_COLLISION,
                    message=(
                        f"Group '{group.name}' has ID '{group.id}' "
                        f"which collides with a block ID."
                    ),
                    details={"group_id": group.id},
                )
            )

    # Detect circular parent group references (A→B→A)
    errors.extend(_detect_group_parent_cycles(graph))

    return errors


def _detect_group_parent_cycles(graph: Graph) -> list[ValidationError]:
    """Detect cycles in the group parent hierarchy.

    A cycle occurs when following ``parent_group_id`` links eventually
    returns to a previously visited group (e.g. A→B→A or a self-reference).

    Args:
        graph: The graph whose groups should be checked.

    Returns:
        List of validation errors for any detected cycles.
    """
    errors: list[ValidationError] = []
    id_to_group: dict[str, Group] = {g.id: g for g in graph.groups}

    # Build parent map (only valid parents)
    parent_map: dict[str, str] = {}
    for group in graph.groups:
        pid = group.parent_group_id
        if pid is not None and pid in id_to_group:
            parent_map[group.id] = pid

    visited: set[str] = set()
    in_stack: set[str] = set()

    def _walk(gid: str) -> None:
        if gid in in_stack:
            # Collect the cycle chain
            chain = [gid]
            cur = parent_map.get(gid)
            while cur and cur != gid:
                chain.append(cur)
                cur = parent_map.get(cur)
            chain.append(gid)
            names = [id_to_group[c].name for c in chain if c in id_to_group]
            errors.append(
                ValidationError(
                    code=ValidationErrorCode.CIRCULAR_GROUP_PARENT,
                    message=(
                        "Circular parent group reference detected: "
                        + " → ".join(names)
                    ),
                    details={"group_ids": chain},
                )
            )
            return
        if gid in visited:
            return
        visited.add(gid)
        in_stack.add(gid)
        pid = parent_map.get(gid)
        if pid is not None:
            _walk(pid)
        in_stack.discard(gid)

    for gid in id_to_group:
        if gid not in visited:
            _walk(gid)

    return errors


def _detect_cycles(graph: Graph) -> list[ValidationError]:
    """Detect cycles in the connection graph.

    Uses depth-first search to find cycles. Cycles may indicate
    design issues in certain contexts (e.g., data flow graphs).

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors if cycles are found.
    """
    errors: list[ValidationError] = []

    # Build adjacency list
    adjacency: dict[str, list[str]] = {block.id: [] for block in graph.blocks}
    for conn in graph.connections:
        if conn.from_block_id in adjacency:
            adjacency[conn.from_block_id].append(conn.to_block_id)

    # Track visit state: 0=unvisited, 1=in_progress, 2=completed
    state: dict[str, int] = dict.fromkeys(adjacency, 0)
    cycle_blocks: list[str] = []

    def dfs(node: str, path: list[str]) -> bool:
        """Depth-first search for cycle detection."""
        if state[node] == 1:  # Back edge found - cycle
            # Only include the actual cycle, not the path leading to it.
            # e.g. for path [A, B, C] hitting node B, slice to [B, C].
            try:
                start_index = path.index(node)
                cycle_blocks.extend(path[start_index:])
            except ValueError:
                cycle_blocks.extend(path)  # Fallback
            return True
        if state[node] == 2:  # Already fully processed
            return False

        state[node] = 1  # Mark as in progress
        path.append(node)

        for neighbor in adjacency.get(node, []):
            if neighbor in adjacency and dfs(neighbor, path):
                return True

        path.pop()
        state[node] = 2  # Mark as completed
        return False

    # Run DFS from each unvisited node
    for block_id in adjacency:
        if state[block_id] == 0:
            if dfs(block_id, []):
                # Get block names for the error message
                cycle_names = []
                for bid in cycle_blocks:
                    block = graph.get_block_by_id(bid)
                    if block:
                        cycle_names.append(block.name or bid)

                errors.append(
                    ValidationError(
                        code=ValidationErrorCode.CYCLE_DETECTED,
                        message=(
                            f"Cycle detected in graph involving blocks: "
                            f"{' -> '.join(cycle_names)}"
                        ),
                        details={
                            "cycle_block_ids": cycle_blocks.copy(),
                            "cycle_block_names": cycle_names,
                        },
                    )
                )
                break  # Report first cycle found

    return errors


def has_errors(errors: list[ValidationError]) -> bool:
    """Check if the error list contains any errors.

    Args:
        errors: List of validation errors.

    Returns:
        True if the list is non-empty.
    """
    return len(errors) > 0


def filter_by_code(
    errors: list[ValidationError], code: ValidationErrorCode
) -> list[ValidationError]:
    """Filter errors by a specific error code.

    Args:
        errors: List of validation errors.
        code: The error code to filter by.

    Returns:
        List of errors matching the specified code.
    """
    return [e for e in errors if e.code == code]


def get_error_summary(errors: list[ValidationError]) -> str:
    """Generate a human-readable summary of validation errors.

    Args:
        errors: List of validation errors.

    Returns:
        Multi-line string summarizing all errors.
    """
    if not errors:
        return "No validation errors found."

    lines = [f"Found {len(errors)} validation error(s):"]
    for i, error in enumerate(errors, 1):
        lines.append(f"  {i}. [{error.code.value}] {error.message}")

    return "\n".join(lines)
