import adsk.core, adsk.fusion, traceback, pathlib

APP = adsk.core.Application.get()
UI = APP.userInterface
ATTR_GROUP = 'systemBlocks'

_handlers = []  # keep event handlers alive

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
