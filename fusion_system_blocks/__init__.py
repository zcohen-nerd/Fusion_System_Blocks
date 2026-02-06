"""
Fusion System Blocks - Advanced Engineering Diagram Tool for Autodesk Fusion 360

A comprehensive diagramming and documentation tool for engineering systems.
"""

__version__ = "1.0.0"
__author__ = "Zachary Cohen"
__description__ = "Advanced Engineering Diagram Tool for Autodesk Fusion 360"

# Package metadata
PACKAGE_NAME = "fusion_system_blocks"
PACKAGE_VERSION = __version__
PACKAGE_DESCRIPTION = __description__

# Import main components for easy access
try:
    __all__ = ['run', '__version__', '__author__', '__description__']
except ImportError:
    # During development, main might not be available yet
    __all__ = ['__version__', '__author__', '__description__']
