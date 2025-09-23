# Example Mermaid Flowchart
# Copy and paste this into the Import Dialog's Mermaid tab

flowchart TD
    PSU[Power Supply Unit] --> REG{Voltage Regulator}
    REG -->|3.3V| MCU[Microcontroller]
    REG -->|5V| SENSOR[Temperature Sensor]
    MCU -->|I2C| SENSOR
    MCU -->|PWM| MOTOR(DC Motor)
    MCU -->|Digital| LED[Status LED]
    SENSOR -->|Feedback| MCU
    BTN[User Button] -->|Input| MCU