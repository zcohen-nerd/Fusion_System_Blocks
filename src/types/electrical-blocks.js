/* Fusion System Blocks - Advanced Block Types
 * Milestone 11 - Phase 1: Electrical/Electronic Blocks
 * 
 * This file extends the block system with specialized electrical/electronic
 * components including microcontrollers, power supplies, sensors, and 
 * communication modules with professional engineering specifications.
 */

/* ========== ELECTRICAL/ELECTRONIC BLOCK TYPE DEFINITIONS ========== */

// Advanced Block Type Registry
class ElectricalBlockTypes {
  static types = {
    // Microcontrollers
    'microcontroller-arduino': {
      name: 'Arduino Uno R3',
      category: 'microcontroller',
      description: 'Arduino Uno R3 microcontroller board',
      specifications: {
        processor: 'ATMega328P',
        clockSpeed: '16 MHz',
        digitalPins: 14,
        analogPins: 6,
        voltage: '5V',
        current: '50mA per pin',
        flashMemory: '32KB',
        sram: '2KB',
        eeprom: '1KB'
      },
      interfaces: [
        { id: 'power_5v', name: '5V', kind: 'power', direction: 'input', voltage: 5, current: 2 },
        { id: 'power_3v3', name: '3.3V', kind: 'power', direction: 'output', voltage: 3.3, current: 0.05 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'usb', name: 'USB', kind: 'data', protocol: 'USB 2.0', direction: 'bidirectional' },
        { id: 'uart', name: 'Serial', kind: 'data', protocol: 'UART', direction: 'bidirectional' },
        { id: 'spi', name: 'SPI', kind: 'data', protocol: 'SPI', direction: 'bidirectional' },
        { id: 'i2c', name: 'I2C', kind: 'data', protocol: 'I2C', direction: 'bidirectional' }
      ],
      pinout: {
        digital: Array.from({length: 14}, (_, i) => ({
          pin: i, name: `D${i}`, type: 'digital', voltage: 5, current: 0.04
        })),
        analog: Array.from({length: 6}, (_, i) => ({
          pin: i + 14, name: `A${i}`, type: 'analog', voltage: 5, resolution: 10
        }))
      },
      icon: 'microcontroller',
      color: '#007ACC'
    },

    'microcontroller-esp32': {
      name: 'ESP32 DevKit',
      category: 'microcontroller',
      description: 'ESP32 WiFi+Bluetooth microcontroller',
      specifications: {
        processor: 'Dual-core Xtensa LX6',
        clockSpeed: '240 MHz',
        digitalPins: 34,
        analogPins: 18,
        voltage: '3.3V',
        flashMemory: '4MB',
        sram: '520KB',
        wifi: '802.11 b/g/n',
        bluetooth: 'v4.2 BR/EDR and BLE'
      },
      interfaces: [
        { id: 'power_3v3', name: '3.3V', kind: 'power', direction: 'input', voltage: 3.3, current: 0.5 },
        { id: 'power_5v', name: '5V', kind: 'power', direction: 'input', voltage: 5, current: 0.5 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'usb', name: 'USB', kind: 'data', protocol: 'USB 2.0', direction: 'bidirectional' },
        { id: 'uart', name: 'UART', kind: 'data', protocol: 'UART', direction: 'bidirectional' },
        { id: 'spi', name: 'SPI', kind: 'data', protocol: 'SPI', direction: 'bidirectional' },
        { id: 'i2c', name: 'I2C', kind: 'data', protocol: 'I2C', direction: 'bidirectional' },
        { id: 'wifi', name: 'WiFi', kind: 'data', protocol: '802.11n', direction: 'bidirectional' },
        { id: 'bluetooth', name: 'Bluetooth', kind: 'data', protocol: 'BLE 4.2', direction: 'bidirectional' }
      ],
      icon: 'microcontroller-wifi',
      color: '#FF6B35'
    },

    // Power Supplies
    'power-supply-linear': {
      name: 'Linear Power Supply',
      category: 'power',
      description: 'Adjustable linear voltage regulator',
      specifications: {
        inputVoltage: '7-35V',
        outputVoltage: '1.2-30V',
        outputCurrent: '1.5A',
        efficiency: '60-70%',
        ripple: '<1mV',
        regulation: '±0.01%'
      },
      interfaces: [
        { id: 'vin', name: 'Input', kind: 'power', direction: 'input', voltage: 12, current: 2 },
        { id: 'vout', name: 'Output', kind: 'power', direction: 'output', voltage: 5, current: 1.5 },
        { id: 'gnd', name: 'Ground', kind: 'power', direction: 'bidirectional', voltage: 0 },
        { id: 'enable', name: 'Enable', kind: 'electrical', direction: 'input', voltage: 3.3 }
      ],
      icon: 'power-supply',
      color: '#E74C3C'
    },

    'power-supply-switching': {
      name: 'Switching Power Supply',
      category: 'power',
      description: 'High-efficiency switching regulator',
      specifications: {
        inputVoltage: '4.5-60V',
        outputVoltage: '0.76-57V',
        outputCurrent: '3A',
        efficiency: '85-95%',
        switchingFreq: '500kHz',
        regulation: '±1%'
      },
      interfaces: [
        { id: 'vin', name: 'Input', kind: 'power', direction: 'input', voltage: 12, current: 1.5 },
        { id: 'vout', name: 'Output', kind: 'power', direction: 'output', voltage: 5, current: 3 },
        { id: 'gnd', name: 'Ground', kind: 'power', direction: 'bidirectional', voltage: 0 },
        { id: 'feedback', name: 'Feedback', kind: 'electrical', direction: 'input', voltage: 1.25 },
        { id: 'enable', name: 'Enable', kind: 'electrical', direction: 'input', voltage: 3.3 }
      ],
      icon: 'power-switching',
      color: '#8E44AD'
    },

    // Sensors
    'sensor-temperature': {
      name: 'Temperature Sensor',
      category: 'sensor',
      description: 'Digital temperature sensor with I2C interface',
      specifications: {
        range: '-40°C to +125°C',
        accuracy: '±0.5°C',
        resolution: '0.0625°C',
        interface: 'I2C',
        voltage: '2.3-5.5V',
        current: '0.4mA'
      },
      interfaces: [
        { id: 'vdd', name: 'VDD', kind: 'power', direction: 'input', voltage: 3.3, current: 0.0004 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'sda', name: 'SDA', kind: 'data', protocol: 'I2C', direction: 'bidirectional' },
        { id: 'scl', name: 'SCL', kind: 'data', protocol: 'I2C', direction: 'input' },
        { id: 'alert', name: 'Alert', kind: 'electrical', direction: 'output', voltage: 3.3 }
      ],
      icon: 'sensor-temp',
      color: '#F39C12'
    },

    'sensor-accelerometer': {
      name: '3-Axis Accelerometer',
      category: 'sensor',
      description: 'MEMS 3-axis accelerometer with gyroscope',
      specifications: {
        range: '±2g to ±16g',
        sensitivity: '16384 LSB/g',
        interface: 'I2C/SPI',
        voltage: '2.16-3.6V',
        current: '0.5mA',
        dataRate: '1.56Hz to 8kHz'
      },
      interfaces: [
        { id: 'vdd', name: 'VDD', kind: 'power', direction: 'input', voltage: 3.3, current: 0.0005 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'sda', name: 'SDA/MOSI', kind: 'data', protocol: 'I2C/SPI', direction: 'bidirectional' },
        { id: 'scl', name: 'SCL/SCLK', kind: 'data', protocol: 'I2C/SPI', direction: 'input' },
        { id: 'int1', name: 'INT1', kind: 'electrical', direction: 'output', voltage: 3.3 },
        { id: 'int2', name: 'INT2', kind: 'electrical', direction: 'output', voltage: 3.3 }
      ],
      icon: 'sensor-accel',
      color: '#16A085'
    },

    // Communication Modules
    'comm-wifi': {
      name: 'WiFi Module',
      category: 'communication',
      description: '802.11 WiFi communication module',
      specifications: {
        standard: '802.11 b/g/n',
        frequency: '2.4GHz',
        dataRate: '150Mbps',
        range: '100m',
        interface: 'UART',
        voltage: '3.3V',
        current: '170mA (TX), 60mA (RX)'
      },
      interfaces: [
        { id: 'vcc', name: 'VCC', kind: 'power', direction: 'input', voltage: 3.3, current: 0.17 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'tx', name: 'TX', kind: 'data', protocol: 'UART', direction: 'output' },
        { id: 'rx', name: 'RX', kind: 'data', protocol: 'UART', direction: 'input' },
        { id: 'rst', name: 'Reset', kind: 'electrical', direction: 'input', voltage: 3.3 },
        { id: 'en', name: 'Enable', kind: 'electrical', direction: 'input', voltage: 3.3 }
      ],
      icon: 'comm-wifi',
      color: '#3498DB'
    },

    'comm-bluetooth': {
      name: 'Bluetooth Module',
      category: 'communication',
      description: 'Bluetooth Low Energy communication module',
      specifications: {
        standard: 'Bluetooth 5.0 LE',
        frequency: '2.4GHz ISM',
        range: '10m (Class 2)',
        dataRate: '2Mbps',
        interface: 'UART',
        voltage: '1.8-3.6V',
        current: '8.5mA (TX), 8.2mA (RX)'
      },
      interfaces: [
        { id: 'vcc', name: 'VCC', kind: 'power', direction: 'input', voltage: 3.3, current: 0.0085 },
        { id: 'gnd', name: 'GND', kind: 'power', direction: 'input', voltage: 0 },
        { id: 'tx', name: 'TX', kind: 'data', protocol: 'UART', direction: 'output' },
        { id: 'rx', name: 'RX', kind: 'data', protocol: 'UART', direction: 'input' },
        { id: 'state', name: 'State', kind: 'electrical', direction: 'output', voltage: 3.3 },
        { id: 'key', name: 'Key', kind: 'electrical', direction: 'input', voltage: 3.3 }
      ],
      icon: 'comm-bluetooth',
      color: '#9B59B6'
    }
  };

  // Get all types in a category
  static getTypesByCategory(category) {
    return Object.entries(this.types)
      .filter(([key, type]) => type.category === category)
      .reduce((obj, [key, type]) => ({ ...obj, [key]: type }), {});
  }

  // Get type definition
  static getType(typeKey) {
    return this.types[typeKey];
  }

  // Get all categories
  static getCategories() {
    const categories = [...new Set(Object.values(this.types).map(type => type.category))];
    return categories.sort();
  }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ElectricalBlockTypes };
}