# System Blocks Report

**Generated:** 2025-09-23 09:06:07  
**Schema Version:** system-blocks-v1

---

## Summary

- **Total Blocks:** 2
- **Total Connections:** 1

### Block Status Distribution

- **Planned:** 1
- **Verified:** 1

### Rule Check Summary

- **Total Checks:** 3
- **Passed:** 2
- **Failed:** 1

#### Rule Failures

- ⚠️ **implementation_completeness:** Incomplete blocks: Power Supply: insufficient interfaces defined

---

## Block Details

| Name | Type | Status | Attributes | Interfaces | Links |
|------|------|--------|------------|------------|-------|
| Power Supply | PowerSupply | Verified | output_voltage=3.3V, output_current=1000mA | 1 | 1 |
| Microcontroller | Microcontroller | Planned | part_number=STM32F4, current=200mA | 2 | 0 |

---

## Connection Details

| From Block | From Interface | To Block | To Interface | Protocol | Attributes |
|------------|----------------|----------|--------------|----------|------------|
| Power Supply | 7ccbbfe4-f77e-450a-81cc-e43e4b65b097 | Microcontroller | 39255db8-b00c-4b7a-bb7f-83c885085c63 | N/A | wire_gauge=22AWG, notes=Power distribution |

---

## Interface Details

| Block | Interface | Kind | Direction | Protocol | Parameters |
|-------|-----------|------|-----------|----------|------------|
| Power Supply | Power Output | electrical | output | N/A | voltage=3.3V, current=1000mA |
| Microcontroller | Power Input | electrical | input | N/A | voltage=3.3V, current=200mA |
| Microcontroller | UART | data | bidirectional | N/A | baud_rate=115200 |
