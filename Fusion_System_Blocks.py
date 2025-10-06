import adsk.core
import adsk.fusion
import traceback
import json
import sys
import os

# Add src directory to path so we can import our modules
src_path = os.path.join(os.path.dirname(__file__), 'src')
sys.path.insert(0, src_path)
import diagram_data  # noqa: E402

APP = adsk.core.Application.get()
UI = APP.userInterface
ATTR_GROUP = 'systemBlocks'

_handlers = []  # keep event handlers alive


def send_palette_notification(message, level="info"):
    """Send a non-blocking notification to the HTML palette."""

    try:
        palette = UI.palettes.itemById("SystemBlocksPalette")
    except Exception:
        palette = None

    if palette:
        script = (
            "if(window.pythonInterface && "
            "typeof window.pythonInterface.showNotification === 'function'){"
            f"window.pythonInterface.showNotification({json.dumps(message)}, "
            f"{json.dumps(level)});"
            "}"
        )
        palette.sendInfoToHTML("notification", script)
    else:
        UI.messageBox(message)


def notify_error(message):
    send_palette_notification(message, level="error")


def notify_warning(message):
    send_palette_notification(message, level="warning")


def notify_success(message):
    send_palette_notification(message, level="success")


def notify_info(message):
    send_palette_notification(message, level="info")


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
            notify_error(f"Diagram validation failed: {error}")
            return False

        # Check link validation specifically
        links_valid, link_errors = diagram_data.validate_diagram_links(diagram)
        if not links_valid:
            error_msg = 'Link validation errors:\n' + '\n'.join(link_errors)
            notify_error(error_msg)
            return False

        root_comp = get_root_component()
        if not root_comp:
            notify_error("No active design found")
            return False

        attrs = root_comp.attributes

        # Remove existing attribute if it exists
        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == 'diagramJson':
                attr.deleteMe()
                break

        # Add new attribute
        attrs.add(ATTR_GROUP, 'diagramJson', json_data)
        return True

    except Exception as e:
        notify_error(f"Failed to save diagram: {str(e)}")
        return False


def load_diagram_json():
    """Load diagram JSON from Fusion attributes."""
    try:
        root_comp = get_root_component()
        if not root_comp:
            return None

        attrs = root_comp.attributes

        for attr in attrs:
            if attr.groupName == ATTR_GROUP and attr.name == 'diagramJson':
                return attr.value

        return None

    except Exception as e:
        notify_error(f"Failed to load diagram: {str(e)}")
        return None


def load_diagram_data():
    """Return the current diagram as a Python dictionary."""
    diagram_json = load_diagram_json()
    if not diagram_json:
        return None

    if isinstance(diagram_json, dict):
        return diagram_json

    try:
        return json.loads(diagram_json)
    except (json.JSONDecodeError, TypeError) as exc:
        notify_error(f"Invalid diagram data: {exc}")
        return None


def select_occurrence_for_linking():
    """Allow user to select a Fusion occurrence for CAD linking."""
    try:
        # Create selection input
        selectionInput = UI.createSelectionInput(
            'selectOccurrence',
            'Select Component',
            'Select the component to link to this block'
        )
        selectionInput.addSelectionFilter('Occurrences')
        selectionInput.setSelectionLimits(1, 1)

        # Get the selection
        result = UI.commandDefinitions.itemById('SelectOccurrenceCommand')
        if not result:
            UI.commandDefinitions.addButtonDefinition(
                'SelectOccurrenceCommand',
                'Select Component',
                'Select a component to link'
            )

        # Create and show selection dialog
        selection = UI.selectEntity('Select the component to link to this block', 'Occurrences')

        if selection:
            occurrence = adsk.fusion.Occurrence.cast(selection)
            if occurrence:
                doc_file = None
                if APP.activeDocument:
                    doc_file = APP.activeDocument.dataFile

                return {
                    'type': 'CAD',
                    'occToken': occurrence.entityToken,
                    'name': occurrence.name,
                    'docId': doc_file.id if doc_file else None
                }

        return None

    except Exception as e:
        send_palette_notification(
            f"Failed to select occurrence: {str(e)}",
            level="error",
        )
        return None


class SystemBlocksPaletteShowCommandHandler(adsk.core.CommandCreatedEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            # Get the command created event args
            command = args.command

            # Add a command execute handler
            onExecute = CommandExecuteHandler()
            command.execute.add(onExecute)
            _handlers.append(onExecute)

        except Exception as e:
            notify_error(f"Error in command created handler: {str(e)}")


class CommandExecuteHandler(adsk.core.CommandEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            # Get the palette
            palette = UI.palettes.itemById('SystemBlocksPalette')
            if palette:
                palette.isVisible = True
                notify_success('Palette should now be visible')
            else:
                notify_warning('Error: Palette not found - creating it now')
                # Try to create the palette if it doesn't exist
                addin_path = os.path.dirname(__file__)
                html_file = os.path.join(addin_path, 'src', 'palette.html')

                # Convert Windows path to file URL format
                html_file = html_file.replace('\\', '/')
                if not html_file.startswith('file:///'):
                    html_file = 'file:///' + html_file

                palette = UI.palettes.add(
                    'SystemBlocksPalette',
                    'System Blocks Diagram',
                    html_file,
                    True,  # isVisible
                    True,  # showCloseButton
                    True,  # isResizable
                    300,   # width
                    600,   # height
                    True   # useNewWebBrowser
                )

                # Add HTML event handler
                onHTMLEvent = PaletteHTMLEventHandler()
                palette.incomingFromHTML.add(onHTMLEvent)
                _handlers.append(onHTMLEvent)

        except Exception as e:
            notify_error(f"Error showing palette: {str(e)}")


class PaletteHTMLEventHandler(adsk.core.HTMLEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            htmlArgs = adsk.core.HTMLEventArgs.cast(args)
            data = json.loads(htmlArgs.data) if htmlArgs.data else {}

            if htmlArgs.action == 'save_diagram':
                json_data = data.get('diagram', '{}')
                success = save_diagram_json(json_data)
                htmlArgs.returnData = json.dumps({'success': success})

            elif htmlArgs.action == 'load_diagram':
                diagram_json = load_diagram_json()
                if diagram_json:
                    try:
                        diagram_dict = (
                            diagram_json
                            if isinstance(diagram_json, dict)
                            else json.loads(diagram_json)
                        )
                    except json.JSONDecodeError as exc:
                        notify_error(f"Invalid diagram data: {str(exc)}")
                        diagram_dict = diagram_data.create_empty_diagram()
                else:
                    diagram_dict = diagram_data.create_empty_diagram()

                htmlArgs.returnData = json.dumps({'diagram': diagram_dict})

            elif htmlArgs.action == 'export_reports':
                diagram_json = data.get('diagram', '{}')
                diagram = json.loads(diagram_json)

                # Get the add-in directory for exports
                addin_path = os.path.dirname(__file__)
                exports_path = os.path.join(addin_path, 'exports')

                # Ensure exports directory exists
                os.makedirs(exports_path, exist_ok=True)

                # Export the reports
                files_created = diagram_data.export_report_files(
                    diagram,
                    exports_path,
                )

                htmlArgs.returnData = json.dumps({
                    'success': True,
                    'files': files_created,
                    'path': exports_path
                })

            elif htmlArgs.action == 'check_rules':
                diagram_json = data.get('diagram', '{}')
                diagram = json.loads(diagram_json)

                # Run all rule checks
                rule_results = diagram_data.run_all_rule_checks(diagram)

                htmlArgs.returnData = json.dumps({
                    'success': True,
                    'results': rule_results
                })

            elif htmlArgs.action == 'sync_components':
                diagram_json = data.get('diagram', '{}')
                diagram = json.loads(diagram_json)
                sync_results = sync_all_components_in_fusion(diagram)
                htmlArgs.returnData = json.dumps(sync_results)

            elif htmlArgs.action == 'start_cad_selection':
                block_id = data.get('blockId', '')
                block_name = data.get('blockName', 'Unknown Block')
                start_cad_selection(block_id, block_name)
                htmlArgs.returnData = json.dumps({'success': True})
            else:
                htmlArgs.returnData = json.dumps(
                    {
                        'success': False,
                        'error': f"Unknown action: {htmlArgs.action}",
                    }
                )

        except Exception as e:
            if 'htmlArgs' in locals():
                htmlArgs.returnData = json.dumps({
                    'success': False,
                    'error': str(e)
                })
            notify_error(f"Error in palette event handler: {str(e)}")


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
            cad_links = [
                link
                for link in block.get("links", [])
                if link.get("target") == "cad"
            ]

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
                                customProperties=component_info.get(
                                    "customProperties",
                                    {},
                                ),
                            )

                            # Generate thumbnail if needed
                            if "thumbnail" not in link:
                                link["thumbnail"] = (
                                    diagram_data.generate_component_thumbnail_placeholder(
                                        component_name=component_info.get(
                                            "name",
                                            "Component",
                                        )
                                    )
                                )

                            results["sync_successful"] += 1
                        else:
                            # Component not found - mark as missing
                            link = diagram_data.mark_component_as_missing(
                                link,
                                "Component not found in active Fusion 360 design",
                            )
                            results["sync_failed"] += 1

                    except Exception as e:
                        results["sync_failed"] += 1
                        results["errors"].append(
                            f"Failed to sync component: {str(e)}"
                        )

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
        notify_error(f"CAD selection failed: {str(e)}")


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
            execute_handler = CADSelectionExecuteHandler(
                self.block_id,
                self.block_name,
            )
            cmd.execute.add(execute_handler)
            _handlers.append(execute_handler)

        except Exception as e:
            notify_error(f"CAD selection setup failed: {str(e)}")


class CADSelectionExecuteHandler(adsk.core.CommandEventHandler):
    """Handle execution of CAD selection command."""

    def __init__(self, block_id, block_name):
        super().__init__()
        self.block_id = block_id
        self.block_name = block_name

    def _send_cad_link_payload(self, palette, payload):
        script = (
            "if(window.receiveCADLinkFromPython){"
            f"window.receiveCADLinkFromPython({json.dumps(payload)});"
            "}"
        )
        palette.sendInfoToHTML("cad-link", script)

    def notify(self, args):
        try:
            cmd = args.command
            inputs = cmd.commandInputs
            selection_input = inputs.itemById("cadSelection")

            if selection_input.selectionCount > 0:
                selected_occurrence = selection_input.selection(0).entity
                if selected_occurrence:
                    # Get occurrence data
                    doc_id = ''
                    doc_path = ''
                    if APP.activeDocument and APP.activeDocument.dataFile:
                        doc_id = APP.activeDocument.dataFile.id or ''
                        doc_path = APP.activeDocument.dataFile.path or ''

                    link_data = {
                        'success': True,
                        'occToken': selected_occurrence.entityToken,
                        'componentName': selected_occurrence.component.name,
                        'docId': doc_id,
                        'docPath': doc_path,
                        'blockId': self.block_id,
                        'blockName': self.block_name,
                    }

                    # Send data back to JavaScript
                    palette = UI.palettes.itemById('SystemBlocksPalette')
                    if palette:
                        self._send_cad_link_payload(palette, link_data)
                else:
                    palette = UI.palettes.itemById('SystemBlocksPalette')
                    if palette:
                        self._send_cad_link_payload(
                            palette,
                            {
                                'success': False,
                                'blockId': self.block_id,
                                'error': 'No component selected',
                            },
                        )
            else:
                palette = UI.palettes.itemById('SystemBlocksPalette')
                if palette:
                    self._send_cad_link_payload(
                        palette,
                        {
                            'success': False,
                            'blockId': self.block_id,
                            'error': 'No selection made',
                        },
                    )

        except Exception as e:
            palette = UI.palettes.itemById('SystemBlocksPalette')
            if palette:
                self._send_cad_link_payload(
                    palette,
                    {
                        'success': False,
                        'blockId': self.block_id,
                        'error': f'CAD selection failed: {str(e)}',
                    },
                )
            notify_error(f"CAD selection execution failed: {str(e)}")


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
        notify_error(f"Enhanced CAD selection error: {str(e)}")


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
            notify_error("No active Fusion 360 design found")
            return

        # For now, show a message that overlay mode is enabled
        # In the future, this would create actual 3D overlays in the viewport
        notify_info("3D overlay mode enabled for the current diagram.")

        # Initialize 3D visualization for all blocks
        if "blocks" in diagram:
            for block in diagram["blocks"]:
                diagram_data.initialize_3d_visualization(block)

    except Exception as e:
        notify_error(f"3D overlay enable error: {str(e)}")


def disable_3d_overlay_mode():
    """
    Disable 3D overlay mode in Fusion 360 viewport.
    """
    try:
        # Clear any 3D overlays
        notify_info("3D Overlay Mode Disabled")

    except Exception as e:
        notify_error(f"3D overlay disable error: {str(e)}")


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
        diagram_data_obj = load_diagram_data()
        if not diagram_data_obj:
            return

        # Find the block
        target_block = None
        for block in diagram_data_obj.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Find CAD links in the block
        cad_links = [
            link
            for link in target_block.get("links", [])
            if link.get("target") == "cad"
        ]

        highlighted_count = 0
        for link in cad_links:
            occ_token = link.get("occToken", "")
            if occ_token:
                # Find occurrence by token
                occurrence = find_occurrence_by_token(
                    design.rootComponent,
                    occ_token,
                )
                if occurrence:
                    # In a full implementation, this would change the appearance
                    # For now, we'll select the component to show it's highlighted
                    if highlighted_count == 0:
                        # Select first component to show highlighting
                        selection = APP.activeViewport.activeSelections
                        selection.clear()
                        selection.add(occurrence)
                    highlighted_count += 1

        if highlighted_count > 0:
            notify_success(
                "Highlighted "
                f"{highlighted_count} components for block: "
                f"{target_block.get('name', 'Unknown')}"
            )
        else:
            block_name = target_block.get("name", "Unknown")
            notify_warning(
                f"No CAD components found for block: {block_name}"
            )

    except Exception as e:
        notify_error(f"Component highlighting error: {str(e)}")


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
        notify_info(
            f"Creating 3D route from {from_block_id} to {to_block_id}"
        )

        # In a full implementation, this would:
        # 1. Find the 3D positions of components linked to both blocks
        # 2. Calculate optimal routing path
        # 3. Create 3D curve or sketch to visualize the connection
        # 4. Apply styling (color, thickness, animation)

    except Exception as e:
        notify_error(f"Connection route error: {str(e)}")


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

        notify_info(
            "Creating system group for "
            f"{len(block_ids)} blocks with color {group_color}"
        )

        # In a full implementation, this would:
        # 1. Find all components linked to the blocks
        # 2. Calculate a bounding volume around all components
        # 3. Create a visual boundary (wireframe box, colored region, etc.)
        # 4. Apply group color and styling

    except Exception as e:
        notify_error(f"System grouping error: {str(e)}")


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
        diagram_data_obj = load_diagram_data()
        if not diagram_data_obj:
            return

        # Find the block
        target_block = None
        for block in diagram_data_obj.get("blocks", []):
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
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
            "AAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
        )

        # Update block with live thumbnail
        updated_block = diagram_data.update_live_thumbnail(
            target_block,
            thumbnail_data,
        )

        # Save updated diagram
        for i, block in enumerate(diagram_data_obj.get("blocks", [])):
            if block.get("id") == block_id:
                diagram_data_obj["blocks"][i] = updated_block
                break

        save_diagram_json(json.dumps(diagram_data_obj))

        # Notify JavaScript that thumbnail was updated
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            script = (
                "if(editor) { "
                f"editor.onThumbnailUpdated('{block_id}', '{thumbnail_data}');"
                " }"
            )
            palette.sendInfoToHTML("thumbnail-updated", script)

    except Exception as e:
        notify_error(f"Live thumbnail error: {str(e)}")


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
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            sequence_payload = json.dumps(assembly_sequence)
            script = (
                "if(editor && editor.displayAssemblySequence) { "
                f"editor.displayAssemblySequence({sequence_payload});"
                " }"
            )
            palette.sendInfoToHTML("assembly-sequence", script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            error_message = f"Assembly sequence error: {str(e)}"
            safe_message = json.dumps(error_message)
            script = (
                "(function(){"
                "var getter = window.getSystemBlocksLogger;"
                "var logger = typeof getter === 'function' ? getter() : "
                "(window.SystemBlocksLogger || null);"
                f"var message = {safe_message};"
                "if (logger && typeof logger.error === 'function') {"
                "logger.error(message);"
                "return;"
                "}"
                "if (window.alert) { window.alert(message); }"
                "})();"
            )
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
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            bom_payload = json.dumps(living_bom)
            script = (
                "if(editor && editor.displayLivingBOM) { "
                f"editor.displayLivingBOM({bom_payload});"
                " }"
            )
            palette.sendInfoToHTML("living-bom", script)

    except Exception as e:
        # Send error response
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            error_message = f"Living BOM error: {str(e)}"
            safe_message = json.dumps(error_message)
            script = (
                "(function(){"
                "var getter = window.getSystemBlocksLogger;"
                "var logger = typeof getter === 'function' ? getter() : "
                "(window.SystemBlocksLogger || null);"
                f"var message = {safe_message};"
                "if (logger && typeof logger.error === 'function') {"
                "logger.error(message);"
                "return;"
                "}"
                "if (window.alert) { window.alert(message); }"
                "})();"
            )
            palette.sendInfoToHTML("bom-error", script)


def generate_service_manual_for_block(block_id, diagram):
    """
    Generate service manual for a specific block.

    Args:
        block_id: ID of the block
        diagram: The complete diagram data
    """
    try:
        from datetime import datetime
        
        # Find the block
        target_block = None
        for block in diagram.get("blocks", []):
            if block.get("id") == block_id:
                target_block = block
                break

        if not target_block:
            return

        # Initialize living documentation
        target_block = diagram_data.initialize_living_documentation(
            target_block
        )

        # Generate service manual content
        service_manual_doc = target_block["livingDocumentation"][
            "serviceManual"
        ]
        service_manual = {
            "blockName": target_block.get("name", "Unknown"),
            "blockId": block_id,
            "maintenanceInterval": service_manual_doc["maintenanceInterval"],
            "replacementParts": service_manual_doc["replacementParts"],
            "troubleshootingSteps": service_manual_doc["troubleshootingSteps"],
            "safetyNotes": service_manual_doc["safetyNotes"],
            "generatedAt": datetime.now().isoformat(),
        }

        # Send to JavaScript
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            payload = json.dumps(service_manual)
            script = (
                "if(editor) { "
                f"editor.displayServiceManual({payload});"
                " }"
            )
            palette.sendInfoToHTML("service-manual", script)

    except Exception as e:
        notify_error(f"Service manual error: {str(e)}")


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
        palette = UI.palettes.itemById("SystemBlocksPalette")
        if palette:
            impact_payload = json.dumps(impact_analysis)
            script = (
                "if(editor && editor.displayChangeImpact) { "
                f"editor.displayChangeImpact({impact_payload});"
                " }"
            )
            palette.sendInfoToHTML("change-impact", script)

    except Exception as e:
        notify_error(f"Change impact analysis error: {str(e)}")


def run(context):
    try:
        # Create command definition for showing palette
        cmdDef = UI.commandDefinitions.itemById(
            'SystemBlocksPaletteShowCommand'
        )
        if not cmdDef:
            cmdDef = UI.commandDefinitions.addButtonDefinition(
                'SystemBlocksPaletteShowCommand',
                'System Blocks',
                'Show the System Blocks Diagram Editor'
                # Removed the resource folder path - will use default icon
            )

        # Create the event handler
        onCommandCreated = SystemBlocksPaletteShowCommandHandler()
        cmdDef.commandCreated.add(onCommandCreated)
        _handlers.append(onCommandCreated)

        # Create the palette
        palette = UI.palettes.itemById('SystemBlocksPalette')
        if not palette:
            # Get the HTML file path and convert to proper file URL
            addin_path = os.path.dirname(__file__)
            html_file = os.path.join(addin_path, 'src', 'palette.html')

            # Convert Windows path to file URL format
            html_file = html_file.replace('\\', '/')
            if not html_file.startswith('file:///'):
                html_file = 'file:///' + html_file

            palette = UI.palettes.add(
                'SystemBlocksPalette',
                'System Blocks Diagram',
                html_file,
                True,  # isVisible
                True,  # showCloseButton
                True,  # isResizable
                300,   # width
                600,   # height
                True   # useNewWebBrowser
            )

            # Add HTML event handler
            onHTMLEvent = PaletteHTMLEventHandler()
            palette.incomingFromHTML.add(onHTMLEvent)
            _handlers.append(onHTMLEvent)

        # Add to appropriate workspace
        workspaces = UI.workspaces
        designWorkspace = workspaces.itemById('FusionSolidEnvironment')
        if designWorkspace:
            # Add to Add-ins panel
            addInsPanel = designWorkspace.toolbarPanels.itemById(
                'SolidScriptsAddinsPanel'
            )
            if not addInsPanel:
                addInsPanel = designWorkspace.toolbarPanels.add(
                    'SolidScriptsAddinsPanel', 'Add-Ins')

            # Add our command to the panel
            controls = addInsPanel.controls
            systemBlocksControl = controls.itemById(
                'SystemBlocksPaletteShowCommand'
            )
            if not systemBlocksControl:
                systemBlocksControl = controls.addCommand(cmdDef)

        notify_success('System Blocks add-in loaded successfully!')

    except Exception as e:
        notify_error(
            'Failed to run System Blocks add-in: '
            f"{str(e)}\n{traceback.format_exc()}"
        )


def stop(context):
    try:
        # Clean up UI elements
        cmdDef = UI.commandDefinitions.itemById(
            'SystemBlocksPaletteShowCommand'
        )
        if cmdDef:
            cmdDef.deleteMe()

        # Remove from workspace
        workspaces = UI.workspaces
        designWorkspace = workspaces.itemById('FusionSolidEnvironment')
        if designWorkspace:
            addInsPanel = designWorkspace.toolbarPanels.itemById(
                'SolidScriptsAddinsPanel'
            )
            if addInsPanel:
                systemBlocksControl = addInsPanel.controls.itemById(
                    'SystemBlocksPaletteShowCommand')
                if systemBlocksControl:
                    systemBlocksControl.deleteMe()

        # Remove palette
        palette = UI.palettes.itemById('SystemBlocksPalette')
        if palette:
            palette.deleteMe()

        # Clear handlers
        _handlers.clear()

    except Exception as e:
        notify_error(f'Failed to stop System Blocks add-in: {str(e)}')
