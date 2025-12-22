/**
 * MILESTONE 11 PHASE 3 - SOFTWARE/FIRMWARE BLOCKS
 * 
 * Comprehensive library of software and firmware components for system design.
 * Includes embedded firmware, control algorithms, communication protocols, and software modules.
 * 
 * Author: GitHub Copilot
 * Created: September 24, 2025
 * Phase: Milestone 11 - Advanced Block Types (Phase 3/4)
 */

class SoftwareBlockTypes {
  static blockTypes = {
    // ========== EMBEDDED FIRMWARE ==========
    'firmware-pid-controller': {
      name: 'PID Controller',
      category: 'software',
      subcategory: 'control',
      description: 'Real-time PID control algorithm for precise system regulation',
      icon: 'software-pid',
      color: '#8E44AD',
      specifications: {
        'Control Type': 'PID (Proportional-Integral-Derivative)',
        'Update Rate': '1kHz (1ms)',
        'Precision': '32-bit floating point',
        'Input Range': '±32768 counts',
        'Output Range': '±100% duty cycle',
        'Tuning Method': 'Auto-tune + manual',
        'Memory Usage': '2KB RAM, 4KB Flash'
      },
      interfaces: [
        { id: 'setpoint', name: 'Setpoint Input', kind: 'data', direction: 'input', protocol: 'analog', dataType: 'float32' },
        { id: 'feedback', name: 'Process Variable', kind: 'data', direction: 'input', protocol: 'analog', dataType: 'float32' },
        { id: 'output', name: 'Control Output', kind: 'data', direction: 'output', protocol: 'pwm', dataType: 'float32' },
        { id: 'config', name: 'Configuration', kind: 'data', direction: 'input', protocol: 'i2c', dataType: 'struct' },
        { id: 'status', name: 'Status Output', kind: 'data', direction: 'output', protocol: 'uart', dataType: 'json' }
      ],
      softwareProperties: {
        language: 'C/C++',
        platform: 'ARM Cortex-M',
        realTime: true,
        memoryFootprint: '6KB',
        cpuUsage: '< 5%'
      },
      algorithms: {
        proportional: 'Kp * error',
        integral: 'Ki * ∫error dt',
        derivative: 'Kd * d(error)/dt',
        antiWindup: 'Conditional integration'
      }
    },

    'firmware-state-machine': {
      name: 'State Machine',
      category: 'software',
      subcategory: 'control',
      description: 'Hierarchical finite state machine for complex system behavior control',
      icon: 'software-fsm',
      color: '#8E44AD',
      specifications: {
        'States': 'Up to 32 states',
        'Transitions': 'Up to 128 transitions',
        'Events': 'Up to 64 event types',
        'Hierarchy Levels': 'Up to 4 levels deep',
        'Execution Time': '< 10μs per cycle',
        'Memory Usage': '4KB RAM, 8KB Flash',
        'Debug Support': 'State logging + visualization'
      },
      interfaces: [
        { id: 'events', name: 'Event Input', kind: 'data', direction: 'input', protocol: 'event_queue', dataType: 'enum' },
        { id: 'state_output', name: 'Current State', kind: 'data', direction: 'output', protocol: 'digital', dataType: 'enum' },
        { id: 'actions', name: 'Action Output', kind: 'data', direction: 'output', protocol: 'function_call', dataType: 'pointer' },
        { id: 'config', name: 'State Configuration', kind: 'data', direction: 'input', protocol: 'flash', dataType: 'table' },
        { id: 'debug', name: 'Debug Interface', kind: 'data', direction: 'bidirectional', protocol: 'uart', dataType: 'text' }
      ],
      softwareProperties: {
        language: 'C/C++',
        platform: 'Any embedded',
        realTime: true,
        memoryFootprint: '12KB',
        cpuUsage: '< 2%'
      },
      algorithms: {
        stateTransition: 'Guard conditions + actions',
        eventHandling: 'Priority queue processing',
        hierarchicalEntry: 'Deep history support',
        parallelRegions: 'Concurrent state execution'
      }
    },

    'firmware-kalman-filter': {
      name: 'Kalman Filter',
      category: 'software',
      subcategory: 'estimation',
      description: 'Advanced sensor fusion and state estimation algorithm',
      icon: 'software-kalman',
      color: '#8E44AD',
      specifications: {
        'Filter Type': 'Extended Kalman Filter (EKF)',
        'State Variables': 'Up to 16 states',
        'Sensors': 'Up to 8 sensor inputs',
        'Update Rate': '100Hz - 1kHz',
        'Precision': '64-bit double precision',
        'Convergence Time': '< 1 second',
        'Memory Usage': '16KB RAM, 12KB Flash'
      },
      interfaces: [
        { id: 'sensor_inputs', name: 'Sensor Data', kind: 'data', direction: 'input', protocol: 'multi_sensor', dataType: 'array' },
        { id: 'state_estimate', name: 'State Output', kind: 'data', direction: 'output', protocol: 'analog', dataType: 'vector' },
        { id: 'covariance', name: 'Uncertainty', kind: 'data', direction: 'output', protocol: 'analog', dataType: 'matrix' },
        { id: 'model_params', name: 'Model Parameters', kind: 'data', direction: 'input', protocol: 'flash', dataType: 'struct' },
        { id: 'diagnostics', name: 'Filter Health', kind: 'data', direction: 'output', protocol: 'uart', dataType: 'json' }
      ],
      softwareProperties: {
        language: 'C++/MATLAB',
        platform: 'ARM Cortex-M4+',
        realTime: true,
        memoryFootprint: '28KB',
        cpuUsage: '< 15%'
      },
      algorithms: {
        prediction: 'F * x + B * u',
        update: 'K * (z - H * x)',
        kalmanGain: 'P * H^T * (H * P * H^T + R)^-1',
        covariance: '(I - K * H) * P'
      }
    },

    // ========== COMMUNICATION PROTOCOLS ==========
    'protocol-modbus': {
      name: 'Modbus Protocol',
      category: 'software',
      subcategory: 'communication',
      description: 'Industrial communication protocol for device networking',
      icon: 'software-protocol',
      color: '#3498DB',
      specifications: {
        'Protocol Variants': 'RTU, ASCII, TCP/IP',
        'Baud Rates': '9600 - 115200 bps',
        'Max Devices': '247 devices',
        'Address Space': '65536 registers',
        'Function Codes': '20+ standard functions',
        'Error Checking': 'CRC-16 (RTU), LRC (ASCII)',
        'Timeout': 'Configurable 100ms - 10s'
      },
      interfaces: [
        { id: 'serial_port', name: 'Serial Interface', kind: 'data', direction: 'bidirectional', protocol: 'uart', dataType: 'bytes' },
        { id: 'tcp_socket', name: 'TCP/IP Interface', kind: 'data', direction: 'bidirectional', protocol: 'ethernet', dataType: 'packets' },
        { id: 'register_map', name: 'Data Registers', kind: 'data', direction: 'bidirectional', protocol: 'memory', dataType: 'uint16' },
        { id: 'device_config', name: 'Device Configuration', kind: 'data', direction: 'input', protocol: 'flash', dataType: 'struct' },
        { id: 'status', name: 'Protocol Status', kind: 'data', direction: 'output', protocol: 'digital', dataType: 'enum' }
      ],
      softwareProperties: {
        language: 'C/C++',
        platform: 'Any with UART/Ethernet',
        realTime: false,
        memoryFootprint: '8KB',
        cpuUsage: '< 3%'
      },
      algorithms: {
        messageFraming: 'Start/end delimiters + CRC',
        errorHandling: 'Retry logic + timeout',
        addressResolution: 'Device ID mapping',
        dataMarshalling: 'Big-endian byte ordering'
      }
    },

    'protocol-can': {
      name: 'CAN Bus Protocol',
      category: 'software',
      subcategory: 'communication',
      description: 'Controller Area Network protocol for automotive and industrial systems',
      icon: 'software-can',
      color: '#3498DB',
      specifications: {
        'CAN Variants': 'CAN 2.0A/B, CAN-FD',
        'Bit Rates': '125kbps - 8Mbps',
        'Message Types': 'Standard (11-bit), Extended (29-bit)',
        'Payload': 'Up to 64 bytes (CAN-FD)',
        'Error Detection': '15-bit CRC + stuff bits',
        'Arbitration': 'CSMA/CD with priority',
        'Bus Length': 'Up to 1km @ 50kbps'
      },
      interfaces: [
        { id: 'can_transceiver', name: 'CAN Physical', kind: 'data', direction: 'bidirectional', protocol: 'can_phy', dataType: 'differential' },
        { id: 'message_queue', name: 'TX Message Queue', kind: 'data', direction: 'input', protocol: 'queue', dataType: 'can_frame' },
        { id: 'received_msgs', name: 'RX Messages', kind: 'data', direction: 'output', protocol: 'interrupt', dataType: 'can_frame' },
        { id: 'filters', name: 'Message Filters', kind: 'data', direction: 'input', protocol: 'register', dataType: 'filter_mask' },
        { id: 'bus_status', name: 'Bus Health', kind: 'data', direction: 'output', protocol: 'digital', dataType: 'enum' }
      ],
      softwareProperties: {
        language: 'C/C++',
        platform: 'MCU with CAN controller',
        realTime: true,
        memoryFootprint: '6KB',
        cpuUsage: '< 5%'
      },
      algorithms: {
        arbitration: 'Bit-wise bus arbitration',
        errorRecovery: 'Error passive/active states',
        messageFiltering: 'Hardware filter masks',
        timeStamping: 'High-resolution timestamps'
      }
    },

    'protocol-mqtt': {
      name: 'MQTT Protocol',
      category: 'software',
      subcategory: 'communication',
      description: 'Lightweight publish-subscribe messaging protocol for IoT',
      icon: 'software-mqtt',
      color: '#3498DB',
      specifications: {
        'MQTT Version': '3.1.1, 5.0',
        'QoS Levels': '0 (at most once), 1 (at least once), 2 (exactly once)',
        'Payload Size': 'Up to 256MB',
        'Topic Levels': 'Unlimited hierarchy',
        'Keep Alive': '1s - 65535s',
        'Clean Session': 'Configurable persistence',
        'Will Message': 'Last will testament'
      },
      interfaces: [
        { id: 'tcp_connection', name: 'TCP/TLS Socket', kind: 'data', direction: 'bidirectional', protocol: 'tcp', dataType: 'stream' },
        { id: 'publish', name: 'Publish Messages', kind: 'data', direction: 'input', protocol: 'queue', dataType: 'mqtt_message' },
        { id: 'subscribe', name: 'Received Messages', kind: 'data', direction: 'output', protocol: 'callback', dataType: 'mqtt_message' },
        { id: 'broker_config', name: 'Broker Settings', kind: 'data', direction: 'input', protocol: 'config', dataType: 'url_credentials' },
        { id: 'connection_status', name: 'Connection State', kind: 'data', direction: 'output', protocol: 'digital', dataType: 'boolean' }
      ],
      softwareProperties: {
        language: 'C/C++/Python',
        platform: 'Any with TCP/IP',
        realTime: false,
        memoryFootprint: '12KB',
        cpuUsage: '< 2%'
      },
      algorithms: {
        keepAlive: 'Periodic PINGREQ/PINGRESP',
        qosHandling: 'Message acknowledgment logic',
        topicMatching: 'Wildcard pattern matching',
        sessionManagement: 'Persistent session state'
      }
    },

    // ========== ALGORITHMS & PROCESSING ==========
    'algorithm-fft': {
      name: 'FFT Processor',
      category: 'software',
      subcategory: 'signal_processing',
      description: 'Fast Fourier Transform for frequency domain analysis',
      icon: 'software-fft',
      color: '#E67E22',
      specifications: {
        'Transform Size': '64 - 4096 points',
        'Precision': '32-bit float, 16-bit fixed',
        'Window Functions': 'Hanning, Hamming, Blackman',
        'Processing Time': '< 1ms for 1024-point',
        'Memory Usage': '8KB working buffer',
        'Input Rate': 'Up to 100kHz sampling',
        'Frequency Resolution': 'fs/N (configurable)'
      },
      interfaces: [
        { id: 'time_data', name: 'Time Domain Input', kind: 'data', direction: 'input', protocol: 'dma', dataType: 'float32_array' },
        { id: 'freq_magnitude', name: 'Magnitude Spectrum', kind: 'data', direction: 'output', protocol: 'dma', dataType: 'float32_array' },
        { id: 'freq_phase', name: 'Phase Spectrum', kind: 'data', direction: 'output', protocol: 'dma', dataType: 'float32_array' },
        { id: 'window_config', name: 'Window Parameters', kind: 'data', direction: 'input', protocol: 'register', dataType: 'enum' },
        { id: 'trigger', name: 'Processing Trigger', kind: 'data', direction: 'input', protocol: 'interrupt', dataType: 'edge' }
      ],
      softwareProperties: {
        language: 'C/C++ + Assembly',
        platform: 'ARM with DSP extensions',
        realTime: true,
        memoryFootprint: '16KB',
        cpuUsage: '< 20%'
      },
      algorithms: {
        fftCore: 'Radix-2 Cooley-Tukey',
        windowFunction: 'Configurable windowing',
        bitReversal: 'Optimized bit-reverse',
        complexMath: 'SIMD complex arithmetic'
      }
    },

    'algorithm-machine-learning': {
      name: 'ML Inference Engine',
      category: 'software',
      subcategory: 'ai_ml',
      description: 'Lightweight machine learning inference for embedded systems',
      icon: 'software-ml',
      color: '#E67E22',
      specifications: {
        'Model Types': 'Neural Networks, Decision Trees, SVM',
        'Framework Support': 'TensorFlow Lite, ONNX',
        'Input Dimensions': 'Up to 1000 features',
        'Model Size': 'Up to 2MB flash',
        'Inference Time': '< 10ms typical',
        'Quantization': '8-bit, 16-bit integer',
        'Acceleration': 'Hardware accelerator support'
      },
      interfaces: [
        { id: 'feature_input', name: 'Feature Vector', kind: 'data', direction: 'input', protocol: 'dma', dataType: 'float32_array' },
        { id: 'prediction', name: 'Model Output', kind: 'data', direction: 'output', protocol: 'register', dataType: 'float32_array' },
        { id: 'confidence', name: 'Confidence Score', kind: 'data', direction: 'output', protocol: 'analog', dataType: 'float32' },
        { id: 'model_data', name: 'Model Weights', kind: 'data', direction: 'input', protocol: 'flash', dataType: 'binary' },
        { id: 'inference_trigger', name: 'Inference Trigger', kind: 'data', direction: 'input', protocol: 'interrupt', dataType: 'edge' }
      ],
      softwareProperties: {
        language: 'C++/Python',
        platform: 'ARM Cortex-M7+ or specialized AI chips',
        realTime: false,
        memoryFootprint: '64KB',
        cpuUsage: '< 30%'
      },
      algorithms: {
        neuralNetwork: 'Forward propagation',
        quantization: 'INT8/INT16 optimization',
        memoryOptimization: 'Layer-wise processing',
        acceleratorInterface: 'Hardware acceleration API'
      }
    },

    // ========== SYSTEM SOFTWARE ==========
    'system-rtos': {
      name: 'Real-Time OS',
      category: 'software',
      subcategory: 'system',
      description: 'Real-time operating system for deterministic task scheduling',
      icon: 'software-rtos',
      color: '#27AE60',
      specifications: {
        'RTOS Type': 'Preemptive, priority-based',
        'Task Count': 'Up to 64 tasks',
        'Priority Levels': '32 priority levels',
        'Context Switch': '< 5μs on ARM Cortex-M',
        'Memory Protection': 'MPU support',
        'Inter-Task Communication': 'Queues, semaphores, mutexes',
        'Timing Precision': '1μs tick resolution'
      },
      interfaces: [
        { id: 'task_creation', name: 'Task Management', kind: 'data', direction: 'input', protocol: 'api_call', dataType: 'function_pointer' },
        { id: 'scheduler', name: 'Task Scheduler', kind: 'data', direction: 'bidirectional', protocol: 'kernel', dataType: 'task_control_block' },
        { id: 'ipc_primitives', name: 'IPC Objects', kind: 'data', direction: 'bidirectional', protocol: 'kernel', dataType: 'semaphore_queue' },
        { id: 'interrupt_service', name: 'ISR Interface', kind: 'data', direction: 'input', protocol: 'interrupt', dataType: 'vector_table' },
        { id: 'system_calls', name: 'System API', kind: 'data', direction: 'bidirectional', protocol: 'api', dataType: 'system_call' }
      ],
      softwareProperties: {
        language: 'C/Assembly',
        platform: 'ARM, RISC-V, x86',
        realTime: true,
        memoryFootprint: '32KB',
        cpuUsage: '< 5%'
      },
      algorithms: {
        scheduling: 'Priority-based preemptive',
        memoryManagement: 'Static/dynamic allocation',
        synchronization: 'Priority inheritance',
        timerManagement: 'High-resolution timers'
      }
    },

    'system-bootloader': {
      name: 'Secure Bootloader',
      category: 'software',
      subcategory: 'system',
      description: 'Secure boot and firmware update system with cryptographic verification',
      icon: 'software-boot',
      color: '#27AE60',
      specifications: {
        'Boot Time': '< 500ms cold boot',
        'Security': 'RSA-2048 + AES-256',
        'Update Methods': 'UART, CAN, Ethernet, USB',
        'Rollback Protection': 'Version anti-rollback',
        'Flash Wear Leveling': 'Automatic wear management',
        'Recovery Mode': 'Safe mode + diagnostics',
        'Code Size': '16KB flash footprint'
      },
      interfaces: [
        { id: 'flash_memory', name: 'Flash Interface', kind: 'data', direction: 'bidirectional', protocol: 'spi', dataType: 'flash_page' },
        { id: 'update_channel', name: 'Update Interface', kind: 'data', direction: 'input', protocol: 'multi_interface', dataType: 'firmware_image' },
        { id: 'crypto_engine', name: 'Crypto Hardware', kind: 'data', direction: 'bidirectional', protocol: 'hardware', dataType: 'crypto_operation' },
        { id: 'boot_status', name: 'Boot Status', kind: 'data', direction: 'output', protocol: 'digital', dataType: 'enum' },
        { id: 'application_entry', name: 'App Entry Point', kind: 'data', direction: 'output', protocol: 'jump', dataType: 'function_pointer' }
      ],
      softwareProperties: {
        language: 'C/Assembly',
        platform: 'Any embedded MCU',
        realTime: false,
        memoryFootprint: '24KB',
        cpuUsage: '100% during boot'
      },
      algorithms: {
        secureBootChain: 'Chain of trust verification',
        firmwareAuthentication: 'Digital signature verification',
        updateProtocol: 'Atomic update with rollback',
        errorRecovery: 'Automatic recovery mechanisms'
      }
    }
  };

  /**
   * Get all software block types
   */
  static getAll() {
    return this.blockTypes;
  }

  /**
   * Get specific software block type by ID
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
   * Get all control algorithms
   */
  static getControlAlgorithms() {
    return this.getBySubcategory('control');
  }

  /**
   * Get all communication protocols
   */
  static getCommunicationProtocols() {
    return this.getBySubcategory('communication');
  }

  /**
   * Get all signal processing algorithms
   */
  static getSignalProcessing() {
    return this.getBySubcategory('signal_processing');
  }

  /**
   * Get all system software
   */
  static getSystemSoftware() {
    return this.getBySubcategory('system');
  }

  /**
   * Search software blocks by platform
   */
  static searchByPlatform(platform) {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => {
        const platformSupport = type.softwareProperties?.platform;
        return platformSupport && platformSupport.toLowerCase().includes(platform.toLowerCase());
      })
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Search software blocks by programming language
   */
  static searchByLanguage(language) {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => {
        const langSupport = type.softwareProperties?.language;
        return langSupport && langSupport.toLowerCase().includes(language.toLowerCase());
      })
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Get real-time capable software blocks
   */
  static getRealTimeBlocks() {
    return Object.entries(this.blockTypes)
      .filter(([id, type]) => type.softwareProperties?.realTime === true)
      .reduce((acc, [id, type]) => ({ ...acc, [id]: type }), {});
  }

  /**
   * Get software interface compatibility matrix
   */
  static getCompatibilityMatrix() {
    const matrix = {};
    
    Object.entries(this.blockTypes).forEach(([id, type]) => {
      matrix[id] = {
        canConnectTo: [],
        dataOutputs: type.interfaces.filter(i => i.kind === 'data' && i.direction === 'output'),
        dataInputs: type.interfaces.filter(i => i.kind === 'data' && i.direction === 'input'),
        protocols: [...new Set(type.interfaces.map(i => i.protocol))]
      };
    });
    
    return matrix;
  }

  /**
   * Validate software connection between two blocks
   */
  static validateSoftwareConnection(sourceType, sourceInterface, targetType, targetInterface) {
    const source = this.getType(sourceType);
    const target = this.getType(targetType);
    
    if (!source || !target) return { valid: false, reason: 'Invalid block types' };
    
    const sourceIface = source.interfaces.find(i => i.id === sourceInterface);
    const targetIface = target.interfaces.find(i => i.id === targetInterface);
    
    if (!sourceIface || !targetIface) {
      return { valid: false, reason: 'Interface not found' };
    }
    
    // Check data interface compatibility
    if (sourceIface.kind !== 'data' || targetIface.kind !== 'data') {
      return { valid: false, reason: 'Not data interfaces' };
    }
    
    // Check direction compatibility
    if (sourceIface.direction === 'output' && targetIface.direction === 'input') {
      // Check protocol compatibility
      if (sourceIface.protocol === targetIface.protocol) {
        // Check data type compatibility
        if (sourceIface.dataType === targetIface.dataType || 
            this.isDataTypeCompatible(sourceIface.dataType, targetIface.dataType)) {
          return { valid: true, reason: 'Compatible software connection' };
        } else {
          return { valid: false, reason: `Incompatible data types: ${sourceIface.dataType} -> ${targetIface.dataType}` };
        }
      } else {
        return { valid: false, reason: `Incompatible protocols: ${sourceIface.protocol} -> ${targetIface.protocol}` };
      }
    }
    
    return { valid: false, reason: 'Incompatible interface directions' };
  }

  /**
   * Check data type compatibility for software interfaces
   */
  static isDataTypeCompatible(sourceType, targetType) {
    const compatibilityMap = {
      'float32': ['float64', 'analog'],
      'int16': ['int32', 'analog'],
      'boolean': ['digital', 'enum'],
      'array': ['vector', 'matrix'],
      'struct': ['json', 'binary']
    };
    
    return compatibilityMap[sourceType]?.includes(targetType) || false;
  }

  /**
   * Get resource requirements for software block
   */
  static getResourceRequirements(blockType) {
    const type = this.getType(blockType);
    if (!type?.softwareProperties) return null;
    
    return {
      memory: type.softwareProperties.memoryFootprint,
      cpu: type.softwareProperties.cpuUsage,
      realTime: type.softwareProperties.realTime,
      platform: type.softwareProperties.platform,
      language: type.softwareProperties.language
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SoftwareBlockTypes;
}