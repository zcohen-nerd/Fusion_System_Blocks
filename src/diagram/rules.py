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
                        # "warning" matches check_logic_level_compatibility —
                        # a mismatch may be resolved by external level
                        # shifters the diagram doesn't model.
                        "severity": "warning",
                        "message": (
                            f"Logic level mismatch: {from_block['name']} ({from_level}) → "
                            f"{to_block['name']} ({to_level})"
                        ),
                        "blocks": [from_block["id"], to_block["id"]],
                        "connection": connection.get("id"),
                    }
                )

    return violations


#: Rail voltage assumed for mA→mW conversion when a block does not
#: declare one via a ``voltage`` / ``rail_voltage`` attribute.
DEFAULT_RAIL_VOLTAGE = 3.3


def _parse_rail_voltage(attributes: dict[str, Any]) -> float:
    """Determine the rail voltage for a block's mA→mW conversion.

    Reads the block's ``voltage`` or ``rail_voltage`` attribute.
    Accepts plain numbers ("5", 5.0) or a trailing-V form ("5V", "3.3v").
    Falls back to :data:`DEFAULT_RAIL_VOLTAGE` when absent or unparsable.
    """
    for key in ("voltage", "rail_voltage"):
        raw = attributes.get(key)
        if raw in (None, ""):
            continue
        text = str(raw).strip()
        if text and text[-1] in ("V", "v"):
            text = text[:-1]
        try:
            value = float(text)
        except (TypeError, ValueError):
            continue
        if value > 0:
            return value
    return DEFAULT_RAIL_VOLTAGE


def _parse_power_value_mw(
    raw_value: Any,
    rail_voltage: float = DEFAULT_RAIL_VOLTAGE,
) -> float:
    """Parse a power value to milliwatts.

    Accepts plain numeric strings (interpreted as mW) and strings
    suffixed with ``mA`` (converted at *rail_voltage*, which comes from
    the block's ``voltage``/``rail_voltage`` attribute when declared).

    Args:
        raw_value: The raw attribute value (str, int, or float).
        rail_voltage: Rail voltage used for mA→mW conversion.

    Returns:
        The value in milliwatts.

    Raises:
        ValueError: If the value cannot be parsed.
    """
    text = str(raw_value)
    if "mA" in text:
        current_ma = float(text.replace("mA", ""))
        return current_ma * rail_voltage
    return float(text)


def _collect_power_budget_data(diagram: dict[str, Any]) -> dict[str, Any]:
    """Collect parsed power values and explicit validation issues."""
    power_supplies: list[tuple[dict[str, Any], float]] = []
    power_consumers: list[tuple[dict[str, Any], float]] = []
    issues: list[dict[str, Any]] = []
    referenced_blocks: list[str] = []
    has_power_fields = False

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})
        block_name = block.get("name") or block.get("id") or "Unknown Block"
        block_id = block.get("id")
        rail_voltage = _parse_rail_voltage(attributes)

        supply_field = (
            "output_current" if attributes.get("output_current") else "power_supply_mw"
        )
        supply_raw = attributes.get(supply_field)
        if any(key in attributes for key in ("output_current", "power_supply_mw")):
            has_power_fields = True
            if block_id:
                referenced_blocks.append(block_id)
        if supply_raw not in (None, ""):
            try:
                power_supplies.append(
                    (block, _parse_power_value_mw(supply_raw, rail_voltage))
                )
            except (ValueError, TypeError):
                issues.append(
                    {
                        "type": "invalid_power_value",
                        "severity": "error",
                        "message": (
                            f"Invalid power value for block '{block_name}' "
                            f"field '{supply_field}': {supply_raw}"
                        ),
                        "blocks": [block_id] if block_id else [],
                    }
                )

        consumption_field = (
            "current" if attributes.get("current") else "power_consumption_mw"
        )
        consumption_raw = attributes.get(consumption_field)
        if any(key in attributes for key in ("current", "power_consumption_mw")):
            has_power_fields = True
            if block_id:
                referenced_blocks.append(block_id)
        if consumption_raw not in (None, ""):
            try:
                power_consumers.append(
                    (block, _parse_power_value_mw(consumption_raw, rail_voltage))
                )
            except (ValueError, TypeError):
                issues.append(
                    {
                        "type": "invalid_power_value",
                        "severity": "error",
                        "message": (
                            f"Invalid power value for block '{block_name}' "
                            f"field '{consumption_field}': {consumption_raw}"
                        ),
                        "blocks": [block_id] if block_id else [],
                    }
                )

    total_supply = sum(value for _, value in power_supplies)
    total_consumption = sum(value for _, value in power_consumers)

    return {
        "power_supplies": power_supplies,
        "power_consumers": power_consumers,
        "issues": issues,
        "has_power_fields": has_power_fields,
        "referenced_blocks": list(dict.fromkeys(referenced_blocks)),
        "total_supply": total_supply,
        "total_consumption": total_consumption,
    }


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
    metrics = _collect_power_budget_data(diagram)
    violations = list(metrics["issues"])

    power_supplies = metrics["power_supplies"]
    power_consumers = metrics["power_consumers"]
    total_supply = metrics["total_supply"]
    total_consumption = metrics["total_consumption"]

    if not metrics["has_power_fields"]:
        violations.append(
            {
                "type": "power_budget_incomplete",
                "severity": "warning",
                "message": "Power budget incomplete: no power specifications found",
                "blocks": [],
            }
        )
        return violations

    if not power_supplies or not power_consumers:
        violations.append(
            {
                "type": "power_budget_incomplete",
                "severity": "warning",
                "message": (
                    "Power budget incomplete: need at least one valid supply "
                    "and one valid consumption value"
                ),
                "blocks": metrics["referenced_blocks"],
                "details": {
                    "total_supply": total_supply,
                    "total_consumption": total_consumption,
                },
            }
        )
        return violations

    if any(issue.get("severity") == "error" for issue in violations):
        return violations

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

    # Ids attached to results let the palette highlight offending
    # blocks/connections when a result row is clicked.
    connection_id = connection.get("id")
    block_ids = [bid for bid in (from_id, to_id) if bid]

    if not from_block or not to_block:
        return {
            "success": False,
            "rule": "logic_level_compatibility",
            "message": "Could not find connected blocks",
            "connection": connection_id,
            "blocks": block_ids,
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
                "connection": connection_id,
                "blocks": block_ids,
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
                "connection": connection_id,
                "blocks": block_ids,
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
        "connection": connection_id,
        "blocks": block_ids,
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
    metrics = _collect_power_budget_data(diagram)
    violations = check_power_budget_bulk(diagram)

    if violations:
        highest_severity = "warning"
        message = violations[0]["message"]

        for violation in violations:
            if violation.get("severity") == "error":
                highest_severity = "error"
                message = violation["message"]
                break

        if highest_severity == "error":
            power_exceeded = next(
                (
                    violation
                    for violation in violations
                    if violation.get("type") == "power_budget_exceeded"
                ),
                None,
            )
            if power_exceeded:
                details = power_exceeded.get("details", {})
                message = (
                    f"Power budget exceeded: {details['total_consumption']:.1f}mW needed, "
                    f"{details['total_supply']:.1f}mW available"
                )

        # Aggregate the block ids from all violations so the palette can
        # highlight the offending blocks when the result row is clicked.
        involved_blocks = sorted(
            {
                block_id
                for violation in violations
                for block_id in violation.get("blocks", [])
                if block_id
            }
        )

        return {
            "success": False,
            "rule": "power_budget",
            "message": message,
            "severity": highest_severity,
            "blocks": involved_blocks,
        }

    return {
        "success": True,
        "rule": "power_budget",
        "message": (
            f"Power budget OK: {metrics['total_consumption']:.1f}mW used of "
            f"{metrics['total_supply']:.1f}mW available"
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
    incomplete_names = []
    incomplete_ids = []

    for block in diagram.get("blocks", []):
        status = block.get("status", "Placeholder")

        # Check if block claims to be implemented but lacks details
        if status == "Implemented":
            attributes = block.get("attributes", {})
            interfaces = block.get("interfaces", [])
            links = block.get("links", [])

            # Block should have some attributes, interfaces, and links to be truly "implemented"
            if not attributes or not interfaces or not links:
                incomplete_names.append(block.get("name", "Unnamed"))
                if block.get("id"):
                    incomplete_ids.append(block["id"])

    if not incomplete_names:
        return {
            "success": True,
            "rule": "implementation_completeness",
            "message": "All blocks have adequate implementation details",
        }
    else:
        return {
            "success": False,
            "rule": "implementation_completeness",
            "message": f"Incomplete blocks: {', '.join(incomplete_names)}",
            "severity": "warning",
            "blocks": incomplete_ids,
        }
