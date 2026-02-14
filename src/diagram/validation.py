"""
Diagram validation and status tracking functions.

Provides schema validation, link validation, and block status computation.
"""

import json
import os
from typing import Any, Optional

# jsonschema is optional - not available in Fusion's Python environment
try:
    import jsonschema

    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False


def load_schema() -> dict[str, Any]:
    """
    Load the JSON schema for diagram validation.

    Returns:
        Dictionary containing the JSON schema
    """
    # Get the schema file path relative to this module
    current_dir = os.path.dirname(__file__)
    schema_path = os.path.join(current_dir, "..", "..", "docs", "schema.json")

    try:
        with open(schema_path) as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback basic schema if file doesn't exist
        return {
            "type": "object",
            "properties": {
                "schema": {"type": "string"},
                "blocks": {"type": "array"},
                "connections": {"type": "array"},
                "metadata": {"type": "object"},
            },
            "required": ["schema", "blocks", "connections"],
        }


def validate_diagram(diagram: dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate a diagram against the JSON schema.

    Args:
        diagram: The diagram to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    # If jsonschema is not available, do basic validation only
    if not JSONSCHEMA_AVAILABLE:
        # Basic validation: check required keys exist
        if not isinstance(diagram, dict):
            return False, "Diagram must be a dictionary"
        if "blocks" not in diagram:
            return False, "Diagram must have 'blocks' key"
        if "connections" not in diagram:
            return False, "Diagram must have 'connections' key"
        return True, None

    try:
        schema = load_schema()
        jsonschema.validate(diagram, schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Validation error: {e}"


def validate_links(block: dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate the links in a block.

    Args:
        block: The block to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    links = block.get("links", [])

    for link in links:
        target = link.get("target", "")

        if target == "cad":
            # CAD links must have occToken and docId
            if not link.get("occToken"):
                return (
                    False,
                    f"CAD link missing occToken in block '{block.get('name', 'Unknown')}'",
                )
            if not link.get("docId"):
                return (
                    False,
                    f"CAD link missing docId in block '{block.get('name', 'Unknown')}'",
                )

        elif target == "ecad":
            # ECAD links must have device
            if not link.get("device"):
                return (
                    False,
                    f"ECAD link missing device in block '{block.get('name', 'Unknown')}'",
                )

        elif target == "external":
            # External links must have identifier
            if not any(link.get(field) for field in ["device", "docPath", "docId"]):
                return (
                    False,
                    f"External link missing identifier in block '{block.get('name', 'Unknown')}'",
                )
        else:
            return (
                False,
                f"Invalid target '{target}' in block '{block.get('name', 'Unknown')}'",
            )

    return True, None


def validate_diagram_links(diagram: dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate all links in a diagram.

    Args:
        diagram: The diagram to validate

    Returns:
        Tuple of (all_valid, list_of_errors)
    """
    errors = []

    for block in diagram.get("blocks", []):
        is_valid, error = validate_links(block)
        if not is_valid:
            errors.append(error)

    return len(errors) == 0, errors


def compute_block_status(block: dict[str, Any]) -> str:
    """
    Compute the status of a block based on its content and links.

    Status progression:
    - Placeholder: No attributes, interfaces, or links
    - Planned: Has attributes or interfaces but no links
    - In-Work: Has links OR (attributes AND interfaces)
    - Implemented: Has (CAD OR ECAD link) AND attributes AND interfaces
    - Verified: Has both CAD AND ECAD links

    Args:
        block: The block to compute status for

    Returns:
        Status string
    """
    # Check if block has meaningful attributes
    attributes = block.get("attributes", {})
    has_attributes = any(v for v in attributes.values() if v)

    # Check links
    links = block.get("links", [])
    has_cad_link = any(link.get("target") == "cad" for link in links)
    has_ecad_link = any(link.get("target") == "ecad" for link in links)

    # Check interfaces
    interfaces = block.get("interfaces", [])
    has_interfaces = len(interfaces) > 0

    # Status logic
    if has_cad_link and has_ecad_link:
        return "Verified"
    elif (has_cad_link or has_ecad_link) and has_attributes and has_interfaces:
        return "Implemented"
    elif (has_cad_link or has_ecad_link) and not (has_attributes and has_interfaces):
        return "In-Work"
    elif has_attributes and has_interfaces:
        return "In-Work"
    elif has_attributes or has_interfaces:
        return "Planned"
    else:
        return "Placeholder"


def update_block_statuses(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Update the status of all blocks in a diagram.

    Args:
        diagram: The diagram to update

    Returns:
        The updated diagram (modified in-place)
    """
    if not diagram:
        return diagram

    for block in diagram.get("blocks", []):
        computed_status = compute_block_status(block)
        block["status"] = computed_status

    return diagram


def get_status_color(status: str) -> str:
    """
    Get the color associated with a block status.

    Args:
        status: The status string

    Returns:
        Hex color code
    """
    status_colors = {
        "Placeholder": "#cccccc",  # Light gray
        "Planned": "#87ceeb",  # Sky blue
        "In-Work": "#ffd700",  # Gold/yellow
        "Implemented": "#90ee90",  # Light green
        "Verified": "#00ff00",  # Green
    }
    return status_colors.get(status, "#cccccc")
