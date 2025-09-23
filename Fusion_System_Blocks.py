import adsk.core
import adsk.fusion
import traceback
import pathlib
import json
import sys
import os

# Add src directory to path so we can import our modules
src_path = os.path.join(os.path.dirname(__file__), 'src')
sys.path.insert(0, src_path)
import diagram_data

APP = adsk.core.Application.get()
UI = APP.userInterface
ATTR_GROUP = 'systemBlocks'

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
            UI.messageBox(f'Diagram validation failed: {error}')
            return False
            
        # Check link validation specifically
        links_valid, link_errors = diagram_data.validate_diagram_links(diagram)
        if not links_valid:
            error_msg = 'Link validation errors:\n' + '\n'.join(link_errors)
            UI.messageBox(error_msg)
            return False
        
        root_comp = get_root_component()
        if not root_comp:
            UI.messageBox('No active design found')
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
        UI.messageBox(f'Failed to save diagram: {str(e)}')
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
        UI.messageBox(f'Failed to load diagram: {str(e)}')
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
            cmdDef = UI.commandDefinitions.addButtonDefinition(
                'SelectOccurrenceCommand',
                'Select Component',
                'Select a component to link'
            )
            
        # Create and show selection dialog
        selection = UI.selectEntity('Select the component to link to this block', 'Occurrences')
        
        if selection:
            occurrence = adsk.fusion.Occurrence.cast(selection)
            if occurrence:
                return {
                    'type': 'CAD',
                    'occurrenceToken': occurrence.entityToken,
                    'name': occurrence.name,
                    'documentId': APP.activeDocument.dataFile.id if APP.activeDocument.dataFile else None
                }
                
        return None
        
    except Exception as e:
        UI.messageBox(f'Failed to select occurrence: {str(e)}')
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
            UI.messageBox(f'Error in command created handler: {str(e)}')


class CommandExecuteHandler(adsk.core.CommandEventHandler):
    def __init__(self):
        super().__init__()

    def notify(self, args):
        try:
            # Get the palette
            palette = UI.palettes.itemById('SystemBlocksPalette')
            if palette:
                palette.isVisible = True
            else:
                UI.messageBox('Error: Palette not found')
                
        except Exception as e:
            UI.messageBox(f'Error showing palette: {str(e)}')


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
                    htmlArgs.returnData = diagram_json
                else:
                    # Return empty diagram
                    empty_diagram = diagram_data.create_empty_diagram()
                    htmlArgs.returnData = json.dumps(empty_diagram)
                    
            elif htmlArgs.action == 'link_cad':
                link_data = select_occurrence_for_linking()
                htmlArgs.returnData = json.dumps(link_data) if link_data else '{}'
                
            elif htmlArgs.action == 'export_reports':
                diagram_json = data.get('diagram', '{}')
                diagram = json.loads(diagram_json)
                
                # Get the add-in directory for exports
                addin_path = os.path.dirname(__file__)
                exports_path = os.path.join(addin_path, 'exports')
                
                # Ensure exports directory exists
                os.makedirs(exports_path, exist_ok=True)
                
                # Export the reports
                files_created = diagram_data.export_report_files(diagram, exports_path)
                
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
                
            elif htmlArgs.action == 'import_data':
                import_type = data.get('type', '')
                import_content = data.get('content', '')
                
                try:
                    if import_type == 'mermaid':
                        new_diagram = diagram_data.parse_mermaid_to_diagram(import_content)
                    elif import_type == 'csv':
                        new_diagram = diagram_data.import_from_csv(import_content)
                    else:
                        raise ValueError(f"Unsupported import type: {import_type}")
                    
                    # Validate the imported diagram
                    is_valid, validation_errors = diagram_data.validate_imported_diagram(new_diagram)
                    
                    if is_valid:
                        htmlArgs.returnData = json.dumps({
                            'success': True,
                            'diagram': new_diagram,
                            'message': f'Successfully imported {len(new_diagram.get("blocks", []))} blocks'
                        })
                    else:
                        htmlArgs.returnData = json.dumps({
                            'success': False,
                            'errors': validation_errors,
                            'message': 'Import validation failed'
                        })
                        
                except Exception as e:
                    htmlArgs.returnData = json.dumps({
                        'success': False,
                        'message': f'Import failed: {str(e)}'
                    })
                
        except Exception as e:
            if 'htmlArgs' in locals():
                htmlArgs.returnData = json.dumps({
                    'success': False,
                    'error': str(e)
                })
            UI.messageBox(f'Error in palette event handler: {str(e)}')


def run(context):
    try:
        # Create command definition for showing palette
        cmdDef = UI.commandDefinitions.itemById('SystemBlocksPaletteShowCommand')
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
            # Get the HTML file path
            addin_path = os.path.dirname(__file__)
            html_file = os.path.join(addin_path, 'src', 'palette.html')
            
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
            addInsPanel = designWorkspace.toolbarPanels.itemById('SolidScriptsAddinsPanel')
            if not addInsPanel:
                addInsPanel = designWorkspace.toolbarPanels.add('SolidScriptsAddinsPanel', 'Add-Ins')
            
            # Add our command to the panel
            controls = addInsPanel.controls
            systemBlocksControl = controls.itemById('SystemBlocksPaletteShowCommand')
            if not systemBlocksControl:
                systemBlocksControl = controls.addCommand(cmdDef)

        UI.messageBox('System Blocks add-in loaded successfully!')

    except Exception as e:
        UI.messageBox(f'Failed to run System Blocks add-in: {str(e)}\n{traceback.format_exc()}')


def stop(context):
    try:
        # Clean up UI elements
        cmdDef = UI.commandDefinitions.itemById('SystemBlocksPaletteShowCommand')
        if cmdDef:
            cmdDef.deleteMe()

        # Remove from workspace
        workspaces = UI.workspaces
        designWorkspace = workspaces.itemById('FusionSolidEnvironment')
        if designWorkspace:
            addInsPanel = designWorkspace.toolbarPanels.itemById('SolidScriptsAddinsPanel')
            if addInsPanel:
                systemBlocksControl = addInsPanel.controls.itemById('SystemBlocksPaletteShowCommand')
                if systemBlocksControl:
                    systemBlocksControl.deleteMe()

        # Remove palette
        palette = UI.palettes.itemById('SystemBlocksPalette')
        if palette:
            palette.deleteMe()

        # Clear handlers
        _handlers.clear()

    except Exception as e:
        UI.messageBox(f'Failed to stop System Blocks add-in: {str(e)}')