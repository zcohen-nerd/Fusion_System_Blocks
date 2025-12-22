/**
 * MILESTONE 11 PHASE 4 - BLOCK TEMPLATES & ADVANCED FEATURES
 * 
 * Comprehensive block template system with pre-configured component combinations,
 * system presets, intelligent suggestions, and advanced creation features.
 * 
 * Author: GitHub Copilot
 * Created: September 24, 2025
 * Phase: Milestone 11 - Advanced Block Types (Phase 4/4)
 */

class BlockTemplateSystem {
  static templates = {
    // ========== ELECTRICAL SYSTEM TEMPLATES ==========
    'template-motor-controller': {
      name: 'Motor Control System',
      category: 'electrical',
      subcategory: 'control',
      description: 'Complete motor control system with driver, feedback, and power supply',
      icon: 'template-motor-control',
      color: '#E74C3C',
      components: [
        {
          type: 'microcontroller-arduino',
          position: { x: 0, y: 0 },
          role: 'controller',
          customName: 'Motor Controller'
        },
        {
          type: 'motor-servo',
          position: { x: 200, y: 0 },
          role: 'actuator',
          customName: 'Servo Motor'
        },
        {
          type: 'sensor-encoder',
          position: { x: 200, y: 100 },
          role: 'feedback',
          customName: 'Position Feedback'
        },
        {
          type: 'power-supply-switching',
          position: { x: -150, y: 0 },
          role: 'power',
          customName: 'Motor PSU'
        }
      ],
      connections: [
        {
          from: { component: 0, interface: 'digital_io_pwm' },
          to: { component: 1, interface: 'control' },
          type: 'control_signal'
        },
        {
          from: { component: 2, interface: 'channel_a' },
          to: { component: 0, interface: 'digital_io_interrupt' },
          type: 'feedback_signal'
        },
        {
          from: { component: 3, interface: 'output_pos' },
          to: { component: 1, interface: 'power' },
          type: 'power_connection'
        }
      ],
      specifications: {
        'System Type': 'Closed-loop servo control',
        'Control Bandwidth': '100Hz',
        'Position Accuracy': '±0.1°',
        'Power Consumption': '< 50W',
        'Response Time': '< 10ms'
      }
    },

    'template-sensor-array': {
      name: 'Multi-Sensor Array',
      category: 'electrical',
      subcategory: 'sensing',
      description: 'Comprehensive sensor array with temperature, pressure, and acceleration monitoring',
      icon: 'template-sensor-array',
      color: '#F39C12',
      components: [
        {
          type: 'microcontroller-esp32',
          position: { x: 0, y: 0 },
          role: 'controller',
          customName: 'Sensor Hub'
        },
        {
          type: 'sensor-temperature',
          position: { x: -100, y: -50 },
          role: 'sensor',
          customName: 'Temperature'
        },
        {
          type: 'sensor-accelerometer',
          position: { x: 100, y: -50 },
          role: 'sensor',
          customName: 'Accelerometer'
        },
        {
          type: 'sensor-load-cell',
          position: { x: 0, y: -100 },
          role: 'sensor',
          customName: 'Force Sensor'
        },
        {
          type: 'comm-wifi',
          position: { x: 0, y: 80 },
          role: 'communication',
          customName: 'WiFi Module'
        }
      ],
      connections: [
        {
          from: { component: 1, interface: 'data_output' },
          to: { component: 0, interface: 'i2c_sda' },
          type: 'i2c_connection'
        },
        {
          from: { component: 2, interface: 'data_output' },
          to: { component: 0, interface: 'spi_miso' },
          type: 'spi_connection'
        },
        {
          from: { component: 3, interface: 'signal_pos' },
          to: { component: 0, interface: 'adc_input' },
          type: 'analog_connection'
        }
      ],
      specifications: {
        'Sensor Count': '3 sensors',
        'Sampling Rate': '1kHz combined',
        'Data Format': 'JSON over WiFi',
        'Update Rate': '10Hz to cloud',
        'Power Consumption': '< 5W'
      }
    },

    // ========== MECHANICAL SYSTEM TEMPLATES ==========
    'template-linear-actuator-system': {
      name: 'Linear Motion System',
      category: 'mechanical',
      subcategory: 'motion',
      description: 'Precision linear motion system with stepper motor, gearbox, and feedback',
      icon: 'template-linear-motion',
      color: '#16A085',
      components: [
        {
          type: 'motor-stepper',
          position: { x: -100, y: 0 },
          role: 'actuator',
          customName: 'Stepper Motor'
        },
        {
          type: 'structure-gearbox',
          position: { x: 0, y: 0 },
          role: 'transmission',
          customName: 'Reduction Gearbox'
        },
        {
          type: 'actuator-linear',
          position: { x: 100, y: 0 },
          role: 'actuator',
          customName: 'Linear Actuator'
        },
        {
          type: 'sensor-encoder',
          position: { x: 0, y: -80 },
          role: 'feedback',
          customName: 'Position Encoder'
        },
        {
          type: 'structure-bearing',
          position: { x: 0, y: 80 },
          role: 'support',
          customName: 'Support Bearing'
        }
      ],
      connections: [
        {
          from: { component: 0, interface: 'shaft' },
          to: { component: 1, interface: 'input_shaft' },
          type: 'mechanical_rotational'
        },
        {
          from: { component: 1, interface: 'output_shaft' },
          to: { component: 2, interface: 'rod' },
          type: 'mechanical_linear'
        },
        {
          from: { component: 1, interface: 'output_shaft' },
          to: { component: 3, interface: 'shaft' },
          type: 'mechanical_rotational'
        }
      ],
      specifications: {
        'Stroke Length': '200mm',
        'Force Output': '500N',
        'Positioning Accuracy': '±0.05mm',
        'Max Speed': '50mm/s',
        'Gear Ratio': '10:1'
      }
    },

    'template-robotic-joint': {
      name: 'Robotic Joint System',
      category: 'mechanical',
      subcategory: 'robotics',
      description: 'Complete robotic joint with servo motor, encoder, and flexible coupling',
      icon: 'template-robotic-joint',
      color: '#16A085',
      components: [
        {
          type: 'motor-servo',
          position: { x: -80, y: 0 },
          role: 'actuator',
          customName: 'Joint Motor'
        },
        {
          type: 'structure-coupling',
          position: { x: 0, y: 0 },
          role: 'coupling',
          customName: 'Flexible Coupling'
        },
        {
          type: 'sensor-encoder',
          position: { x: 80, y: 0 },
          role: 'feedback',
          customName: 'Joint Encoder'
        },
        {
          type: 'structure-bearing',
          position: { x: 0, y: -60 },
          role: 'support',
          customName: 'Joint Bearing'
        },
        {
          type: 'structure-bearing',
          position: { x: 0, y: 60 },
          role: 'support',
          customName: 'Output Bearing'
        }
      ],
      connections: [
        {
          from: { component: 0, interface: 'shaft' },
          to: { component: 1, interface: 'input_shaft' },
          type: 'mechanical_rotational'
        },
        {
          from: { component: 1, interface: 'output_shaft' },
          to: { component: 2, interface: 'shaft' },
          type: 'mechanical_rotational'
        }
      ],
      specifications: {
        'Joint Range': '±180°',
        'Torque Output': '20 kg⋅cm',
        'Angular Accuracy': '±0.1°',
        'Max Angular Velocity': '180°/s',
        'Misalignment Tolerance': '±1°'
      }
    },

    // ========== SOFTWARE SYSTEM TEMPLATES ==========
    'template-control-loop': {
      name: 'Control Loop System',
      category: 'software',
      subcategory: 'control',
      description: 'Complete feedback control loop with PID controller, state machine, and Kalman filter',
      icon: 'template-control-loop',
      color: '#8E44AD',
      components: [
        {
          type: 'firmware-pid-controller',
          position: { x: 0, y: 0 },
          role: 'controller',
          customName: 'PID Controller'
        },
        {
          type: 'firmware-state-machine',
          position: { x: -120, y: 0 },
          role: 'supervisor',
          customName: 'Control FSM'
        },
        {
          type: 'firmware-kalman-filter',
          position: { x: 120, y: 0 },
          role: 'estimator',
          customName: 'State Estimator'
        },
        {
          type: 'system-rtos',
          position: { x: 0, y: -80 },
          role: 'os',
          customName: 'Real-Time OS'
        }
      ],
      connections: [
        {
          from: { component: 1, interface: 'state_output' },
          to: { component: 0, interface: 'setpoint' },
          type: 'data_connection'
        },
        {
          from: { component: 2, interface: 'state_estimate' },
          to: { component: 0, interface: 'feedback' },
          type: 'data_connection'
        }
      ],
      specifications: {
        'Control Type': 'Model-based PID',
        'State Variables': '6 states',
        'Control Frequency': '1kHz',
        'Estimation Bandwidth': '100Hz',
        'CPU Usage': '< 20%'
      }
    },

    'template-iot-gateway': {
      name: 'IoT Gateway System',
      category: 'software',
      subcategory: 'communication',
      description: 'Complete IoT gateway with multiple protocol support and cloud connectivity',
      icon: 'template-iot-gateway',
      color: '#3498DB',
      components: [
        {
          type: 'protocol-modbus',
          position: { x: -100, y: -50 },
          role: 'fieldbus',
          customName: 'Modbus RTU'
        },
        {
          type: 'protocol-can',
          position: { x: -100, y: 50 },
          role: 'fieldbus',
          customName: 'CAN Bus'
        },
        {
          type: 'protocol-mqtt',
          position: { x: 100, y: 0 },
          role: 'cloud',
          customName: 'MQTT Client'
        },
        {
          type: 'system-rtos',
          position: { x: 0, y: 0 },
          role: 'os',
          customName: 'Gateway OS'
        }
      ],
      connections: [
        {
          from: { component: 0, interface: 'register_map' },
          to: { component: 3, interface: 'ipc_primitives' },
          type: 'data_connection'
        },
        {
          from: { component: 1, interface: 'received_msgs' },
          to: { component: 3, interface: 'ipc_primitives' },
          type: 'data_connection'
        },
        {
          from: { component: 3, interface: 'ipc_primitives' },
          to: { component: 2, interface: 'publish' },
          type: 'data_connection'
        }
      ],
      specifications: {
        'Protocol Support': 'Modbus RTU/TCP, CAN, MQTT',
        'Device Capacity': '100+ field devices',
        'Cloud Update Rate': '1Hz',
        'Data Throughput': '10MB/hour',
        'Reliability': '99.9% uptime'
      }
    },

    // ========== INTEGRATED SYSTEM TEMPLATES ==========
    'template-smart-actuator': {
      name: 'Smart Actuator System',
      category: 'integrated',
      subcategory: 'smart_system',
      description: 'Intelligent actuator combining electrical, mechanical, and software components',
      icon: 'template-smart-actuator',
      color: '#E67E22',
      components: [
        // Electrical
        {
          type: 'microcontroller-esp32',
          position: { x: 0, y: -100 },
          role: 'controller',
          customName: 'Smart Controller'
        },
        {
          type: 'power-supply-switching',
          position: { x: -150, y: -100 },
          role: 'power',
          customName: 'System PSU'
        },
        // Mechanical
        {
          type: 'motor-servo',
          position: { x: 0, y: 0 },
          role: 'actuator',
          customName: 'Servo Motor'
        },
        {
          type: 'sensor-encoder',
          position: { x: 100, y: 0 },
          role: 'feedback',
          customName: 'Position Sensor'
        },
        {
          type: 'structure-gearbox',
          position: { x: 0, y: 100 },
          role: 'transmission',
          customName: 'Gear Reduction'
        },
        // Software
        {
          type: 'firmware-pid-controller',
          position: { x: -100, y: 0 },
          role: 'control',
          customName: 'Position Control'
        },
        {
          type: 'protocol-modbus',
          position: { x: 150, y: -100 },
          role: 'communication',
          customName: 'Modbus Interface'
        }
      ],
      connections: [
        // Power connections
        {
          from: { component: 1, interface: 'output_pos' },
          to: { component: 0, interface: 'power_5v' },
          type: 'power_connection'
        },
        {
          from: { component: 1, interface: 'output_pos' },
          to: { component: 2, interface: 'power' },
          type: 'power_connection'
        },
        // Control connections
        {
          from: { component: 5, interface: 'output' },
          to: { component: 2, interface: 'control' },
          type: 'control_signal'
        },
        {
          from: { component: 3, interface: 'channel_a' },
          to: { component: 5, interface: 'feedback' },
          type: 'feedback_signal'
        },
        // Mechanical connections
        {
          from: { component: 2, interface: 'shaft' },
          to: { component: 4, interface: 'input_shaft' },
          type: 'mechanical_rotational'
        },
        {
          from: { component: 4, interface: 'output_shaft' },
          to: { component: 3, interface: 'shaft' },
          type: 'mechanical_rotational'
        },
        // Communication
        {
          from: { component: 6, interface: 'register_map' },
          to: { component: 5, interface: 'config' },
          type: 'data_connection'
        }
      ],
      specifications: {
        'System Type': 'Smart actuator with fieldbus',
        'Position Accuracy': '±0.05°',
        'Response Time': '< 5ms',
        'Communication': 'Modbus RTU/TCP',
        'Power Consumption': '< 25W',
        'Gear Ratio': '10:1',
        'Max Torque': '200 kg⋅cm'
      }
    }
  };

  static systemPresets = {
    'preset-industrial-automation': {
      name: 'Industrial Automation Line',
      description: 'Complete factory automation system with multiple actuators and sensors',
      templates: ['template-motor-controller', 'template-sensor-array', 'template-iot-gateway'],
      layout: 'distributed',
      specifications: {
        'Actuators': '4x servo motors',
        'Sensors': '12x various sensors',
        'Communication': 'Industrial Ethernet + Modbus',
        'Control System': 'Distributed PLC network'
      }
    },
    'preset-robotics-cell': {
      name: 'Robotic Manufacturing Cell',
      description: 'Multi-axis robotic system with vision and force feedback',
      templates: ['template-robotic-joint', 'template-smart-actuator', 'template-control-loop'],
      layout: 'hierarchical',
      specifications: {
        'Degrees of Freedom': '6-axis robot',
        'Payload': '10kg',
        'Repeatability': '±0.02mm',
        'Control System': 'Real-time motion control'
      }
    }
  };

  /**
   * Get all available templates
   */
  static getAllTemplates() {
    return this.templates;
  }

  /**
   * Get template by ID
   */
  static getTemplate(templateId) {
    return this.templates[templateId] || null;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category) {
    return Object.entries(this.templates)
      .filter(([id, template]) => template.category === category)
      .reduce((acc, [id, template]) => ({ ...acc, [id]: template }), {});
  }

  /**
   * Get all system presets
   */
  static getAllPresets() {
    return this.systemPresets;
  }

  /**
   * Create blocks from template
   */
  static createFromTemplate(templateId, basePosition = { x: 0, y: 0 }) {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    const createdBlocks = [];
    const connections = [];

    // Create blocks
    template.components.forEach((component, index) => {
      const block = {
        id: `${templateId}_${index}_${Date.now()}`,
        name: component.customName || `Component ${index}`,
        type: component.type,
        category: template.category,
        x: basePosition.x + component.position.x,
        y: basePosition.y + component.position.y,
        status: 'Planned',
        role: component.role,
        templateId: templateId,
        templateIndex: index,
        attributes: {
          fromTemplate: true,
          templateName: template.name,
          systemRole: component.role
        }
      };
      createdBlocks.push(block);
    });

    // Create connections
    template.connections.forEach(conn => {
      const sourceBlock = createdBlocks[conn.from.component];
      const targetBlock = createdBlocks[conn.to.component];
      
      connections.push({
        id: `conn_${sourceBlock.id}_${targetBlock.id}`,
        source: sourceBlock.id,
        target: targetBlock.id,
        sourceInterface: conn.from.interface,
        targetInterface: conn.to.interface,
        type: conn.type,
        fromTemplate: true
      });
    });

    return {
      blocks: createdBlocks,
      connections: connections,
      template: template
    };
  }

  /**
   * Suggest compatible templates based on existing blocks
   */
  static suggestCompatibleTemplates(existingBlocks) {
    const suggestions = [];
    const blockTypes = existingBlocks.map(block => block.type);

    Object.entries(this.templates).forEach(([id, template]) => {
      let compatibility = 0;
      let complementary = 0;

      template.components.forEach(component => {
        if (blockTypes.includes(component.type)) {
          compatibility++;
        } else {
          // Check if this component would complement existing blocks
          if (this.isComplementaryComponent(component.type, blockTypes)) {
            complementary++;
          }
        }
      });

      if (complementary > 0 || compatibility > 0) {
        suggestions.push({
          templateId: id,
          template: template,
          compatibilityScore: compatibility,
          complementaryScore: complementary,
          totalScore: compatibility + complementary * 0.5
        });
      }
    });

    return suggestions
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);
  }

  /**
   * Check if a component type is complementary to existing block types
   */
  static isComplementaryComponent(componentType, existingTypes) {
    const complementaryMap = {
      'microcontroller-arduino': ['motor-servo', 'sensor-temperature', 'sensor-accelerometer'],
      'power-supply-switching': ['motor-servo', 'microcontroller-esp32'],
      'sensor-encoder': ['motor-servo', 'motor-stepper'],
      'firmware-pid-controller': ['motor-servo', 'sensor-encoder'],
      'protocol-modbus': ['microcontroller-arduino', 'sensor-array']
    };

    const complements = complementaryMap[componentType] || [];
    return complements.some(complement => existingTypes.includes(complement));
  }

  /**
   * Generate template variations
   */
  static generateTemplateVariations(baseTemplateId, variations = {}) {
    const baseTemplate = this.getTemplate(baseTemplateId);
    if (!baseTemplate) return null;

    const modifiedTemplate = JSON.parse(JSON.stringify(baseTemplate));
    
    // Apply variations
    if (variations.scale) {
      modifiedTemplate.components.forEach(component => {
        component.position.x *= variations.scale;
        component.position.y *= variations.scale;
      });
    }

    if (variations.substituteComponents) {
      Object.entries(variations.substituteComponents).forEach(([oldType, newType]) => {
        modifiedTemplate.components.forEach(component => {
          if (component.type === oldType) {
            component.type = newType;
          }
        });
      });
    }

    return modifiedTemplate;
  }

  /**
   * Validate template integrity
   */
  static validateTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) return { valid: false, errors: ['Template not found'] };

    const errors = [];
    const warnings = [];

    // Check component references
    template.connections.forEach((conn, index) => {
      if (conn.from.component >= template.components.length) {
        errors.push(`Connection ${index}: Invalid source component index`);
      }
      if (conn.to.component >= template.components.length) {
        errors.push(`Connection ${index}: Invalid target component index`);
      }
    });

    // Check for isolated components
    const connectedComponents = new Set();
    template.connections.forEach(conn => {
      connectedComponents.add(conn.from.component);
      connectedComponents.add(conn.to.component);
    });

    template.components.forEach((component, index) => {
      if (!connectedComponents.has(index)) {
        warnings.push(`Component ${index} (${component.type}) is not connected`);
      }
    });

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Export template to JSON
   */
  static exportTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) return null;

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      template: template
    };
  }

  /**
   * Import template from JSON
   */
  static importTemplate(templateData, templateId) {
    try {
      const template = typeof templateData === 'string' ? 
        JSON.parse(templateData) : templateData;
      
      if (template.template) {
        this.templates[templateId] = template.template;
        return { success: true, templateId: templateId };
      } else {
        return { success: false, error: 'Invalid template format' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlockTemplateSystem;
}