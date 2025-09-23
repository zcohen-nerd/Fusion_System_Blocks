# Hierarchical System Example

This example demonstrates the hierarchy feature for complex engineering systems.

## Scenario: Autonomous Drone System

```
Root Level: Drone System
├── Flight Control Subsystem
│   ├── IMU (Inertial Measurement Unit)
│   ├── GPS Module
│   ├── Barometer
│   └── Flight Controller MCU
├── Power Management Subsystem  
│   ├── Battery Pack
│   ├── Power Distribution Board
│   ├── Voltage Regulators (5V, 3.3V)
│   └── Current Monitoring
├── Propulsion Subsystem
│   ├── 4x Brushless Motors
│   ├── 4x Electronic Speed Controllers (ESCs)
│   └── 4x Propellers
└── Communication Subsystem
    ├── Radio Transceiver
    ├── Antenna System
    └── Telemetry Processor
```

## How to Use Hierarchy in the Tool

1. **Create Top-Level Blocks**: Start with major subsystems as blocks
2. **Select a Block**: Click on a subsystem block (e.g., "Flight Control")
3. **Create Child Diagram**: Click the "+ Child" button
4. **Drill Down**: Double-click the block or use "↓ Drill Down" button
5. **Design Subsystem**: Add detailed components within the subsystem
6. **Navigate Back**: Use "↑ Up" button to return to parent level
7. **Status Roll-up**: Parent status reflects child completion

## Key Benefits

### **Manageable Complexity**
- Top level shows 4 subsystems instead of 20+ components
- Each subsystem can be designed independently
- Clear separation of concerns

### **Interface Validation** 
- Parent block interfaces must map to child boundaries
- Ensures subsystem integration is properly planned
- Prevents "interface mismatch" errors

### **Status Tracking**
- Parent status cannot exceed child completion
- Forces bottom-up development approach
- Clear visibility of project progress

### **Team Collaboration**
- Different engineers can work on different subsystems
- Subsystem interfaces define collaboration boundaries
- Hierarchical organization matches team structure

## Visual Indicators

- **Dashed Border**: Blocks with child diagrams have dashed borders
- **Folder Icon**: 📁 icon appears on blocks with children
- **Breadcrumb**: Shows current navigation path (e.g., "Drone > Flight Control > IMU")
- **Status Colors**: Roll up from children to parents

## Engineering Workflow

1. **System Architecture**: Define major subsystems and their interfaces
2. **Subsystem Design**: Drill down into each subsystem for detailed design
3. **Interface Review**: Validate that subsystem boundaries are correct
4. **Implementation**: Bottom-up development with status tracking
5. **Integration**: Parent-level view shows overall system integration

This hierarchical approach enables the tool to handle complex engineering systems that would be impossible to manage in a flat diagram structure.