import adsk.core
import adsk.fusion
import traceback
import pathlib
import json

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
        root_comp = get_root_component()
        if not root_comp:
            UI.messageBox('No active design found')
            return False

        # Remove existing attribute if it exists
        existing_attr = root_comp.attributes.itemByName(ATTR_GROUP, 'diagramJson')
        if existing_attr:
            existing_attr.deleteMe()

        # Add new attribute
        root_comp.attributes.add(ATTR_GROUP, 'diagramJson', json_data)
        UI.messageBox('Diagram saved successfully')
        return True
    except Exception as e:
        UI.messageBox(f'Save failed: {str(e)}')
        return False


def load_diagram_json():
    """Load diagram JSON from Fusion attributes."""
    try:
        root_comp = get_root_component()
        if not root_comp:
            UI.messageBox('No active design found')
            return None

        attr = root_comp.attributes.itemByName(ATTR_GROUP, 'diagramJson')
        if attr:
            return attr.value
        else:
            UI.messageBox('No saved diagram found')
            return None
    except Exception as e:
        UI.messageBox(f'Load failed: {str(e)}')
        return None


def start_cad_selection(block_id, block_name):
    """Start CAD component selection for linking to a block."""
    try:
        # Create a selection command
        selection_cmd = UI.commandDefinitions.itemById('selectCADForBlock')
        if not selection_cmd:
            selection_cmd = UI.commandDefinitions.addButtonDefinition(
                'selectCADForBlock',
                f'Select CAD for "{block_name}"',
                f'Select a Fusion occurrence to link to block "{block_name}"'
            )
        
        # Set up command handler
        handler = CADSelectionHandler(block_id, block_name)
        selection_cmd.commandCreated.add(handler)
        _handlers.append(handler)
        
        # Execute the command
        selection_cmd.execute()
        
    except Exception as e:
        UI.messageBox(f'CAD selection failed: {str(e)}')


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
                'cadSelection', 
                'Select CAD Component',
                f'Select a component or occurrence to link to "{self.block_name}"'
            )
            selection_input.addSelectionFilter('Occurrences')
            selection_input.setSelectionLimits(1, 1)
            
            # Set up event handlers
            execute_handler = CADSelectionExecuteHandler(self.block_id)
            cmd.execute.add(execute_handler)
            _handlers.append(execute_handler)
            
        except Exception as e:
            UI.messageBox(f'CAD selection setup failed: {str(e)}')


class CADSelectionExecuteHandler(adsk.core.CommandEventHandler):
    """Handle execution of CAD selection command."""
    
    def __init__(self, block_id):
        super().__init__()
        self.block_id = block_id
    
    def notify(self, args):
        try:
            cmd = args.command
            inputs = cmd.commandInputs
            selection_input = inputs.itemById('cadSelection')
            
            if selection_input.selectionCount > 0:
                selected_entity = selection_input.selection(0).entity
                
                if hasattr(selected_entity, 'entityToken'):
                    occ_token = selected_entity.entityToken
                    design = adsk.fusion.Design.cast(APP.activeProduct)
                    doc_id = design.parentDocument.name if design and design.parentDocument else ""
                    
                    # Send CAD link data back to palette
                    palette = UI.palettes.itemById('sysBlocksPalette')
                    if palette:
                        script = f"receiveCADLinkFromPython('{self.block_id}', '{occ_token}', '{doc_id}', '');"
                        palette.sendInfoToHTML('cad-link-response', script)
                    
                    UI.messageBox(f'CAD component linked successfully')
                else:
                    UI.messageBox('Selected entity does not have a valid token')
            else:
                UI.messageBox('No component selected')
                
        except Exception as e:
            UI.messageBox(f'CAD selection execution failed: {str(e)}')


class PaletteMessageHandler(adsk.core.HTMLEventHandler):
    """Handle messages from the palette."""

    def notify(self, args):
        try:
            htmlArgs = adsk.core.HTMLEventArgs.cast(args)
            data = json.loads(htmlArgs.data)
            action = data.get('action', '')
            payload = data.get('data', '')

            if action == 'save-diagram':
                save_diagram_json(payload)
            elif action == 'load-diagram':
                json_data = load_diagram_json()
                if json_data:
                    # Send data back to palette
                    palette = UI.palettes.itemById('sysBlocksPalette')
                    if palette:
                        script = f"loadDiagramFromPython({json.dumps(json_data)});"
                        palette.sendInfoToHTML('load-response', script)
            elif action == 'link-to-cad':
                block_id = payload.get('blockId', '')
                block_name = payload.get('blockName', '')
                start_cad_selection(block_id, block_name)
        except Exception as e:
            UI.messageBox(f'Message handler error: {str(e)}')


class CommandCreatedHandler(adsk.core.CommandCreatedEventHandler):
    def notify(self, args):
        try:
            pal = UI.palettes.itemById('sysBlocksPalette')
            if not pal:
                palette_path = pathlib.Path(__file__).with_name('palette.html').as_uri()
                pal = UI.palettes.add(
                    'sysBlocksPalette',
                    'System Blocks',
                    palette_path,
                    True, True, True, 600, 800
                )

                # Set up message handler
                msg_handler = PaletteMessageHandler()
                pal.incomingFromHTML.add(msg_handler)
                _handlers.append(msg_handler)

            pal.isVisible = True
        except Exception:
            UI.messageBox('Palette open failed:\n{}'.format(traceback.format_exc()))

def run(context):
    try:
        cmd_def = UI.commandDefinitions.itemById('sysBlocksOpen')
        if not cmd_def:
            cmd_def = UI.commandDefinitions.addButtonDefinition(
                'sysBlocksOpen',
                'System Blocks',
                'Open the System Blocks diagram palette'
            )
        handler = CommandCreatedHandler()
        cmd_def.commandCreated.add(handler)
        _handlers.append(handler)

        ws = UI.workspaces.itemById('FusionSolidEnvironment')
        panel = ws.toolbarPanels.itemById('SolidScriptsAddinsPanel')
        if not panel.controls.itemById('sysBlocksOpen'):
            panel.controls.addCommand(cmd_def)
    except Exception:
        UI.messageBox('Add-in start failed:\n{}'.format(traceback.format_exc()))

def stop(context):
    try:
        pal = UI.palettes.itemById('sysBlocksPalette')
        if pal:
            pal.deleteMe()
        ctrl = None
        ws = UI.workspaces.itemById('FusionSolidEnvironment')
        panel = ws.toolbarPanels.itemById('SolidScriptsAddinsPanel')
        if panel:
            ctrl = panel.controls.itemById('sysBlocksOpen')
        if ctrl:
            ctrl.deleteMe()
        cmd_def = UI.commandDefinitions.itemById('sysBlocksOpen')
        if cmd_def:
            cmd_def.deleteMe()
    except Exception:
        UI.messageBox('Add-in stop failed:\n{}'.format(traceback.format_exc()))
