"""
CAD linking, 3D visualization, and living documentation functions.

Provides advanced integration between block diagrams and Fusion CAD models,
including component tracking, 3D visualization, assembly sequences, and living documentation.
"""

import base64
from datetime import datetime
from typing import Any, Optional


class CADLinkingError(Exception):
    """Exception raised for CAD linking operations."""


def create_enhanced_cad_link(
    doc_id: str,
    occ_token: str,
    component_name: str = "",
    material: str = "",
    mass: float = 0.0,
    volume: float = 0.0,
    bounding_box: Optional[dict[str, list[float]]] = None,
    custom_properties: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Create an enhanced CAD link with component properties and sync status.

    Args:
        doc_id: Fusion document ID
        occ_token: Occurrence token for the component
        component_name: Name of the component
        material: Material name
        mass: Mass in kg
        volume: Volume in mm³
        bounding_box: Min/max coordinates as {"min": [x,y,z], "max": [x,y,z]}
        custom_properties: Additional custom properties

    Returns:
        Enhanced CAD link dictionary
    """
    now = datetime.now().isoformat()

    link = {
        "target": "cad",
        "docId": doc_id,
        "occToken": occ_token,
        "componentProperties": {
            "material": material,
            "mass": mass,
            "volume": volume,
            "customProperties": custom_properties or {},
        },
        "syncStatus": {
            "status": "synchronized",
            "lastSync": now,
            "lastModified": now,
            "syncErrors": [],
            "changesSinceSync": [],
        },
    }

    if bounding_box:
        link["componentProperties"]["boundingBox"] = bounding_box

    return link


def update_component_properties(link: dict[str, Any], **properties) -> dict[str, Any]:
    """
    Update component properties in a CAD link.

    Args:
        link: The CAD link to update
        **properties: Properties to update (material, mass, volume, etc.)

    Returns:
        Updated link with new properties and sync status
    """
    if link.get("target") != "cad":
        raise CADLinkingError("Can only update properties for CAD links")

    # Ensure componentProperties exists
    if "componentProperties" not in link:
        link["componentProperties"] = {}

    # Track changes
    changes = []
    for key, value in properties.items():
        if key in ["material", "mass", "volume"]:
            old_value = link["componentProperties"].get(key)
            if old_value != value:
                changes.append(f"{key}: {old_value} → {value}")
                link["componentProperties"][key] = value
        elif key == "customProperties":
            # Merge custom properties
            if "customProperties" not in link["componentProperties"]:
                link["componentProperties"]["customProperties"] = {}
            link["componentProperties"]["customProperties"].update(value)
            changes.append("Updated custom properties")
        elif key == "boundingBox":
            link["componentProperties"]["boundingBox"] = value
            changes.append("Updated bounding box")

    # Update sync status
    now = datetime.now().isoformat()
    if "syncStatus" not in link:
        link["syncStatus"] = {
            "status": "synchronized",
            "lastSync": now,
            "lastModified": now,
            "syncErrors": [],
            "changesSinceSync": [],
        }

    if changes:
        link["syncStatus"]["lastModified"] = now
        link["syncStatus"]["changesSinceSync"].extend(changes)
        link["syncStatus"]["status"] = "modified"

    return link


def mark_component_as_missing(
    link: dict[str, Any], error_message: str = ""
) -> dict[str, Any]:
    """
    Mark a component as missing (not found in Fusion).

    Args:
        link: The CAD link to mark as missing
        error_message: Optional error message

    Returns:
        Updated link with missing status
    """
    if "syncStatus" not in link:
        link["syncStatus"] = {}

    link["syncStatus"]["status"] = "missing"
    link["syncStatus"]["lastSync"] = datetime.now().isoformat()

    if error_message:
        if "syncErrors" not in link["syncStatus"]:
            link["syncStatus"]["syncErrors"] = []
        link["syncStatus"]["syncErrors"].append(error_message)

    return link


def mark_component_as_error(
    cad_link: dict[str, Any], error_message: str
) -> dict[str, Any]:
    """
    Mark a CAD component as having an error.

    Args:
        cad_link: The CAD link dictionary to update
        error_message: Description of the error

    Returns:
        Updated CAD link dictionary
    """
    if not cad_link:
        return None

    # Update sync status
    cad_link["syncStatus"] = {
        "status": "error",
        "lastSync": cad_link.get("syncStatus", {}).get(
            "lastSync", datetime.now().isoformat()
        ),
        "lastModified": datetime.now().isoformat(),
        "syncErrors": [error_message],
        "changesSinceSync": cad_link.get("syncStatus", {}).get("changesSinceSync", []),
    }

    return cad_link


def validate_enhanced_cad_link(cad_link: dict[str, Any]) -> dict[str, Any]:
    """
    Validate that an enhanced CAD link has all required properties.

    Args:
        cad_link: The CAD link dictionary to validate

    Returns:
        Dictionary with validation results
    """
    if not cad_link:
        return {"valid": False, "errors": ["CAD link is None or empty"], "warnings": []}

    errors = []
    warnings = []

    # Check required fields
    required_fields = ["target", "docId", "occToken"]
    for field in required_fields:
        if field not in cad_link:
            errors.append(f"Missing required field: {field}")
        elif not cad_link[field]:
            errors.append(f"Empty required field: {field}")

    # Check sync status structure
    if "syncStatus" not in cad_link:
        warnings.append(
            "Missing syncStatus - component may not be properly synchronized"
        )
    else:
        sync_status = cad_link["syncStatus"]
        if "status" not in sync_status:
            errors.append("Missing status in syncStatus")
        elif sync_status["status"] not in [
            "synchronized",
            "modified",
            "missing",
            "error",
        ]:
            errors.append(f"Invalid sync status: {sync_status['status']}")

    # Check component properties
    if "componentProperties" not in cad_link:
        warnings.append(
            "Missing componentProperties - physical properties may not be available"
        )
    else:
        props = cad_link["componentProperties"]
        if not isinstance(props, dict):
            errors.append("componentProperties must be a dictionary")

    # Check thumbnail
    if "thumbnail" not in cad_link:
        warnings.append("Missing thumbnail - visual representation not available")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


def calculate_component_completion_percentage(block: dict[str, Any]) -> float:
    """
    Calculate completion percentage based on component status and properties.

    Args:
        block: Block with CAD links to analyze

    Returns:
        Completion percentage (0.0 to 100.0)
    """
    cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]

    if not cad_links:
        return 0.0

    total_score = 0
    max_score = 0

    for link in cad_links:
        # Base score for having a link
        max_score += 100
        score = 20  # Base points for existing link

        # Sync status scoring
        sync_status = link.get("syncStatus", {}).get("status", "unknown")
        if sync_status == "synchronized":
            score += 30
        elif sync_status == "modified":
            score += 25
        elif sync_status == "missing":
            score += 0
        else:  # unknown, error
            score += 10

        # Component properties scoring
        props = link.get("componentProperties", {})
        if props.get("material"):
            score += 15
        if props.get("mass", 0) > 0:
            score += 15
        if props.get("volume", 0) > 0:
            score += 10
        if props.get("boundingBox"):
            score += 10

        total_score += score

    return (total_score / max_score) * 100 if max_score > 0 else 0.0


def get_component_health_status(block: dict[str, Any]) -> dict[str, Any]:
    """
    Get comprehensive health status for all components in a block.

    Args:
        block: Block to analyze

    Returns:
        Health status dictionary with detailed information
    """
    cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]

    if not cad_links:
        return {
            "overall_status": "no_components",
            "completion_percentage": 0.0,
            "component_count": 0,
            "status_breakdown": {},
            "issues": [],
            "recommendations": ["Add CAD component links to enable tracking"],
        }

    # Analyze each component
    status_counts = {
        "synchronized": 0,
        "modified": 0,
        "missing": 0,
        "error": 0,
        "unknown": 0,
    }
    issues = []
    recommendations = []

    for i, link in enumerate(cad_links):
        sync_status = link.get("syncStatus", {}).get("status", "unknown")
        status_counts[sync_status] += 1

        # Check for issues
        if sync_status == "missing":
            issues.append(f"Component {i + 1}: Not found in Fusion")
            recommendations.append(f"Check if component {i + 1} was deleted or moved")
        elif sync_status == "error":
            errors = link.get("syncStatus", {}).get("syncErrors", [])
            for error in errors:
                issues.append(f"Component {i + 1}: {error}")
        elif sync_status == "modified":
            changes = link.get("syncStatus", {}).get("changesSinceSync", [])
            if changes:
                issues.append(f"Component {i + 1}: Has unsynchronized changes")

        # Check for missing properties
        props = link.get("componentProperties", {})
        if not props.get("material"):
            recommendations.append(f"Component {i + 1}: Add material information")
        if not props.get("mass", 0):
            recommendations.append(f"Component {i + 1}: Add mass/weight information")

    # Determine overall status
    total_components = len(cad_links)
    if status_counts["missing"] > total_components * 0.5:
        overall_status = "critical"
    elif status_counts["error"] > 0 or status_counts["missing"] > 0:
        overall_status = "warning"
    elif status_counts["modified"] > 0:
        overall_status = "needs_sync"
    elif status_counts["synchronized"] == total_components:
        overall_status = "healthy"
    else:
        overall_status = "unknown"

    return {
        "overall_status": overall_status,
        "completion_percentage": calculate_component_completion_percentage(block),
        "component_count": total_components,
        "status_breakdown": status_counts,
        "issues": issues,
        # Limit to top 5 recommendations
        "recommendations": recommendations[:5],
    }


def generate_component_thumbnail_placeholder(
    width: int = 64, height: int = 64, component_name: str = "Component"
) -> dict[str, Any]:
    """
    Generate a placeholder thumbnail for components without actual thumbnails.

    Args:
        width: Thumbnail width
        height: Thumbnail height
        component_name: Component name for the placeholder

    Returns:
        Thumbnail data dictionary
    """
    # Create a simple SVG placeholder
    svg_content = f"""
    <svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="50%" y="50%" font-family="Arial" font-size="10" text-anchor="middle"
              dominant-baseline="middle" fill="#666">
            {component_name[:8]}...
        </text>
    </svg>
    """

    # Convert to base64 data URL
    svg_bytes = svg_content.encode("utf-8")
    data_url = f"data:image/svg+xml;base64,{base64.b64encode(svg_bytes).decode()}"

    return {
        "dataUrl": data_url,
        "width": width,
        "height": height,
        "generatedAt": datetime.now().isoformat(),
    }


def generate_component_thumbnail_data(
    component_name: str, thumbnail_bytes: bytes = None
) -> dict[str, Any]:
    """
    Generate thumbnail data from actual component image.

    Args:
        component_name: Name of the component
        thumbnail_bytes: Optional bytes data for actual thumbnail

    Returns:
        Dictionary with thumbnail data
    """
    if thumbnail_bytes:
        encoded_data = base64.b64encode(thumbnail_bytes).decode("utf-8")
        return {
            "type": "image",
            "data": f"data:image/png;base64,{encoded_data}",
            "width": 150,
            "height": 150,
            "generatedAt": datetime.now().isoformat(),
        }
    else:
        # Return placeholder if no actual thumbnail data
        return generate_component_thumbnail_placeholder(component_name=component_name)


def sync_all_components_in_diagram(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Sync all CAD components in a diagram (placeholder for Fusion integration).

    Args:
        diagram: The diagram to sync

    Returns:
        Sync results summary
    """
    results = {
        "total_blocks": len(diagram.get("blocks", [])),
        "blocks_with_cad": 0,
        "total_components": 0,
        "sync_successful": 0,
        "sync_failed": 0,
        "errors": [],
    }

    for block in diagram.get("blocks", []):
        cad_links = [
            link for link in block.get("links", []) if link.get("target") == "cad"
        ]

        if cad_links:
            results["blocks_with_cad"] += 1
            results["total_components"] += len(cad_links)

            for link in cad_links:
                # Placeholder sync logic - in real implementation, this would
                # call Fusion API to check component status
                try:
                    # Simulate sync operation
                    if "syncStatus" not in link:
                        link["syncStatus"] = {}

                    link["syncStatus"]["lastSync"] = datetime.now().isoformat()
                    link["syncStatus"]["status"] = "synchronized"

                    results["sync_successful"] += 1

                except Exception as e:
                    results["sync_failed"] += 1
                    results["errors"].append(str(e))

    return results


def create_component_dashboard_data(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Create dashboard data for component status visualization.

    Args:
        diagram: The diagram to analyze

    Returns:
        Dashboard data for UI display
    """
    dashboard = {
        "overview": {
            "total_blocks": len(diagram.get("blocks", [])),
            "blocks_with_cad": 0,
            "total_components": 0,
            "overall_health": "unknown",
        },
        "status_summary": {
            "synchronized": 0,
            "modified": 0,
            "missing": 0,
            "error": 0,
            "unknown": 0,
        },
        "completion_stats": {
            "average_completion": 0.0,
            "blocks_by_completion": {
                "0-25%": 0,
                "26-50%": 0,
                "51-75%": 0,
                "76-100%": 0,
            },
        },
        "issues": [],
        "recommendations": [],
    }

    total_completion = 0.0
    blocks_with_cad = 0

    for block in diagram.get("blocks", []):
        cad_links = [
            link for link in block.get("links", []) if link.get("target") == "cad"
        ]

        if cad_links:
            blocks_with_cad += 1
            dashboard["overview"]["total_components"] += len(cad_links)

            # Get block health
            health = get_component_health_status(block)
            total_completion += health["completion_percentage"]

            # Categorize by completion
            completion = health["completion_percentage"]
            if completion <= 25:
                dashboard["completion_stats"]["blocks_by_completion"]["0-25%"] += 1
            elif completion <= 50:
                dashboard["completion_stats"]["blocks_by_completion"]["26-50%"] += 1
            elif completion <= 75:
                dashboard["completion_stats"]["blocks_by_completion"]["51-75%"] += 1
            else:
                dashboard["completion_stats"]["blocks_by_completion"]["76-100%"] += 1

            # Collect status counts
            for status, count in health["status_breakdown"].items():
                dashboard["status_summary"][status] += count

            # Collect issues and recommendations
            dashboard["issues"].extend(health["issues"])
            dashboard["recommendations"].extend(health["recommendations"])

    # Update overview
    dashboard["overview"]["blocks_with_cad"] = blocks_with_cad

    if blocks_with_cad > 0:
        dashboard["completion_stats"]["average_completion"] = (
            total_completion / blocks_with_cad
        )

        # Determine overall health
        total_components = dashboard["overview"]["total_components"]
        if total_components == 0:
            dashboard["overview"]["overall_health"] = "no_components"
        elif dashboard["status_summary"]["missing"] > total_components * 0.3:
            dashboard["overview"]["overall_health"] = "critical"
        elif (
            dashboard["status_summary"]["error"] > 0
            or dashboard["status_summary"]["missing"] > 0
        ):
            dashboard["overview"]["overall_health"] = "warning"
        elif dashboard["status_summary"]["synchronized"] == total_components:
            dashboard["overview"]["overall_health"] = "healthy"
        else:
            dashboard["overview"]["overall_health"] = "needs_attention"

    # Limit recommendations to top 10
    dashboard["recommendations"] = list(set(dashboard["recommendations"]))[:10]

    return dashboard


# ============================================================================
# MILESTONE 13: VISUAL INTEGRATION & LIVING DOCUMENTATION
# ============================================================================


def initialize_3d_visualization(block: dict[str, Any]) -> dict[str, Any]:
    """
    Initialize 3D visualization properties for a block.

    Args:
        block: The block dictionary to enhance

    Returns:
        Updated block with 3D visualization properties
    """
    if not block:
        return block

    # Initialize 3D visualization if not present
    if "visualization3D" not in block:
        block["visualization3D"] = {
            "overlayPosition": {"x": 0, "y": 0, "z": 0},
            "highlightColor": "#4CAF50",  # Green default
            # Blue default
            "groupBoundary": {"enabled": False, "color": "#2196F3", "opacity": 0.3},
            "liveThumbnail": {
                "enabled": True,
                "updateInterval": 5000,  # 5 seconds
                "viewAngle": "iso",
                "lastUpdated": datetime.now().isoformat(),
            },
            "propertyDisplay": {
                "showInTooltip": ["material", "mass", "status"],
                "showOnBlock": ["status", "completion"],
                "progressBar": {"enabled": True, "type": "assembly"},
            },
        }

    return block


def update_3d_overlay_position(
    block: dict[str, Any], x: float, y: float, z: float
) -> dict[str, Any]:
    """
    Update the 3D overlay position for a block.

    Args:
        block: The block dictionary
        x, y, z: 3D coordinates for overlay position

    Returns:
        Updated block with new overlay position
    """
    if not block:
        return block

    # Initialize 3D visualization if needed
    block = initialize_3d_visualization(block)

    # Update overlay position
    block["visualization3D"]["overlayPosition"] = {"x": x, "y": y, "z": z}

    return block


def set_component_highlight_color(block: dict[str, Any], color: str) -> dict[str, Any]:
    """
    Set the highlight color for 3D components linked to this block.

    Args:
        block: The block dictionary
        color: Hex color string (e.g., "#FF5722")

    Returns:
        Updated block with highlight color
    """
    if not block or not color:
        return block

    # Validate color format (basic check)
    if not color.startswith("#") or len(color) != 7:
        return block

    # Initialize 3D visualization if needed
    block = initialize_3d_visualization(block)

    # Update highlight color
    block["visualization3D"]["highlightColor"] = color

    return block


def enable_system_grouping(
    blocks: list[dict[str, Any]], group_color: str = "#2196F3"
) -> list[dict[str, Any]]:
    """
    Enable system grouping visualization for a set of blocks.

    Args:
        blocks: List of blocks to group
        group_color: Color for the group boundary

    Returns:
        Updated blocks with grouping enabled
    """
    if not blocks:
        return blocks

    updated_blocks = []
    for block in blocks:
        # Initialize 3D visualization if needed
        block = initialize_3d_visualization(block)

        # Enable grouping with specified color
        block["visualization3D"]["groupBoundary"] = {
            "enabled": True,
            "color": group_color,
            "opacity": 0.3,
        }

        updated_blocks.append(block)

    return updated_blocks


def create_3d_connection_route(
    connection: dict[str, Any], waypoints: list[dict[str, float]]
) -> dict[str, Any]:
    """
    Create a 3D route path for a connection.

    Args:
        connection: The connection dictionary
        waypoints: List of 3D waypoints [{"x": 1, "y": 2, "z": 3}, ...]

    Returns:
        Updated connection with 3D route path
    """
    if not connection or not waypoints:
        return connection

    # Initialize 3D visualization if not present
    if "visualization3D" not in connection:
        connection["visualization3D"] = {
            "routePath": [],
            "routingStatus": "planned",
            "cableProperties": {
                "type": "standard",
                "gauge": "AWG18",
                "length": 0.0,
                "color": "black",
            },
            "visualStyle": {
                "color": "#757575",  # Gray default
                "thickness": 2.0,
                "opacity": 0.8,
                "animated": False,
            },
        }

    # Set route path
    connection["visualization3D"]["routePath"] = waypoints
    connection["visualization3D"]["routingStatus"] = "routed"

    # Calculate total length
    total_length = 0.0
    for i in range(1, len(waypoints)):
        prev = waypoints[i - 1]
        curr = waypoints[i]
        # Simple Euclidean distance
        distance = (
            (curr["x"] - prev["x"]) ** 2
            + (curr["y"] - prev["y"]) ** 2
            + (curr["z"] - prev["z"]) ** 2
        ) ** 0.5
        total_length += distance

    connection["visualization3D"]["cableProperties"]["length"] = total_length

    return connection


def update_live_thumbnail(block: dict[str, Any], thumbnail_data: str) -> dict[str, Any]:
    """
    Update the live 3D thumbnail for a block.

    Args:
        block: The block dictionary
        thumbnail_data: Base64 encoded thumbnail data

    Returns:
        Updated block with new thumbnail
    """
    if not block or not thumbnail_data:
        return block

    # Initialize 3D visualization if needed
    block = initialize_3d_visualization(block)

    # Update thumbnail in CAD links if present
    for link in block.get("links", []):
        if link.get("target") == "cad":
            link["thumbnail"] = {
                "dataUrl": thumbnail_data,
                "width": 150,
                "height": 150,
                "generatedAt": datetime.now().isoformat(),
            }

    # Update last thumbnail update time
    block["visualization3D"]["liveThumbnail"]["lastUpdated"] = (
        datetime.now().isoformat()
    )

    return block


def initialize_living_documentation(block: dict[str, Any]) -> dict[str, Any]:
    """
    Initialize living documentation properties for a block.

    Args:
        block: The block dictionary to enhance

    Returns:
        Updated block with living documentation properties
    """
    if not block:
        return block

    # Initialize living documentation if not present
    if "livingDocumentation" not in block:
        block["livingDocumentation"] = {
            "assemblySequence": {
                "order": 1,
                "dependencies": [],
                "estimatedTime": 0.0,
                "complexity": "moderate",
            },
            "bomEntry": {
                "partNumber": f"PART-{block.get('id', 'UNKNOWN')[:8].upper()}",
                "quantity": 1,
                "supplier": "TBD",
                "cost": 0.0,
                "leadTime": 0,
                "category": block.get("type", "component"),
            },
            "serviceManual": {
                "maintenanceInterval": 0,
                "replacementParts": [],
                "troubleshootingSteps": [],
                "safetyNotes": [],
            },
            "changeImpact": {
                "lastChanged": datetime.now().isoformat(),
                "affectedBlocks": [],
                "impactLevel": "low",
                "changeReason": "Initial creation",
            },
            "manufacturingProgress": {
                "stage": "design",
                "completionPercentage": 0.0,
                "qualityChecks": [],
                "certifications": [],
            },
        }

    return block


def generate_assembly_sequence(diagram: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Auto-generate assembly sequence from block diagram dependencies.

    Args:
        diagram: The complete diagram

    Returns:
        List of assembly steps in order
    """
    if not diagram or not diagram.get("blocks", []):
        return []

    blocks = diagram["blocks"]
    connections = diagram.get("connections", [])

    # Initialize all blocks with living documentation
    for block in blocks:
        initialize_living_documentation(block)

    # Analyze dependencies from connections
    dependency_map = {}
    for connection in connections:
        from_block = connection.get("from", {}).get("blockId")
        to_block = connection.get("to", {}).get("blockId")

        if from_block and to_block:
            if to_block not in dependency_map:
                dependency_map[to_block] = []
            dependency_map[to_block].append(from_block)

    # Generate assembly sequence
    assembly_steps = []
    order = 1

    # Start with blocks that have no dependencies
    for block in blocks:
        block_id = block.get("id", "")
        if block_id not in dependency_map:
            # No dependencies - can be assembled first
            step = {
                "order": order,
                "blockId": block_id,
                "blockName": block.get("name", "Unknown"),
                "dependencies": [],
                "estimatedTime": estimate_assembly_time(block),
                "complexity": determine_complexity(block),
                "instructions": generate_assembly_instructions(block),
            }
            assembly_steps.append(step)

            # Update block's living documentation
            block["livingDocumentation"]["assemblySequence"]["order"] = order
            order += 1

    # Then add blocks with dependencies in topological order
    remaining_blocks = [b for b in blocks if b.get("id", "") in dependency_map]
    processed = {step["blockId"] for step in assembly_steps}

    while remaining_blocks:
        progress_made = False

        # Copy list to modify during iteration
        for block in remaining_blocks[:]:
            block_id = block.get("id", "")
            dependencies = dependency_map.get(block_id, [])

            # Check if all dependencies are processed
            if all(dep in processed for dep in dependencies):
                step = {
                    "order": order,
                    "blockId": block_id,
                    "blockName": block.get("name", "Unknown"),
                    "dependencies": dependencies,
                    "estimatedTime": estimate_assembly_time(block),
                    "complexity": determine_complexity(block),
                    "instructions": generate_assembly_instructions(block),
                }
                assembly_steps.append(step)

                # Update block's living documentation
                block["livingDocumentation"]["assemblySequence"]["order"] = order
                block["livingDocumentation"]["assemblySequence"]["dependencies"] = (
                    dependencies
                )

                remaining_blocks.remove(block)
                processed.add(block_id)
                order += 1
                progress_made = True

        # Prevent infinite loop if there are circular dependencies
        if not progress_made:
            for block in remaining_blocks:
                block_id = block.get("id", "")
                step = {
                    "order": order,
                    "blockId": block_id,
                    "blockName": block.get("name", "Unknown"),
                    "dependencies": dependency_map.get(block_id, []),
                    "estimatedTime": estimate_assembly_time(block),
                    "complexity": "critical",  # Mark as critical due to circular dependency
                    "instructions": ["⚠️ Resolve circular dependency before assembly"],
                }
                assembly_steps.append(step)
                order += 1
            break

    return assembly_steps


def estimate_assembly_time(block: dict[str, Any]) -> float:
    """
    Estimate assembly time for a block based on its properties.

    Args:
        block: The block dictionary

    Returns:
        Estimated time in minutes
    """
    base_time = 10.0  # Base 10 minutes

    # Add time based on number of interfaces
    interfaces = block.get("interfaces", [])
    base_time += len(interfaces) * 2.0

    # Add time based on CAD links (more complex components)
    cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]
    base_time += len(cad_links) * 5.0

    # Adjust based on block type
    block_type = block.get("type", "")
    type_multipliers = {
        "mechanical": 1.5,
        "electrical": 1.2,
        "software": 0.8,
        "control": 1.3,
    }
    multiplier = type_multipliers.get(block_type, 1.0)

    return base_time * multiplier


def determine_complexity(block: dict[str, Any]) -> str:
    """
    Determine complexity level of a block for assembly.

    Args:
        block: The block dictionary

    Returns:
        Complexity level string
    """
    complexity_score = 0

    # Interface count contributes to complexity
    interfaces = block.get("interfaces", [])
    complexity_score += len(interfaces)

    # CAD links add complexity
    cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]
    complexity_score += len(cad_links) * 2

    # Child diagrams add significant complexity
    if block.get("childDiagram"):
        complexity_score += 5

    # Determine complexity level
    if complexity_score <= 2:
        return "simple"
    elif complexity_score <= 5:
        return "moderate"
    elif complexity_score <= 8:
        return "complex"
    else:
        return "critical"


def generate_assembly_instructions(block: dict[str, Any]) -> list[str]:
    """
    Generate assembly instructions for a block.

    Args:
        block: The block dictionary

    Returns:
        List of instruction strings
    """
    instructions = []
    block_name = block.get("name", "Component")

    # Basic preparation
    instructions.append(f"1. Prepare {block_name} for assembly")

    # CAD component instructions
    cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]
    if cad_links:
        instructions.append("2. Verify all CAD components are available:")
        for i, link in enumerate(cad_links):
            component_name = link.get("componentProperties", {}).get(
                "name", f"Component {i + 1}"
            )
            instructions.append(f"   - {component_name}")

    # Interface instructions
    interfaces = block.get("interfaces", [])
    if interfaces:
        instructions.append("3. Connect interfaces:")
        for interface in interfaces:
            instructions.append(
                f"   - {interface.get('name', 'Interface')}: {interface.get('kind', 'connection')}"
            )

    # Final verification
    instructions.append("4. Verify assembly completion and test functionality")

    return instructions


def generate_living_bom(diagram: dict[str, Any]) -> dict[str, Any]:
    """
    Generate a living Bill of Materials from the diagram.

    Args:
        diagram: The complete diagram

    Returns:
        BOM data structure
    """
    if not diagram or not diagram.get("blocks", []):
        return {"items": [], "summary": {}}

    bom_items = []
    total_cost = 0.0
    categories = {}

    for block in diagram["blocks"]:
        # Initialize living documentation if needed
        block = initialize_living_documentation(block)

        bom_entry = block["livingDocumentation"]["bomEntry"]

        # Create BOM item
        item = {
            "blockId": block.get("id", ""),
            "blockName": block.get("name", "Unknown"),
            "partNumber": bom_entry["partNumber"],
            "quantity": bom_entry["quantity"],
            "supplier": bom_entry["supplier"],
            "cost": bom_entry["cost"],
            "leadTime": bom_entry["leadTime"],
            "category": bom_entry["category"],
            "totalCost": bom_entry["cost"] * bom_entry["quantity"],
        }

        # Add CAD component details if available
        cad_links = [
            link for link in block.get("links", []) if link.get("target") == "cad"
        ]
        if cad_links:
            item["cadComponents"] = []
            for link in cad_links:
                comp_props = link.get("componentProperties", {})
                item["cadComponents"].append(
                    {
                        "name": comp_props.get("name", "Component"),
                        "material": comp_props.get("material", "Unknown"),
                        "mass": comp_props.get("mass", 0.0),
                    }
                )

        bom_items.append(item)
        total_cost += item["totalCost"]

        # Track categories
        category = item["category"]
        if category not in categories:
            categories[category] = {"count": 0, "cost": 0.0}
        categories[category]["count"] += item["quantity"]
        categories[category]["cost"] += item["totalCost"]

    # Generate summary
    summary = {
        "totalItems": len(bom_items),
        "totalCost": total_cost,
        "categories": categories,
        "generatedAt": datetime.now().isoformat(),
        "maxLeadTime": max([item["leadTime"] for item in bom_items], default=0),
    }

    return {"items": bom_items, "summary": summary}


def track_change_impact(
    diagram: dict[str, Any], changed_block_id: str, change_reason: str
) -> dict[str, Any]:
    """
    Track and analyze the impact of changes to a block.

    Args:
        diagram: The complete diagram
        changed_block_id: ID of the block that changed
        change_reason: Reason for the change

    Returns:
        Change impact analysis
    """
    if not diagram or not changed_block_id:
        return {"affectedBlocks": [], "impactLevel": "unknown"}

    # Find the changed block
    changed_block = None
    for block in diagram["blocks"]:
        if block.get("id") == changed_block_id:
            changed_block = block
            break

    if not changed_block:
        return {"affectedBlocks": [], "impactLevel": "unknown"}

    # Initialize living documentation
    changed_block = initialize_living_documentation(changed_block)

    # Find all connections involving this block
    connections = diagram.get("connections", [])
    affected_block_ids = set()

    for connection in connections:
        from_block = connection.get("from", {}).get("blockId")
        to_block = connection.get("to", {}).get("blockId")

        if from_block == changed_block_id:
            affected_block_ids.add(to_block)
        elif to_block == changed_block_id:
            affected_block_ids.add(from_block)

    # Determine impact level
    impact_level = "low"
    if len(affected_block_ids) > 5:
        impact_level = "critical"
    elif len(affected_block_ids) > 2:
        impact_level = "high"
    elif len(affected_block_ids) > 0:
        impact_level = "medium"

    # Update change impact in the block
    changed_block["livingDocumentation"]["changeImpact"] = {
        "lastChanged": datetime.now().isoformat(),
        "affectedBlocks": list(affected_block_ids),
        "impactLevel": impact_level,
        "changeReason": change_reason,
    }

    # Update affected blocks
    for block in diagram["blocks"]:
        if block.get("id") in affected_block_ids:
            block = initialize_living_documentation(block)
            # Mark as potentially affected
            if (
                changed_block_id
                not in block["livingDocumentation"]["changeImpact"]["affectedBlocks"]
            ):
                block["livingDocumentation"]["changeImpact"]["affectedBlocks"].append(
                    changed_block_id
                )

    return {
        "affectedBlocks": list(affected_block_ids),
        "impactLevel": impact_level,
        "changeReason": change_reason,
        "timestamp": datetime.now().isoformat(),
    }


def update_manufacturing_progress(
    block: dict[str, Any], stage: str, completion: float
) -> dict[str, Any]:
    """
    Update manufacturing progress for a block.

    Args:
        block: The block dictionary
        stage: Manufacturing stage ("design", "prototype", "production", "complete")
        completion: Completion percentage (0-100)

    Returns:
        Updated block with manufacturing progress
    """
    if not block:
        return block

    # Initialize living documentation if needed
    block = initialize_living_documentation(block)

    # Update manufacturing progress
    block["livingDocumentation"]["manufacturingProgress"] = {
        "stage": stage,
        "completionPercentage": max(0, min(100, completion)),
        "qualityChecks": block["livingDocumentation"]["manufacturingProgress"].get(
            "qualityChecks", []
        ),
        "certifications": block["livingDocumentation"]["manufacturingProgress"].get(
            "certifications", []
        ),
    }

    return block
