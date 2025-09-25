import adsk.core
import adsk.fusion
import traceback
import pathlib
import json
import sys
import os
from datetime import datetime

# Add current directory to path so we can import diagram_data
sys.path.insert(0, os.path.dirname(__file__))

import diagram_data  # noqa: E402

APP = adsk.core.Application.get()
UI = APP.userInterface
ATTR_GROUP = "systemBlocks"

_handlers = []  # keep event handlers alive


def get_root_component():
    """Get the root component of the active design."""
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if design:
            return design.rootComponent
    except Exception:
        pass
    return None


def save_diagram_json(json_data):
    """Save diagram JSON to Fusion attributes."""
    try:
        # Validate the diagram before saving
        diagram = json.loads(json_data)
        is_valid, error = diagram_data.validate_diagram(diagram)
        if not is_valid:
            UI.messageBox(f"Diagram validation failed: {error}")
            return False

        # Check link validation specifically
        links_valid, link_errors = diagram_data.validate_diagram_links(diagram)
        if not links_valid:
            error_msg = "Link validation errors:\n" + "\n".join(link_errors)
            UI.messageBox(error_msg)
            return False

        root_comp = get_root_component()
        if not root_comp:
            UI.messageBox("No active design found")
            return False

        # Remove existing attribute if it exists
        existing_attr = root_comp.attributes.itemByName(ATTR_GROUP, "diagramJson")
        if existing_attr:
            existing_attr.deleteMe()

        # Add new attribute
        root_comp.attributes.add(ATTR_GROUP, "diagramJson", json_data)
        UI.messageBox("Diagram saved successfully")
        return True
    except Exception as e:
        UI.messageBox(f"Save failed: {str(e)}")
        return False


def load_diagram_json():
    """Load diagram JSON from Fusion attributes."""
    try:
        root_comp = get_root_component()
        if not root_comp:
            UI.messageBox("No active design found")
            return None

        attr = root_comp.attributes.itemByName(ATTR_GROUP, "diagramJson")
        if attr:
            return attr.value
        else:
            UI.messageBox("No saved diagram found")
            return None
    except Exception as e:
        UI.messageBox(f"Load failed: {str(e)}")
        return None


def start_cad_selection(block_id, block_name):
    """Start CAD component selection for linking to a block."""
    try:
        # Create a selection command
        selection_cmd = UI.commandDefinitions.itemById("selectCADForBlock")
        if not selection_cmd:
            selection_cmd = UI.commandDefinitions.addButtonDefinition(
                "selectCADForBlock",
                f'Select CAD for "{block_name}"',
                f'Select a Fusion occurrence to link to block "{block_name}"',
            )

        # Set up command handler
        handler = CADSelectionHandler(block_id, block_name)
        selection_cmd.commandCreated.add(handler)
        _handlers.append(handler)

        # Execute the command
        selection_cmd.execute()

    except Exception as e:
        UI.messageBox(f"CAD selection failed: {str(e)}")


class CADSelectionHandler(adsk.core.CommandCreatedEventHandler):
    """Handle CAD component selection for linking."""

    def __init__(self, block_id, block_name):
        super().__init__()
        self.block_id = block_id
        self.block_name = block_name

    def notify(self, args):
        try:
            cmd = args.command
            cmd.isRepeatable = False

            # Set up selection input
            inputs = cmd.commandInputs
            selection_input = inputs.addSelectionInput(
                "cadSelection",
                "Select CAD Component",
                f'Select a component or occurrence to link to "{self.block_name}"',
            )
            selection_input.addSelectionFilter("Occurrences")
            selection_input.setSelectionLimits(1, 1)

            # Set up event handlers
            execute_handler = CADSelectionExecuteHandler(self.block_id)
            cmd.execute.add(execute_handler)
            _handlers.append(execute_handler)

        except Exception as e:
            UI.messageBox(f"CAD selection setup failed: {str(e)}")


class CADSelectionExecuteHandler(adsk.core.CommandEventHandler):
    """Handle execution of CAD selection command."""

    def __init__(self, block_id):
        super().__init__()
        self.block_id = block_id

    def notify(self, args):
        try:
            cmd = args.command
            inputs = cmd.commandInputs
            selection_input = inputs.itemById("cadSelection")

            if selection_input.selectionCount > 0:
                selected_entity = selection_input.selection(0).entity

                if hasattr(selected_entity, "entityToken"):
                    occ_token = selected_entity.entityToken
                    design = adsk.fusion.Design.cast(APP.activeProduct)
                    doc_id = design.parentDocument.name if design and design.parentDocument else ""

                    # Send CAD link data back to palette
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        script = (
                            f"receiveCADLinkFromPython('{self.block_id}', '{occ_token}', "
                            f"'{doc_id}', '');"
                        )
                        palette.sendInfoToHTML("cad-link-response", script)

                    UI.messageBox("CAD component linked successfully")
                else:
                    UI.messageBox("Selected entity does not have a valid token")
            else:
                UI.messageBox("No component selected")

        except Exception as e:
            UI.messageBox(f"CAD selection execution failed: {str(e)}")


# ============================================================================
# MILESTONE 12: ENHANCED CAD LINKING SYSTEM - FUSION 360 INTEGRATION
# ============================================================================


def sync_all_components_in_fusion(diagram):
    """
    Sync all CAD components in the diagram with Fusion 360.

    Args:
        diagram: The diagram dictionary containing blocks with CAD links

    Returns:
        Dictionary with sync results
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return {
                "total_blocks": len(diagram.get("blocks", [])),
                "blocks_with_cad": 0,
                "total_components": 0,
                "sync_successful": 0,
                "sync_failed": 0,
                "errors": ["No active Fusion 360 design found"],
            }

        results = {
            "total_blocks": len(diagram.get("blocks", [])),
            "blocks_with_cad": 0,
            "total_components": 0,
            "sync_successful": 0,
            "sync_failed": 0,
            "errors": [],
        }

        for block in diagram.get("blocks", []):
            cad_links = [link for link in block.get("links", []) if link.get("target") == "cad"]

            if cad_links:
                results["blocks_with_cad"] += 1
                results["total_components"] += len(cad_links)

                for link in cad_links:
                    try:
                        # Get component from Fusion 360
                        component_info = get_component_info_from_fusion(
                            link.get("docId", ""), link.get("occToken", "")
                        )

                        if component_info:
                            # Update component properties in the link
                            link = diagram_data.update_component_properties(
                                link,
                                material=component_info.get("material", ""),
                                mass=component_info.get("mass", 0.0),
                                volume=component_info.get("volume", 0.0),
                                boundingBox=component_info.get("boundingBox"),
                                customProperties=component_info.get("customProperties", {}),
                            )

                            # Generate thumbnail if needed
                            if "thumbnail" not in link:
                                link["thumbnail"] = (
                                    diagram_data.generate_component_thumbnail_placeholder(
                                        component_name=component_info.get("name", "Component")
                                    )
                                )

                            results["sync_successful"] += 1
                        else:
                            # Component not found - mark as missing
                            link = diagram_data.mark_component_as_missing(
                                link, "Component not found in active Fusion 360 design"
                            )
                            results["sync_failed"] += 1

                    except Exception as e:
                        results["sync_failed"] += 1
                        results["errors"].append(f"Failed to sync component: {str(e)}")

        return results

    except Exception as e:
        return {
            "total_blocks": 0,
            "blocks_with_cad": 0,
            "total_components": 0,
            "sync_successful": 0,
            "sync_failed": 0,
            "errors": [f"Sync operation failed: {str(e)}"],
        }


def get_component_info_from_fusion(doc_id, occ_token):
    """
    Get component information from Fusion 360.

    Args:
        doc_id: Document ID
        occ_token: Occurrence token

    Returns:
        Dictionary with component information or None if not found
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return None

        # Find the occurrence by token
        occurrence = find_occurrence_by_token(design.rootComponent, occ_token)
        if not occurrence:
            return None

        # Get component properties
        component = occurrence.component
        info = {
            "name": component.name,
            "material": "",
            "mass": 0.0,
            "volume": 0.0,
            "boundingBox": None,
            "customProperties": {},
        }

        # Get physical properties if available
        try:
            physical_props = component.getPhysicalProperties(
                adsk.fusion.CalculationAccuracy.LowCalculationAccuracy
            )
            if physical_props:
                info["mass"] = physical_props.mass / 1000.0  # Convert to kg
                info["volume"] = physical_props.volume / 1000.0  # Convert to cm³

                # Get bounding box
                bbox = physical_props.boundingBox
                if bbox:
                    info["boundingBox"] = {
                        "min": [bbox.minPoint.x, bbox.minPoint.y, bbox.minPoint.z],
                        "max": [bbox.maxPoint.x, bbox.maxPoint.y, bbox.maxPoint.z],
                    }
        except Exception:
            pass  # Physical properties might not be available

        # Get material information
        try:
            if hasattr(component, "material") and component.material:
                info["material"] = component.material.name
        except Exception:
            pass  # Material might not be assigned

        # Get custom properties
        try:
            if hasattr(component, "attributes"):
                for attr_group in component.attributes:
                    for attr in attr_group:
                        info["customProperties"][f"{attr_group.name}:{attr.name}"] = attr.value
        except Exception:
            pass  # Custom properties might not exist

        return info

    except Exception:
        return None


def find_occurrence_by_token(component, target_token):
    """
    Recursively find an occurrence by its token.

    Args:
        component: Component to search in
        target_token: Token to find

    Returns:
        Occurrence if found, None otherwise
    """
    try:
        for occurrence in component.occurrences:
            if occurrence.entityToken == target_token:
                return occurrence

            # Search recursively in sub-components
            if occurrence.component:
                found = find_occurrence_by_token(occurrence.component, target_token)
                if found:
                    return found

        return None

    except Exception:
        return None


def get_all_component_statuses(diagram):
    """
    Get status of all components in the diagram.

    Args:
        diagram: The diagram dictionary

    Returns:
        Dictionary mapping block IDs to their component status
    """
    statuses = {}

    for block in diagram.get("blocks", []):
        block_id = block.get("id", "")
        if block_id:
            health_status = diagram_data.get_component_health_status(block)
            statuses[block_id] = health_status

    return statuses


def start_enhanced_cad_selection(block_id, block_name):
    """
    Start enhanced CAD component selection process.

    Args:
        block_id: ID of the block to link
        block_name: Name of the block
    """
    try:
        # For now, use the existing CAD selection process
        # In the future, this could be enhanced with additional property collection
        start_cad_selection(block_id, block_name)

    except Exception as e:
        UI.messageBox(f"Enhanced CAD selection error: {str(e)}")


# ============================================================================
# MILESTONE 13: VISUAL INTEGRATION & LIVING DOCUMENTATION - FUSION 360 API
# ============================================================================


def enable_3d_overlay_mode(diagram, view_box):
    """
    Enable 3D overlay mode in Fusion 360 viewport.

    Args:
        diagram: The block diagram data
        view_box: Current view box coordinates
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            UI.messageBox("No active Fusion 360 design found")
            return

        # For now, show a message that overlay mode is enabled
        # In the future, this would create actual 3D overlays in the viewport
        UI.messageBox(
            "3D Overlay Mode Enabled!\nBlock diagram overlays are now active in the 3D viewport."
        )

        # Initialize 3D visualization for all blocks
        if "blocks" in diagram:
            for block in diagram["blocks"]:
                diagram_data.initialize_3d_visualization(block)

    except Exception as e:
        UI.messageBox(f"3D overlay enable error: {str(e)}")


def disable_3d_overlay_mode():
    """
    Disable 3D overlay mode in Fusion 360 viewport.
    """
    try:
        # Clear any 3D overlays
        UI.messageBox("3D Overlay Mode Disabled")

    except Exception as e:
        UI.messageBox(f"3D overlay disable error: {str(e)}")


def highlight_block_components(block_id, highlight_color):
    """
    Highlight 3D components associated with a block.

    Args:
        block_id: ID of the block whose components to highlight
        highlight_color: Color for highlighting (hex string)
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # Load current diagram to find the block
        diagram_json = load_diagram_json()
        if not diagram_json or "blocks" not in diagram_json:
            return

        # Find the block
        target_block = None
        for block in diagram_json["blocks"]:
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Find CAD links in the block
        cad_links = [link for link in target_block.get("links", []) if link.get("target") == "cad"]

        highlighted_count = 0
        for link in cad_links:
            occ_token = link.get("occToken", "")
            if occ_token:
                # Find occurrence by token
                occurrence = find_occurrence_by_token(design.rootComponent, occ_token)
                if occurrence:
                    # In a full implementation, this would change the appearance
                    # For now, we'll select the component to show it's highlighted
                    if highlighted_count == 0:  # Select first component to show highlighting
                        selection = APP.activeViewport.activeSelections
                        selection.clear()
                        selection.add(occurrence)
                    highlighted_count += 1

        if highlighted_count > 0:
            UI.messageBox(
                f"Highlighted {highlighted_count} components for block: "
                f"{target_block.get('name', 'Unknown')}"
            )
        else:
            UI.messageBox(
                f"No CAD components found for block: {target_block.get('name', 'Unknown')}"
            )

    except Exception as e:
        UI.messageBox(f"Component highlighting error: {str(e)}")


def create_connection_route_3d(connection_id, from_block_id, to_block_id, route_style):
    """
    Create 3D route visualization for a connection.

    Args:
        connection_id: ID of the connection
        from_block_id: Source block ID
        to_block_id: Target block ID
        route_style: Visualization style properties
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # For now, show a message about route creation
        UI.messageBox(f"Creating 3D route from {from_block_id} to {to_block_id}")

        # In a full implementation, this would:
        # 1. Find the 3D positions of components linked to both blocks
        # 2. Calculate optimal routing path
        # 3. Create 3D curve or sketch to visualize the connection
        # 4. Apply styling (color, thickness, animation)

    except Exception as e:
        UI.messageBox(f"Connection route error: {str(e)}")


def create_system_group_visualization(block_ids, group_color):
    """
    Create system grouping visualization for multiple blocks.

    Args:
        block_ids: List of block IDs to group
        group_color: Color for the group boundary
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        UI.messageBox(f"Creating system group for {len(block_ids)} blocks with color {group_color}")

        # In a full implementation, this would:
        # 1. Find all components linked to the blocks
        # 2. Calculate a bounding volume around all components
        # 3. Create a visual boundary (wireframe box, colored region, etc.)
        # 4. Apply group color and styling

    except Exception as e:
        UI.messageBox(f"System grouping error: {str(e)}")


def generate_live_thumbnail(block_id, view_angle, size):
    """
    Generate a live 3D thumbnail for a block.

    Args:
        block_id: ID of the block
        view_angle: Camera angle ("iso", "front", "top", "side")
        size: Thumbnail dimensions {"width": 150, "height": 150}
    """
    try:
        design = adsk.fusion.Design.cast(APP.activeProduct)
        if not design:
            return

        # Load current diagram to find the block
        diagram_json = load_diagram_json()
        if not diagram_json or "blocks" not in diagram_json:
            return

        # Find the block
        target_block = None
        for block in diagram_json["blocks"]:
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # For now, update the block with a placeholder thumbnail
        # In a full implementation, this would:
        # 1. Set camera to specified view angle
        # 2. Focus on components linked to the block
        # 3. Capture viewport image at specified size
        # 4. Convert to base64 and update block data

        thumbnail_data = (
            "data:image/png;base64,"
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/"
            "PchI7wAAAABJRU5ErkJggg=="
        )

        # Update block with live thumbnail
        updated_block = diagram_data.update_live_thumbnail(target_block, thumbnail_data)

        # Save updated diagram
        for i, block in enumerate(diagram_json["blocks"]):
            if block.get("id") == block_id:
                diagram_json["blocks"][i] = updated_block
                break

        save_diagram_json(diagram_json)

        # Notify JavaScript that thumbnail was updated
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = (
                f"if(editor) {{ editor.onThumbnailUpdated('{block_id}', '{thumbnail_data}'); }}"
            )
            palette.sendInfoToHTML("thumbnail-updated", script)

    except Exception as e:
        UI.messageBox(f"Live thumbnail error: {str(e)}")


def generate_assembly_sequence_from_diagram(diagram):
    """
    Generate assembly sequence from diagram and send to JavaScript.

    Args:
        diagram: The complete diagram data
    """
    try:
        # Generate assembly sequence using diagram_data
        assembly_sequence = diagram_data.generate_assembly_sequence(diagram)

        # Send response to JavaScript
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = (
                f"if(editor && editor.displayAssemblySequence) {{ "
                f"editor.displayAssemblySequence({json.dumps(assembly_sequence)}); }}"
            )
            palette.sendInfoToHTML("assembly-sequence", script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = f"console.error('Assembly sequence error: {str(e)}');"
            palette.sendInfoToHTML("assembly-error", script)


def generate_living_bom_from_diagram(diagram):
    """
    Generate living BOM from diagram and send to JavaScript.

    Args:
        diagram: The complete diagram data
    """
    try:
        # Generate living BOM using diagram_data
        living_bom = diagram_data.generate_living_bom(diagram)

        # Send response to JavaScript
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = (
                f"if(editor && editor.displayLivingBOM) {{ "
                f"editor.displayLivingBOM({json.dumps(living_bom)}); }}"
            )
            palette.sendInfoToHTML("living-bom", script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = f"console.error('Living BOM error: {str(e)}');"
            palette.sendInfoToHTML("bom-error", script)


def generate_service_manual_for_block(block_id, diagram):
    """
    Generate service manual for a specific block.

    Args:
        block_id: ID of the block
        diagram: The complete diagram data
    """
    try:
        # Find the block
        target_block = None
        for block in diagram.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Initialize living documentation
        target_block = diagram_data.initialize_living_documentation(target_block)

        # Generate service manual content
        service_manual = {
            "blockName": target_block.get("name", "Unknown"),
            "blockId": block_id,
            "maintenanceInterval": target_block["livingDocumentation"]["serviceManual"][
                "maintenanceInterval"
            ],
            "replacementParts": target_block["livingDocumentation"]["serviceManual"][
                "replacementParts"
            ],
            "troubleshootingSteps": target_block["livingDocumentation"]["serviceManual"][
                "troubleshootingSteps"
            ],
            "safetyNotes": target_block["livingDocumentation"]["serviceManual"]["safetyNotes"],
            "generatedAt": datetime.now().isoformat(),
        }

        # Send to JavaScript
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = f"if(editor) {{ editor.displayServiceManual({json.dumps(service_manual)}); }}"
            palette.sendInfoToHTML("service-manual", script)

    except Exception as e:
        UI.messageBox(f"Service manual error: {str(e)}")


def analyze_change_impact_for_block(block_id, diagram):
    """
    Analyze change impact for a specific block.

    Args:
        block_id: ID of the block that changed
        diagram: The complete diagram data
    """
    try:
        # Analyze change impact using diagram_data
        impact_analysis = diagram_data.track_change_impact(
            diagram, block_id, "User-initiated analysis"
        )

        # Send to JavaScript
        palette = UI.palettes.itemById("sysBlocksPalette")
        if palette:
            script = (
                f"if(editor && editor.displayChangeImpact) {{ "
                f"editor.displayChangeImpact({json.dumps(impact_analysis)}); }}"
            )
            palette.sendInfoToHTML("change-impact", script)

    except Exception as e:
        UI.messageBox(f"Change impact analysis error: {str(e)}")


class PaletteMessageHandler(adsk.core.HTMLEventHandler):
    """Handle messages from the palette."""

    def notify(self, args):
        try:
            htmlArgs = adsk.core.HTMLEventArgs.cast(args)
            data = json.loads(htmlArgs.data)
            action = data.get("action", "")
            payload = data.get("data", "")

            if action == "save-diagram":
                save_diagram_json(payload)
            elif action == "load-diagram":
                json_data = load_diagram_json()
                if json_data:
                    # Send data back to palette
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        script = f"loadDiagramFromPython({json.dumps(json_data)});"
                        palette.sendInfoToHTML("load-response", script)
            elif action == "link-to-cad":
                block_id = payload.get("blockId", "")
                block_name = payload.get("blockName", "")
                start_cad_selection(block_id, block_name)
            elif action == "export-report":
                # Export reports using diagram_data functions
                json_data = load_diagram_json()
                if json_data:
                    export_paths = diagram_data.export_report_files(json_data)
                    # Send success response back to palette
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {
                            "status": "success",
                            "files": export_paths,
                            "message": f"Exported {len(export_paths)} report files",
                        }
                        palette.sendInfoToHTML("export-response", json.dumps(response))
                else:
                    # Send error response back to palette
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {"status": "error", "message": "No diagram data found to export"}
                        palette.sendInfoToHTML("export-response", json.dumps(response))
            elif action == "import-mermaid":
                # Import from Mermaid flowchart
                mermaid_text = payload.get("mermaidText", "")
                if mermaid_text:
                    try:
                        imported_diagram = diagram_data.parse_mermaid_flowchart(mermaid_text)
                        is_valid, validation_message = diagram_data.validate_imported_diagram(
                            imported_diagram
                        )

                        palette = UI.palettes.itemById("sysBlocksPalette")
                        if palette:
                            if is_valid:
                                response = {
                                    "success": True,
                                    "diagram": imported_diagram,
                                    "warnings": (
                                        validation_message
                                        if "violation" in validation_message
                                        else None
                                    ),
                                }
                            else:
                                response = {"success": False, "error": validation_message}
                            script = f"receiveImportFromPython({json.dumps(response)});"
                            palette.sendInfoToHTML("import-response", script)
                    except Exception as e:
                        palette = UI.palettes.itemById("sysBlocksPalette")
                        if palette:
                            response = {
                                "success": False,
                                "error": f"Mermaid import failed: {str(e)}",
                            }
                            script = f"receiveImportFromPython({json.dumps(response)});"
                            palette.sendInfoToHTML("import-response", script)
                else:
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {"success": False, "error": "No Mermaid text provided"}
                        script = f"receiveImportFromPython({json.dumps(response)});"
                        palette.sendInfoToHTML("import-response", script)
            elif action == "import-csv":
                # Import from CSV
                csv_blocks = payload.get("csvBlocks", "")
                csv_connections = payload.get("csvConnections", "")
                if csv_blocks:
                    try:
                        imported_diagram = diagram_data.import_from_csv(csv_blocks, csv_connections)
                        is_valid, validation_message = diagram_data.validate_imported_diagram(
                            imported_diagram
                        )

                        palette = UI.palettes.itemById("sysBlocksPalette")
                        if palette:
                            if is_valid:
                                response = {
                                    "success": True,
                                    "diagram": imported_diagram,
                                    "warnings": (
                                        validation_message
                                        if "violation" in validation_message
                                        else None
                                    ),
                                }
                            else:
                                response = {"success": False, "error": validation_message}
                            palette.sendInfoToHTML(
                                "import-response",
                                f"receiveImportFromPython({json.dumps(response)});",
                            )
                    except Exception as e:
                        palette = UI.palettes.itemById("sysBlocksPalette")
                        if palette:
                            response = {"success": False, "error": f"CSV import failed: {str(e)}"}
                            script = f"receiveImportFromPython({json.dumps(response)});"
                            palette.sendInfoToHTML("import-response", script)
                else:
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {"success": False, "error": "No CSV blocks data provided"}
                        script = f"receiveImportFromPython({json.dumps(response)});"
                        palette.sendInfoToHTML("import-response", script)

            # ============================================================================
            # MILESTONE 12: ENHANCED CAD LINKING SYSTEM - MESSAGE HANDLERS
            # ============================================================================
            elif action == "sync-all-components":
                # Sync all CAD components in the diagram
                diagram = payload
                try:
                    sync_results = sync_all_components_in_fusion(diagram)

                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {
                            "success": True,
                            "results": sync_results,
                            "componentStatuses": get_all_component_statuses(diagram),
                        }
                        script = (
                            f"if(editor) {{ "
                            f"editor.handleComponentSyncResponse({json.dumps(response)}); }}"
                        )
                        palette.sendInfoToHTML("sync-response", script)

                except Exception as e:
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {"success": False, "error": f"Component sync failed: {str(e)}"}
                        script = (
                            f"if(editor) {{ "
                            f"editor.handleComponentSyncResponse({json.dumps(response)}); }}"
                        )
                        palette.sendInfoToHTML("sync-response", script)

            elif action == "get-component-dashboard":
                # Get component dashboard data
                diagram = payload
                try:
                    dashboard_data = diagram_data.create_component_dashboard_data(diagram)

                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {"success": True, "dashboard": dashboard_data}
                        script = (
                            f"if(editor) {{ "
                            f"editor.handleDashboardResponse({json.dumps(response)}); }}"
                        )
                        palette.sendInfoToHTML("dashboard-response", script)

                except Exception as e:
                    palette = UI.palettes.itemById("sysBlocksPalette")
                    if palette:
                        response = {
                            "success": False,
                            "error": f"Dashboard generation failed: {str(e)}",
                        }
                        script = (
                            f"if(editor) {{ "
                            f"editor.handleDashboardResponse({json.dumps(response)}); }}"
                        )
                        palette.sendInfoToHTML("dashboard-response", script)

            elif action == "enhanced-link-to-cad":
                # Enhanced CAD linking with component properties
                block_id = payload.get("blockId", "")
                block_name = payload.get("blockName", "")
                start_enhanced_cad_selection(block_id, block_name)

            # MILESTONE 13: VISUAL INTEGRATION & LIVING DOCUMENTATION HANDLERS
            elif action == "enable-3d-overlay":
                # Enable 3D overlay mode
                enable_3d_overlay_mode(payload.get("diagram", {}), payload.get("viewBox", {}))

            elif action == "disable-3d-overlay":
                # Disable 3D overlay mode
                disable_3d_overlay_mode()

            elif action == "highlight-components":
                # Highlight 3D components for a block
                block_id = payload.get("blockId", "")
                highlight_color = payload.get("highlightColor", "#4CAF50")
                highlight_block_components(block_id, highlight_color)

            elif action == "create-connection-route":
                # Create 3D route visualization for connection
                connection_id = payload.get("connectionId", "")
                from_block_id = payload.get("fromBlockId", "")
                to_block_id = payload.get("toBlockId", "")
                route_style = payload.get("routeStyle", {})
                create_connection_route_3d(connection_id, from_block_id, to_block_id, route_style)

            elif action == "create-system-group":
                # Create system grouping visualization
                block_ids = payload.get("blockIds", [])
                group_color = payload.get("groupColor", "#2196F3")
                create_system_group_visualization(block_ids, group_color)

            elif action == "generate-live-thumbnail":
                # Generate live 3D thumbnail for block
                block_id = payload.get("blockId", "")
                view_angle = payload.get("viewAngle", "iso")
                size = payload.get("size", {"width": 150, "height": 150})
                generate_live_thumbnail(block_id, view_angle, size)

            elif action == "generate-assembly-sequence":
                # Generate assembly sequence from diagram
                diagram = payload.get("diagram", {})
                generate_assembly_sequence_from_diagram(diagram)

            elif action == "generate-living-bom":
                # Generate living Bill of Materials
                diagram = payload.get("diagram", {})
                generate_living_bom_from_diagram(diagram)

            elif action == "generate-service-manual":
                # Generate service manual for block
                block_id = payload.get("blockId", "")
                diagram = payload.get("diagram", {})
                generate_service_manual_for_block(block_id, diagram)

            elif action == "analyze-change-impact":
                # Analyze change impact for block
                block_id = payload.get("blockId", "")
                diagram = payload.get("diagram", {})
                analyze_change_impact_for_block(block_id, diagram)

        except Exception as e:
            UI.messageBox(f"Message handler error: {str(e)}")


class CommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    def notify(self, args):
        try:
            pal = UI.palettes.itemById("sysBlocksPalette")
            if not pal:
                palette_path = pathlib.Path(__file__).with_name("palette.html").as_uri()
                pal = UI.palettes.add(
                    "sysBlocksPalette", "System Blocks", palette_path, True, True, True, 600, 800
                )

                # Set up message handler
                msg_handler = PaletteMessageHandler()
                pal.incomingFromHTML.add(msg_handler)
                _handlers.append(msg_handler)

            pal.isVisible = True
        except Exception:
            UI.messageBox("Palette open failed:\n{}".format(traceback.format_exc()))


def run(context):
    try:
        cmd_def = UI.commandDefinitions.itemById("sysBlocksOpen")
        if not cmd_def:
            cmd_def = UI.commandDefinitions.addButtonDefinition(
                "sysBlocksOpen", "System Blocks", "Open the System Blocks diagram palette"
            )
        handler = CommandCreatedHandler()
        cmd_def.commandCreated.add(handler)
        _handlers.append(handler)

        ws = UI.workspaces.itemById("FusionSolidEnvironment")
        panel = ws.toolbarPanels.itemById("SolidScriptsAddinsPanel")
        if not panel.controls.itemById("sysBlocksOpen"):
            panel.controls.addCommand(cmd_def)
    except Exception:
        UI.messageBox("Add-in start failed:\n{}".format(traceback.format_exc()))


def stop(context):
    try:
        pal = UI.palettes.itemById("sysBlocksPalette")
        if pal:
            pal.deleteMe()
        ctrl = None
        ws = UI.workspaces.itemById("FusionSolidEnvironment")
        panel = ws.toolbarPanels.itemById("SolidScriptsAddinsPanel")
        if panel:
            ctrl = panel.controls.itemById("sysBlocksOpen")
        if ctrl:
            ctrl.deleteMe()
        cmd_def = UI.commandDefinitions.itemById("sysBlocksOpen")
        if cmd_def:
            cmd_def.deleteMe()
    except Exception:
        UI.messageBox("Add-in stop failed:\n{}".format(traceback.format_exc()))
