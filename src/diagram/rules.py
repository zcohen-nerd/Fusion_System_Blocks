"""
Diagram rule checking and validation functions.

Provides functions to check logic level compatibility, power budget,
implementation completeness, and other design rules.
"""

from typing import Dict, List, Any


def find_block_by_id(diagram: Dict[str, Any], block_id: str) -> Dict[str, Any]:
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


def check_logic_level_compatibility_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Check for logic level compatibility issues between connected blocks.

    Args:
        diagram: The diagram to check

    Returns:
        List of violation dictionaries
    """
    violations = []

    for connection in diagram.get("connections", []):
        from_block = find_block_by_id(diagram, connection["from"]["blockId"])
        to_block = find_block_by_id(diagram, connection["to"]["blockId"])

        if not from_block or not to_block:
            continue

        # Get logic levels from block attributes
        from_level = from_block.get("attributes", {}).get("logic_level", "")
        to_level = to_block.get("attributes", {}).get("logic_level", "")

        # Check compatibility
        if from_level and to_level and from_level != to_level:
            # Allow some compatible combinations
            compatible_pairs = [("3.3V", "5V_tolerant"),
                                ("5V_tolerant", "3.3V")]

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


def check_power_budget_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Check if power consumption exceeds power supply capability.

    Args:
        diagram: The diagram to check

    Returns:
        List of violation dictionaries
    """
    violations = []

    # Find power supply blocks
    power_supplies = []
    power_consumers = []

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})
        power_supply = attributes.get("power_supply_mw")
        power_consumption = attributes.get("power_consumption_mw")

        if power_supply:
            try:
                power_supplies.append((block, float(power_supply)))
            except ValueError:
                pass

        if power_consumption:
            try:
                power_consumers.append((block, float(power_consumption)))
            except ValueError:
                pass

    # Calculate totals
    total_supply = sum(supply for _, supply in power_supplies)
    total_consumption = sum(consumption for _, consumption in power_consumers)

    if total_consumption > total_supply:
        violations.append(
            {
                "type": "power_budget_exceeded",
                "severity": "error",
                "message": (
                    f"Power consumption ({total_consumption}mW) exceeds supply "
                    f"({total_supply}mW)"
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


def check_implementation_completeness_bulk(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
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


def run_all_rule_checks(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
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


def get_rule_failures(diagram: Dict[str, Any]) -> List[Dict[str, Any]]:
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
    connection: Dict[str, Any], diagram: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Check logic level compatibility for a single connection.

    Args:
        connection: The connection to check
        diagram: The containing diagram

    Returns:
        Dictionary with check results
    """
    from_block = find_block_by_id(diagram, connection["from"]["blockId"])
    to_block = find_block_by_id(diagram, connection["to"]["blockId"])

    if not from_block or not to_block:
        return {
            "success": False,
            "rule": "logic_level_compatibility",
            "message": "Could not find connected blocks",
        }

    # Find interfaces to get voltage parameters
    from_interface_id = connection.get("from", {}).get("interfaceId")
    to_interface_id = connection.get("to", {}).get("interfaceId")

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


def check_power_budget(diagram: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check power budget for entire diagram.

    Args:
        diagram: The diagram to check

    Returns:
        Dictionary with check results
    """
    total_supply = 0
    total_consumption = 0
    has_power_specs = False

    for block in diagram.get("blocks", []):
        attributes = block.get("attributes", {})

        # Check for various power supply attribute names
        supply_current = attributes.get(
            "output_current") or attributes.get("power_supply_mw")
        if supply_current:
            has_power_specs = True
            try:
                # Convert mA to mW (assume 3.3V for current)
                if "mA" in str(supply_current):
                    current_ma = float(supply_current.replace("mA", ""))
                    total_supply += current_ma * 3.3  # Convert to mW
                else:
                    total_supply += float(supply_current)
            except (ValueError, TypeError):
                pass

        # Check for various power consumption attribute names
        consumption = attributes.get(
            "current") or attributes.get("power_consumption_mw")
        if consumption:
            has_power_specs = True
            try:
                # Convert mA to mW (assume 3.3V for current)
                if "mA" in str(consumption):
                    current_ma = float(consumption.replace("mA", ""))
                    total_consumption += current_ma * 3.3  # Convert to mW
                else:
                    total_consumption += float(consumption)
            except (ValueError, TypeError):
                pass

    if not has_power_specs:
        return {"success": True, "rule": "power_budget", "message": "No power specifications found"}

    if total_consumption <= total_supply:
        return {
            "success": True,
            "rule": "power_budget",
            "message": f"Power budget OK: {total_consumption:.1f}mW used of "
            f"{total_supply:.1f}mW available",
        }
    else:
        return {
            "success": False,
            "rule": "power_budget",
            "message": f"Power budget exceeded: {total_consumption:.1f}mW needed, "
            f"{total_supply:.1f}mW available",
            "severity": "error",
        }


def check_implementation_completeness(diagram: Dict[str, Any]) -> Dict[str, Any]:
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
