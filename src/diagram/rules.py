"""
Diagram rule checking and validation functions.

Provides functions to check logic level compatibility, power budget,
implementation completeness, and other design rules.
"""

from __future__ import annotations

from typing import Any


def find_block_by_id(diagram: dict[str, Any], block_id: str) -> dict[str, Any]:
    """
    Find a block by its ID.

    Args:
        diagram: The diagram to search
        block_id: The block ID to find

    Returns:
        The block dictionary or None if not found
    """
    # Import from core to avoid duplication
    from .core import find_block_by_id as core_find

    return core_find(diagram, block_id)


def _get_connection_block_ids(
    connection: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Extract source and target block IDs from a connection dict.

    Handles both the Python data-model format
    (``{"from": {"blockId": "..."}, "to": {"blockId": "..."}}``)
    and the JavaScript front-end format
    (``{"fromBlock": "...", "toBlock": "..."}``).

    Returns:
        Tuple of ``(from_block_id, to_block_id)``.
    """
    if "from" in connection and isinstance(connection["from"], dict):
        from_id = connection["from"].get("blockId")
    else:
        from_id = connection.get("fromBlock")

    if "to" in connection and isinstance(connection["to"], dict):
        to_id = connection["to"].get("blockId")
    else:
        to_id = connection.get("toBlock")

    return from_id, to_id


def _get_connection_interface_ids(
    connection: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Extract interface IDs from a connection, handling both formats."""
    from_iface = None
    to_iface = None
    if "from" in connection and isinstance(connection["from"], dict):
        from_iface = connection["from"].get("interfaceId")
    if "to" in connection and isinstance(connection["to"], dict):
        to_iface = connection["to"].get("interfaceId")
    return from_iface, to_iface


def check_logic_level_compatibility_bulk(
    diagram: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Check for logic level compatibility issues between connected blocks.

    Args:
        diagram: The diagram to check

    Returns:
        List of violation dictionaries
    """
    violations = []

    for connection in diagram.get("connections", []):
        from_id, to_id = _get_connection_block_ids(connection)
        if not from_id or not to_id:
            continue
        from_block = find_block_by_id(diagram, from_id)
        to_block = find_block_by_id(diagram, to_id)

        if not from_block or not to_block:
            continue

        # Get logic levels from block attributes
        from_level = from_block.get("attributes", {}).get("logic_level", "")
        to_level = to_block.get("attributes", {}).get("logic_level", "")

        # Check compatibility
        if from_level and to_level and from_level != to_level:
            # Allow some compatible combinations
            compatible_pairs = [("3.3V", "5V_tolerant"), ("5V_tolerant", "3.3V")]

            if (from_level, to_level) not in compatible_pairs:
                violations.append(
                    {
                        "type": "logic_level_mismatch",
                        "severity": "error",
                        "message": (
                            f"Logic level mismatch: {from_block['name']} ({from_level}) → "
                            f"{to_block['name']} ({to_level})"
                        ),
                        "blocks": [from_block["id"], to_block["id"]],
                        "connection": connection["id"],
                    }
                )

    return violations


def _parse_power_value_mw(raw_value: Any) -> float:
    """Parse a power value to milliwatts.

    Accepts plain numeric strings (interpreted as mW) and strings
    suffixed with ``mA`` (converted at an assumed 3.3 V rail).

    Args:
        raw_value: The raw attribute value (str, int, or float).

    Returns:
        The value in milliwatts.

    Raises:
        ValueError: If the value cannot be parsed.
    """
    text = str(raw_value)
    if "mA" in text:
        current_ma = float(text.replace("mA", ""))
        return current_ma * 3.3  # Assume 3.3 V rail
    return float(text)


def check_power_budget_bulk(diagram: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Check if power consumption exceeds power supply capability.

    Recognises several attribute conventions for supply and consumption:

    * ``power_supply_mw`` / ``output_current`` — power supply (mW or mA)
    * ``power_consumption_mw`` / ``current`` — power consumption (mW or mA)

    Values suffixed with ``mA`` are converted to mW assuming a 3.3 V rail.

    Args:
        diagram: The diagram to check.

    Returns:
        List of violation dictionaries.
    """
    violations = []

    power_supplies: list[tuple] = []
    power_consumers: list[tuple] = []

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})

        # Accept multiple attribute names for supply
        supply_raw = attributes.get("output_current") or attributes.get(
            "power_supply_mw"
        )
        if supply_raw:
            try:
                power_supplies.append((block, _parse_power_value_mw(supply_raw)))
            except (ValueError, TypeError):
                pass

        # Accept multiple attribute names for consumption
        consumption_raw = attributes.get("current") or attributes.get(
            "power_consumption_mw"
        )
        if consumption_raw:
            try:
                power_consumers.append((block, _parse_power_value_mw(consumption_raw)))
            except (ValueError, TypeError):
                pass

    total_supply = sum(s for _, s in power_supplies)
    total_consumption = sum(c for _, c in power_consumers)

    if total_consumption > total_supply:
        violations.append(
            {
                "type": "power_budget_exceeded",
                "severity": "error",
                "message": (
                    f"Power consumption ({total_consumption:.1f}mW) exceeds supply "
                    f"({total_supply:.1f}mW)"
                ),
                "blocks": [block["id"] for block, _ in power_consumers],
                "details": {
                    "total_supply": total_supply,
                    "total_consumption": total_consumption,
                    "deficit": total_consumption - total_supply,
                },
            }
        )

    return violations


def check_implementation_completeness_bulk(
    diagram: dict[str, Any],
) -> list[dict[str, Any]]:
    """
    Check if all blocks have sufficient implementation details.

    Args:
        diagram: The diagram to check

    Returns:
        List of violation dictionaries
    """
    violations = []

    for block in diagram.get("blocks", []):
        status = block.get("status", "Placeholder")

        if status == "Placeholder":
            violations.append(
                {
                    "type": "incomplete_implementation",
                    "severity": "warning",
                    "message": f"Block '{block['name']}' has placeholder status",
                    "blocks": [block["id"]],
                }
            )

    return violations


def run_all_rule_checks(diagram: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Run all rule checks and return combined results.

    Args:
        diagram: The diagram to check

    Returns:
        List of all check results
    """
    all_results = []

    # Run diagram-level checks
    all_results.append(check_power_budget(diagram))
    all_results.append(check_implementation_completeness(diagram))

    # Run connection-level checks
    for connection in diagram.get("connections", []):
        result = check_logic_level_compatibility(connection, diagram)
        all_results.append(result)

    return all_results


def get_rule_failures(diagram: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Get only the failed rule checks.

    Args:
        diagram: The diagram to check

    Returns:
        List of failed check results
    """
    all_results = run_all_rule_checks(diagram)
    return [r for r in all_results if not r.get("success", True)]


def check_logic_level_compatibility(
    connection: dict[str, Any], diagram: dict[str, Any]
) -> dict[str, Any]:
    """
    Check logic level compatibility for a single connection.

    Args:
        connection: The connection to check
        diagram: The containing diagram

    Returns:
        Dictionary with check results
    """
    from_id, to_id = _get_connection_block_ids(connection)
    from_block = find_block_by_id(diagram, from_id) if from_id else None
    to_block = find_block_by_id(diagram, to_id) if to_id else None

    if not from_block or not to_block:
        return {
            "success": False,
            "rule": "logic_level_compatibility",
            "message": "Could not find connected blocks",
        }

    # Find interfaces to get voltage parameters
    from_interface_id, to_interface_id = _get_connection_interface_ids(connection)

    from_voltage = ""
    to_voltage = ""

    # Get voltage from interface parameters
    from_interface_found = False
    to_interface_found = False

    if from_interface_id:
        for interface in from_block.get("interfaces", []):
            if interface.get("id") == from_interface_id:
                from_voltage = interface.get("params", {}).get("voltage", "")
                from_interface_found = True
                break

        # If interface ID was specified but not found, it's an error
        if not from_interface_found:
            return {
                "success": False,
                "rule": "logic_level_compatibility",
                "message": "Cannot find connected interfaces",
                "severity": "error",
            }

    if to_interface_id:
        for interface in to_block.get("interfaces", []):
            if interface.get("id") == to_interface_id:
                to_voltage = interface.get("params", {}).get("voltage", "")
                to_interface_found = True
                break

        # If interface ID was specified but not found, it's an error
        if not to_interface_found:
            return {
                "success": False,
                "rule": "logic_level_compatibility",
                "message": "Cannot find connected interfaces",
                "severity": "error",
            }

    # Fall back to block attributes if interface params not found
    if not from_voltage:
        from_voltage = from_block.get("attributes", {}).get("logic_level", "")
    if not to_voltage:
        to_voltage = to_block.get("attributes", {}).get("logic_level", "")

    # If no voltage levels specified, assume compatible
    if not from_voltage or not to_voltage:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels",
        }

    # Check compatibility
    if from_voltage == to_voltage:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels",
        }

    # Allow some compatible combinations
    compatible_pairs = [("3.3V", "5V_tolerant"), ("5V_tolerant", "3.3V")]
    if (from_voltage, to_voltage) in compatible_pairs:
        return {
            "success": True,
            "rule": "logic_level_compatibility",
            "message": "Compatible logic levels",
        }

    return {
        "success": False,
        "rule": "logic_level_compatibility",
        "message": f"Logic level mismatch: {from_voltage} → {to_voltage}",
        "severity": "warning",
    }


def check_power_budget(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Check power budget for entire diagram.

    Delegates to :func:`check_power_budget_bulk` for the actual calculation
    and returns a single result dictionary suitable for
    :func:`run_all_rule_checks`.

    Args:
        diagram: The diagram to check.

    Returns:
        Dictionary with check results.
    """
    violations = check_power_budget_bulk(diagram)

    # Determine whether any blocks had power specs at all
    has_power_specs = any(
        attributes.get("output_current")
        or attributes.get("power_supply_mw")
        or attributes.get("current")
        or attributes.get("power_consumption_mw")
        for block in diagram.get("blocks", [])
        for attributes in [block.get("attributes", {})]
    )

    if not has_power_specs:
        return {
            "success": True,
            "rule": "power_budget",
            "message": "No power specifications found",
        }

    if violations:
        v = violations[0]
        details = v.get("details", {})
        return {
            "success": False,
            "rule": "power_budget",
            "message": (
                f"Power budget exceeded: {details['total_consumption']:.1f}mW needed, "
                f"{details['total_supply']:.1f}mW available"
            ),
            "severity": "error",
        }

    # Re-calculate totals for the OK message
    total_supply = 0.0
    total_consumption = 0.0
    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})
        supply_raw = attributes.get("output_current") or attributes.get(
            "power_supply_mw"
        )
        if supply_raw:
            try:
                total_supply += _parse_power_value_mw(supply_raw)
            except (ValueError, TypeError):
                pass
        consumption_raw = attributes.get("current") or attributes.get(
            "power_consumption_mw"
        )
        if consumption_raw:
            try:
                total_consumption += _parse_power_value_mw(consumption_raw)
            except (ValueError, TypeError):
                pass

    return {
        "success": True,
        "rule": "power_budget",
        "message": (
            f"Power budget OK: {total_consumption:.1f}mW used of "
            f"{total_supply:.1f}mW available"
        ),
    }


def check_implementation_completeness(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Check implementation completeness for diagram.

    Args:
        diagram: The diagram to check

    Returns:
        Dictionary with check results
    """
    incomplete_blocks = []

    for block in diagram.get("blocks", []):
        status = block.get("status", "Placeholder")

        # Check if block claims to be implemented but lacks details
        if status == "Implemented":
            attributes = block.get("attributes", {})
            interfaces = block.get("interfaces", [])
            links = block.get("links", [])

            # Block should have some attributes, interfaces, and links to be truly "implemented"
            if not attributes or not interfaces or not links:
                incomplete_blocks.append(block.get("name", "Unnamed"))

    if not incomplete_blocks:
        return {
            "success": True,
            "rule": "implementation_completeness",
            "message": "All blocks have adequate implementation details",
        }
    else:
        return {
            "success": False,
            "rule": "implementation_completeness",
            "message": f"Incomplete blocks: {', '.join(incomplete_blocks)}",
            "severity": "warning",
        }
