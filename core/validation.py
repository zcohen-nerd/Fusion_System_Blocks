"""Graph validation with structured error reporting.

This module provides comprehensive validation for System Blocks graphs,
detecting structural issues, invalid references, and design rule violations.

BOUNDARY: This module contains NO Fusion 360 dependencies. All validation
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
from typing import Any, Dict, List, Optional, Set

from .models import Block, Graph, Port, PortDirection


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
    block_id: Optional[str] = None
    port_id: Optional[str] = None
    connection_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
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


def validate_graph(graph: Graph) -> List[ValidationError]:
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
    errors: List[ValidationError] = []

    # Run all validation checks
    errors.extend(_validate_block_ids(graph))
    errors.extend(_validate_port_ids(graph))
    errors.extend(_validate_connections(graph))
    errors.extend(_detect_cycles(graph))

    return errors


def _validate_block_ids(graph: Graph) -> List[ValidationError]:
    """Check for duplicate block IDs and empty names.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: List[ValidationError] = []
    seen_ids: Dict[str, Block] = {}

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


def _validate_port_ids(graph: Graph) -> List[ValidationError]:
    """Check for duplicate port IDs across the graph.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: List[ValidationError] = []
    seen_port_ids: Dict[str, tuple[str, str]] = {}  # port_id -> (block_id, port_name)

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


def _validate_connections(graph: Graph) -> List[ValidationError]:
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
    errors: List[ValidationError] = []
    block_ids: Set[str] = {block.id for block in graph.blocks}
    seen_connections: Set[tuple[str, str, str, str]] = set()

    # Build port lookup: block_id -> set of port_ids
    port_lookup: Dict[str, Set[str]] = {}
    for block in graph.blocks:
        port_lookup[block.id] = {port.id for port in block.ports}

    for conn in graph.connections:
        # Check for missing source block
        if conn.from_block_id not in block_ids:
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

        # Check for missing target block
        if conn.to_block_id not in block_ids:
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


def _validate_port_directions(graph: Graph) -> List[ValidationError]:
    """Check that connected ports have compatible directions.

    A valid connection should go from an OUTPUT/BIDIRECTIONAL port
    to an INPUT/BIDIRECTIONAL port.

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors found.
    """
    errors: List[ValidationError] = []

    # Build port lookup: port_id -> Port
    port_by_id: Dict[str, Port] = {}
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


def _detect_cycles(graph: Graph) -> List[ValidationError]:
    """Detect cycles in the connection graph.

    Uses depth-first search to find cycles. Cycles may indicate
    design issues in certain contexts (e.g., data flow graphs).

    Args:
        graph: The graph to validate.

    Returns:
        List of validation errors if cycles are found.
    """
    errors: List[ValidationError] = []

    # Build adjacency list
    adjacency: Dict[str, List[str]] = {block.id: [] for block in graph.blocks}
    for conn in graph.connections:
        if conn.from_block_id in adjacency:
            adjacency[conn.from_block_id].append(conn.to_block_id)

    # Track visit state: 0=unvisited, 1=in_progress, 2=completed
    state: Dict[str, int] = {block_id: 0 for block_id in adjacency}
    cycle_blocks: List[str] = []

    def dfs(node: str, path: List[str]) -> bool:
        """Depth-first search for cycle detection."""
        if state[node] == 1:  # Back edge found - cycle
            cycle_blocks.extend(path)
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


def has_errors(errors: List[ValidationError]) -> bool:
    """Check if the error list contains any errors.

    Args:
        errors: List of validation errors.

    Returns:
        True if the list is non-empty.
    """
    return len(errors) > 0


def filter_by_code(
    errors: List[ValidationError], code: ValidationErrorCode
) -> List[ValidationError]:
    """Filter errors by a specific error code.

    Args:
        errors: List of validation errors.
        code: The error code to filter by.

    Returns:
        List of errors matching the specified code.
    """
    return [e for e in errors if e.code == code]


def get_error_summary(errors: List[ValidationError]) -> str:
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
