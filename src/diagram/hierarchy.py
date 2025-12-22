"""Hierarchical diagram functions.

Provides support for hierarchical block diagrams where blocks can contain
child diagrams, enabling multi-level system modeling.
"""

from typing import Dict, List, Any, Optional


def create_child_diagram(parent_block: Dict[str, Any]) -> Dict[str, Any]:
    """Create a child diagram for a parent block.

    Args:
        parent_block: The parent block to attach child diagram to

    Returns:
        The created child diagram
    """
    from .core import create_empty_diagram

    child_diagram = create_empty_diagram()
    parent_block["childDiagram"] = child_diagram
    return child_diagram


def has_child_diagram(block: Dict[str, Any]) -> bool:
    """Check if a block has a child diagram.

    Args:
        block: The block to check

    Returns:
        True if block has a child diagram
    """
    return "childDiagram" in block and block["childDiagram"] is not None


def get_child_diagram(block: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Get the child diagram of a block.

    Args:
        block: The block to get child diagram from

    Returns:
        The child diagram or None
    """
    return block.get("childDiagram")


def compute_hierarchical_status(block: Dict[str, Any]) -> str:
    """Compute status considering child diagram status.

    The parent block's status is limited by the worst status in its
    child diagram. This ensures that a parent block can't be "Verified"
    if it has "Placeholder" children.

    Args:
        block: The block to compute status for

    Returns:
        Status string considering hierarchy
    """
    from .validation import compute_block_status

    # Start with block's own computed status
    base_status = compute_block_status(block)

    # If no child diagram, return base status
    if not has_child_diagram(block):
        return base_status

    child_diagram = get_child_diagram(block)
    child_blocks = child_diagram.get("blocks", [])

    # If child diagram is empty, treat as placeholder
    if not child_blocks:
        return "Placeholder"

    # Get worst status from child blocks
    status_priority = {
        "Placeholder": 0,
        "Planned": 1,
        "In-Work": 2,
        "Implemented": 3,
        "Verified": 4,
    }

    child_statuses = [
        compute_hierarchical_status(child) for child in child_blocks
    ]
    worst_child_status = min(
        child_statuses, key=lambda s: status_priority.get(s, 0)
    )

    # Parent status is limited by worst child status
    parent_priority = status_priority.get(base_status, 0)
    child_priority = status_priority.get(worst_child_status, 0)

    final_priority = min(parent_priority, child_priority)

    # Convert back to status string
    for status, priority in status_priority.items():
        if priority == final_priority:
            return status

    return "Placeholder"


def get_all_blocks_recursive(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Get all blocks including those in child diagrams.

    Args:
        diagram: The diagram to traverse

    Returns:
        List of all blocks in diagram and all nested child diagrams
    """
    all_blocks = []

    for block in diagram.get("blocks", []):
        all_blocks.append(block)

        # Recursively get blocks from child diagrams
        if has_child_diagram(block):
            child_diagram = get_child_diagram(block)
            child_blocks = get_all_blocks_recursive(child_diagram)
            all_blocks.extend(child_blocks)

    return all_blocks


def find_block_path(
    diagram: Dict[str, Any], target_block_id: str, path: List[str] = None
) -> Optional[List[str]]:
    """
    Find the hierarchical path to a specific block.

    Returns the path as a list of block IDs from the root diagram to the target block.

    Args:
        diagram: The diagram to search
        target_block_id: The block ID to find
        path: Current path (used for recursion)

    Returns:
        List of block IDs forming path to target, or None if not found
    """
    if path is None:
        path = []

    # Check current level blocks
    for block in diagram.get("blocks", []):
        if block["id"] == target_block_id:
            return path + [block["id"]]

        # Check child diagrams
        if has_child_diagram(block):
            child_diagram = get_child_diagram(block)
            child_path = find_block_path(
                child_diagram, target_block_id, path + [block["id"]])
            if child_path:
                return child_path

    return None


def validate_hierarchy_interfaces(parent_block: Dict[str, Any]) -> tuple:
    """
    Validate that parent block interfaces match child diagram interfaces.

    Args:
        parent_block: The parent block with child diagram

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    if not has_child_diagram(parent_block):
        return True, []  # No child diagram to validate

    errors = []
    parent_interfaces = {
        intf["name"]: intf for intf in parent_block.get("interfaces", [])}
    child_diagram = get_child_diagram(parent_block)

    # Collect all interfaces from child blocks
    child_interfaces = {}
    for child_block in child_diagram.get("blocks", []):
        for intf in child_block.get("interfaces", []):
            # Interface name should match and types should be compatible
            intf_name = intf["name"]
            if intf_name in child_interfaces:
                continue  # Already found this interface
            child_interfaces[intf_name] = intf

    # Check that parent interfaces have compatible child interfaces
    for parent_intf_name, parent_intf in parent_interfaces.items():
        parent_kind = parent_intf.get("kind", "")
        parent_direction = parent_intf.get("direction", "")

        # Find compatible child interface (same kind, opposite direction)
        compatible_child = None
        for child_intf in child_interfaces.values():
            child_kind = child_intf.get("kind", "")
            child_direction = child_intf.get("direction", "")

            # Check if kinds match and directions are compatible
            if child_kind == parent_kind:
                # Output should match with Input, Input with Output, bidirectional with anything
                if (
                    (parent_direction == "output" and child_direction == "input")
                    or (parent_direction == "input" and child_direction == "output")
                    or parent_direction == "bidirectional"
                    or child_direction == "bidirectional"
                ):
                    compatible_child = child_intf
                    break

        if not compatible_child:
            errors.append(
                f"Parent interface '{parent_intf_name}' has no corresponding interface")

    return len(errors) == 0, errors
