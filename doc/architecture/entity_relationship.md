# Entity Relationship

The following diagram illustrates the logical relationships between the core entities in the application.

```mermaid
erDiagram
    User ||--|| Profile : has
    User ||--o{ Activity : performs
    User ||--o{ Workout : defines
    
    Profile {
        number ftp
        number weight
        string theme
        string units
    }

    Activity {
        date startTime
        number duration
        array records
        array laps
        string status
    }

    Activity ||--|{ DataRecord : contains
    Activity ||--|{ Lap : contains

    DataRecord {
        timestamp time
        number power
        number heartRate
        number cadence
        number speed
        number distance
    }

    Lap {
        number startTime
        number totalTime
        number totalDistance
        number avgPower
        number avgSpeed
    }

    Workout {
        string name
        string description
        string category
        array steps
    }

    Workout ||--|{ WorkoutStep : has
    
    WorkoutStep {
        string type
        number duration
        number targetPower
        number targetSlope
    }

    User ||--o{ Device : pairs

    Device {
        string id
        string name
        enum type
        enum status
    }

    Device ||--o{ Metric : provides

    Metric {
        string type
        number value
        timestamp time
    }
    
    %% Relationships to Physical Models
    Activity }|..|| PhysicsModel : uses
    PhysicsModel {
        number calculateSpeed
    }
```

## Entity Descriptions

### User / Profile
Represents the cyclist using the application. Critical attributes like **FTP** (Functional Threshold Power) and **Weight** are used in physics calculations and workout intensity scaling.

### Activity
A single session of riding. It can be a free ride or a structured workout. It strictly records time-series data (`records`) and aggregate data (`laps`).

### Workout
A structured plan consisting of intervals. 
*   **ZWO Format**: The system parses XML definitions to build internal structures.
*   **Steps**: Individual blocks (Warmup, SteadyState, Intervals) that define targets.

### Device
Hardware sensors connected via ANT+ or BLE.
*   **Controllable**: A Smart Trainer that accepts resistance/slope commands.
*   **Sensors**: Power Meters, HR Monitors, Cadence sensors.

### Metric
Real-time data points flowing through the `xf` event bus. 
*   Examples: `power`, `cadence`, `heartRate`, `smo2` (Muscle Oxygen).
