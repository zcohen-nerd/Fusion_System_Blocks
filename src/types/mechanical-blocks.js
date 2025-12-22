/**
 * MILESTONE 11 PHASE 2 - MECHANICAL SYSTEM BLOCKS
 * 
 * Comprehensive library of mechanical engineering components for system design.
 * Includes motors, actuators, sensors, structural elements, and mechanical interfaces.
 * 
 * Author: GitHub Copilot
 * Created: September 24, 2025
 * Phase: Milestone 11 - Advanced Block Types (Phase 2/4)
 */

class MechanicalBlockTypes {
  static blockTypes = {
    // ========== MOTORS & ACTUATORS ==========
    'motor-servo': {
      name: 'Servo Motor',
      category: 'mechanical',
      subcategory: 'actuators',
      description: 'Precision servo motor with position feedback for accurate angular control',
      icon: 'motor-servo',
      color: '#16A085',
      specifications: {
        'Torque': '20 kg⋅cm',
        'Speed': '60°/s at 6V',
        'Resolution': '0.1°',
        'Operating Voltage': '4.8-6V',
        'Control Signal': 'PWM (50Hz)',
        'Weight': '55g',
        'Dimensions': '40×20×38mm'
      },
      interfaces: [
        { id: 'power', name: 'Power (+)', kind: 'power', direction: 'input', voltage: '5V', current: '1.5A' },
        { id: 'ground', name: 'Ground (-)', kind: 'power', direction: 'input', voltage: '0V' },
        { id: 'control', name: 'Control Signal', kind: 'data', direction: 'input', protocol: 'PWM' },
        { id: 'feedback', name: 'Position Feedback', kind: 'data', direction: 'output', protocol: 'analog' },
        { id: 'shaft', name: 'Output Shaft', kind: 'mechanical', direction: 'output', type: 'rotational' }
      ],
      mechanicalProperties: {
        maxTorque: '20 kg⋅cm',
        maxSpeed: '60 rpm',
        backlash: '< 0.1°',
        operatingTemp: '-10°C to +60°C'
      }
    },

    'motor-stepper': {
      name: 'Stepper Motor',
      category: 'mechanical',
      subcategory: 'actuators',
      description: 'Bipolar stepper motor for precise positioning without feedback sensors',
      icon: 'motor-stepper',
      color: '#16A085',
      specifications: {
        'Steps per Revolution': '200 (1.8°/step)',
        'Holding Torque': '40 N⋅cm',
        'Rated Current': '1.7A per phase',
        'Rated Voltage': '12V',
        'Inductance': '8.5mH per phase',
        'Resistance': '1.4Ω per phase',
        'Weight': '280g'
      },
      interfaces: [
        { id: 'coil_a1', name: 'Coil A+', kind: 'power', direction: 'input', voltage: '12V' },
        { id: 'coil_a2', name: 'Coil A-', kind: 'power', direction: 'input', voltage: '12V' },
        { id: 'coil_b1', name: 'Coil B+', kind: 'power', direction: 'input', voltage: '12V' },
        { id: 'coil_b2', name: 'Coil B-', kind: 'power', direction: 'input', voltage: '12V' },
        { id: 'shaft', name: 'Output Shaft', kind: 'mechanical', direction: 'output', type: 'rotational' }
      ],
      mechanicalProperties: {
        stepAngle: '1.8°',
        holdingTorque: '40 N⋅cm',
        detentTorque: '2.2 N⋅cm',
        maxSpeed: '1000 steps/s'
      }
    },

    'actuator-linear': {
      name: 'Linear Actuator',
      category: 'mechanical',
      subcategory: 'actuators',
      description: 'Electric linear actuator for precise linear motion control',
      icon: 'actuator-linear',
      color: '#16A085',
      specifications: {
        'Stroke Length': '100mm',
        'Max Force': '200N',
        'Speed': '20mm/s at no load',
        'Positional Accuracy': '±0.1mm',
        'Operating Voltage': '12V DC',
        'Current Draw': '2A max',
        'Duty Cycle': '30% continuous'
      },
      interfaces: [
        { id: 'power_pos', name: 'Power (+)', kind: 'power', direction: 'input', voltage: '12V' },
        { id: 'power_neg', name: 'Power (-)', kind: 'power', direction: 'input', voltage: '0V' },
        { id: 'control', name: 'Position Control', kind: 'data', direction: 'input', protocol: 'analog' },
        { id: 'feedback', name: 'Position Feedback', kind: 'data', direction: 'output', protocol: 'analog' },
        { id: 'rod', name: 'Linear Rod', kind: 'mechanical', direction: 'output', type: 'linear' }
      ],
      mechanicalProperties: {
        maxForce: '200N',
        strokeLength: '100mm',
        speed: '20mm/s',
        accuracy: '±0.1mm'
      }
    },

    // ========== MECHANICAL SENSORS ==========
    'sensor-encoder': {
      name: 'Rotary Encoder',
      category: 'mechanical',
      subcategory: 'sensors',
      description: 'High-resolution rotary encoder for precise angular position measurement',
      icon: 'sensor-encoder',
      color: '#E67E22',
      specifications: {
        'Resolution': '1024 PPR',
        'Max RPM': '6000',
        'Operating Voltage': '5V DC',
        'Current Consumption': '40mA',
        'Output Type': 'Differential',
        'Accuracy': '±0.1°',
        'Operating Temperature': '-40°C to +85°C'
      },
      interfaces: [
        { id: 'vcc', name: 'Power (+5V)', kind: 'power', direction: 'input', voltage: '5V' },
        { id: 'gnd', name: 'Ground', kind: 'power', direction: 'input', voltage: '0V' },
        { id: 'channel_a', name: 'Channel A', kind: 'data', direction: 'output', protocol: 'digital' },
        { id: 'channel_b', name: 'Channel B', kind: 'data', direction: 'output', protocol: 'digital' },
        { id: 'index', name: 'Index Pulse', kind: 'data', direction: 'output', protocol: 'digital' },
        { id: 'shaft', name: 'Input Shaft', kind: 'mechanical', direction: 'input', type: 'rotational' }
      ],
      mechanicalProperties: {
        resolution: '1024 PPR',
        maxSpeed: '6000 RPM',
        startingTorque: '< 0.01 N⋅cm',
        momentOfInertia: '5×10⁻⁶ kg⋅m²'
      }
    },

    'sensor-load-cell': {
      name: 'Load Cell',
      category: 'mechanical',
      subcategory: 'sensors',
      description: 'Strain gauge load cell for precise force and weight measurements',
      icon: 'sensor-load',
      color: '#E67E22',
      specifications: {
        'Capacity': '100kg',
        'Accuracy': '±0.02% FS',
        'Nonlinearity': '±0.02% FS',
        'Hysteresis': '±0.02% FS',
        'Excitation Voltage': '5-12V DC',
        'Output': '2mV/V',
        'Material': 'Aluminum Alloy'
      },
      interfaces: [
        { id: 'excitation_pos', name: 'Excitation (+)', kind: 'power', direction: 'input', voltage: '10V' },
        { id: 'excitation_neg', name: 'Excitation (-)', kind: 'power', direction: 'input', voltage: '0V' },
        { id: 'signal_pos', name: 'Signal (+)', kind: 'data', direction: 'output', protocol: 'analog' },
        { id: 'signal_neg', name: 'Signal (-)', kind: 'data', direction: 'output', protocol: 'analog' },
        { id: 'mounting', name: 'Mounting Point', kind: 'mechanical', direction: 'input', type: 'force' }
      ],
      mechanicalProperties: {
        maxCapacity: '100kg',
        sensitivity: '2mV/V',
        accuracy: '±0.02%',
        operatingTemp: '-30°C to +70°C'
      }
    },

    'sensor-proximity': {
      name: 'Proximity Sensor',
      category: 'mechanical',
      subcategory: 'sensors',
      description: 'Inductive proximity sensor for non-contact metal object detection',
      icon: 'sensor-proximity',
      color: '#E67E22',
      specifications: {
        'Sensing Distance': '8mm',
        'Target Material': 'Ferrous metals',
        'Operating Voltage': '10-30V DC',
        'Current Consumption': '10mA',
        'Output Type': 'NPN/PNP',
        'Response Time': '< 1ms',
        'Housing': 'M18 threaded'
      },
      interfaces: [
        { id: 'power', name: 'Power (+)', kind: 'power', direction: 'input', voltage: '24V' },
        { id: 'ground', name: 'Ground (-)', kind: 'power', direction: 'input', voltage: '0V' },
        { id: 'output', name: 'Detection Output', kind: 'data', direction: 'output', protocol: 'digital' },
        { id: 'sensing_face', name: 'Sensing Face', kind: 'mechanical', direction: 'input', type: 'proximity' }
      ],
      mechanicalProperties: {
        sensingDistance: '8mm',
        responseTime: '< 1ms',
        housingMaterial: 'Stainless Steel',
        protectionRating: 'IP67'
      }
    },

    // ========== STRUCTURAL ELEMENTS ==========
    'structure-bearing': {
      name: 'Ball Bearing',
      category: 'mechanical',
      subcategory: 'structural',
      description: 'Precision ball bearing for low-friction rotational support',
      icon: 'bearing',
      color: '#7F8C8D',
      specifications: {
        'Inner Diameter': '10mm',
        'Outer Diameter': '30mm',
        'Width': '9mm',
        'Dynamic Load Rating': '5.07kN',
        'Static Load Rating': '2.36kN',
        'Limiting Speed': '19000 RPM',
        'Material': 'Chrome Steel'
      },
      interfaces: [
        { id: 'inner_race', name: 'Inner Race', kind: 'mechanical', direction: 'bidirectional', type: 'rotational' },
        { id: 'outer_race', name: 'Outer Race', kind: 'mechanical', direction: 'bidirectional', type: 'rotational' }
      ],
      mechanicalProperties: {
        dynamicLoad: '5.07kN',
        staticLoad: '2.36kN',
        maxSpeed: '19000 RPM',
        friction: '< 0.001'
      }
    },

    'structure-coupling': {
      name: 'Flexible Coupling',
      category: 'mechanical',
      subcategory: 'structural',
      description: 'Flexible shaft coupling for connecting rotating elements with misalignment tolerance',
      icon: 'coupling',
      color: '#7F8C8D',
      specifications: {
        'Bore Diameter': '6-10mm',
        'Max Torque': '5 N⋅m',
        'Max RPM': '10000',
        'Angular Misalignment': '±1°',
        'Parallel Misalignment': '±0.2mm',
        'Material': 'Aluminum + Polyurethane',
        'Length': '25mm'
      },
      interfaces: [
        { id: 'input_shaft', name: 'Input Shaft', kind: 'mechanical', direction: 'input', type: 'rotational' },
        { id: 'output_shaft', name: 'Output Shaft', kind: 'mechanical', direction: 'output', type: 'rotational' }
      ],
      mechanicalProperties: {
        maxTorque: '5 N⋅m',
        maxSpeed: '10000 RPM',
        angularMisalignment: '±1°',
        parallelMisalignment: '±0.2mm'
      }
    },

    'structure-gearbox': {
      name: 'Planetary Gearbox',
      category: 'mechanical',
      subcategory: 'structural',
      description: 'High-precision planetary gearbox for speed reduction and torque multiplication',
      icon: 'gearbox',
      color: '#7F8C8D',
      specifications: {
        'Gear Ratio': '10:1',
        'Max Input Speed': '3000 RPM',
        'Max Torque': '50 N⋅m',
        'Efficiency': '95%',
        'Backlash': '< 3 arcmin',
        'Housing Material': 'Aluminum',
        'Gear Material': 'Steel'
      },
      interfaces: [
        { id: 'input_shaft', name: 'Input Shaft', kind: 'mechanical', direction: 'input', type: 'rotational' },
        { id: 'output_shaft', name: 'Output Shaft', kind: 'mechanical', direction: 'output', type: 'rotational' },
        { id: 'housing_mount', name: 'Housing Mount', kind: 'mechanical', direction: 'bidirectional', type: 'structural' }
      ],
      mechanicalProperties: {
        gearRatio: '10:1',
        efficiency: '95%',
        maxTorque: '50 N⋅m',
        backlash: '< 3 arcmin'
      }
    }
  };

  /**
   * Get all mechanical block types
   */
  static getAll() {
    return this.blockTypes;
  }

  /**
   * Get specific mechanical block type by ID
   */
  static getType(typeId) {
    return this.blockTypes[typeId] || null;
  }

  /**
   * Get block types by category
   */
  static getByCategory(category) {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => type.category === category)
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Get block types by subcategory
   */
  static getBySubcategory(subcategory) {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => type.subcategory === subcategory)
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Get all mechanical actuators
   */
  static getActuators() {
    return this.getBySubcategory('actuators');
  }

  /**
   * Get all mechanical sensors
   */
  static getSensors() {
    return this.getBySubcategory('sensors');
  }

  /**
   * Get all structural elements
   */
  static getStructural() {
    return this.getBySubcategory('structural');
  }

  /**
   * Search mechanical blocks by specifications
   */
  static searchBySpec(specKey, specValue) {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => {
        const spec = type.specifications[specKey];
        return spec && spec.toLowerCase().includes(specValue.toLowerCase());
      })
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Get mechanical interface compatibility matrix
   */
  static getCompatibilityMatrix() {
    const matrix = {};
    
    Object.entries(this.blockTypes).forEach(([id, type]) => {
      matrix[id] = {
        canConnectTo: [],
        mechanicalOutputs: type.interfaces.filter(i => i.kind === 'mechanical' && i.direction === 'output'),
        mechanicalInputs: type.interfaces.filter(i => i.kind === 'mechanical' && i.direction === 'input')
      };
    });
    
    return matrix;
  }

  /**
   * Validate mechanical connection between two blocks
   */
  static validateMechanicalConnection(sourceType, sourceInterface, targetType, targetInterface) {
    const source = this.getType(sourceType);
    const target = this.getType(targetType);
    
    if (!source || !target) return { valid: false, reason: 'Invalid block types' };
    
    const sourceIface = source.interfaces.find(i => i.id === sourceInterface);
    const targetIface = target.interfaces.find(i => i.id === targetInterface);
    
    if (!sourceIface || !targetIface) {
      return { valid: false, reason: 'Interface not found' };
    }
    
    // Check mechanical compatibility
    if (sourceIface.kind !== 'mechanical' || targetIface.kind !== 'mechanical') {
      return { valid: false, reason: 'Not mechanical interfaces' };
    }
    
    // Check direction compatibility
    if (sourceIface.direction === 'output' && targetIface.direction === 'input') {
      // Check type compatibility
      if (sourceIface.type === targetIface.type) {
        return { valid: true, reason: 'Compatible mechanical connection' };
      } else {
        return { valid: false, reason: `Incompatible mechanical types: ${sourceIface.type} -> ${targetIface.type}` };
      }
    }
    
    return { valid: false, reason: 'Incompatible interface directions' };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MechanicalBlockTypes;
}