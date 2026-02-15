# Technical Overview

## Architecture Pattern
The Application uses a **Reactive Event-Driven Architecture** built on top of a custom lightweight framework. It functions as a Single Page Application (SPA).

### Key Components

1.  **Event Bus (`xf`)**:
    *   Located in `src/functions.js`.
    *   The backbone of the application. It wraps the native browser `CustomEvent` and `window.dispatchEvent`.
    *   Components subscribe (`xf.sub`) to events and dispatch (`xf.dispatch`) changes.
    *   It supports a proxy-based state observation mechanism (`xf.create`), though mostly used for simple pub/sub in the codebase.

2.  **State Management (`db.js`)**:
    *   Centralized "Single Source of Truth".
    *   Modules import `db.js` which initializes the state.
    *   It subscribes to various hardware and logic events to update the state (Speed, Power, Heart Rate, etc.).
    *   It uses `models/models.js` to validate and structure the data.

3.  **Data Models (`src/models/`)**:
    *   Enforces type safety and business logic on state properties (e.g., `Power`, `HeartRate` boundaries).
    *   Uses a `Model` base class for common validation, parsing, and persistence logic.

4.  **Hardware Interface (`src/ble/`, `src/ant/`)**:
    *   **BLE**: Handles Bluetooth Low Energy interactions. Uses `web-bluetooth` API.
    *   **ANT+**: Handles ANT+ interactions. Uses `web-usb` or implementation specific drivers.
    *   Devices are abstracted (PowerMeter, Controllable, HeartRateMonitor).

5.  **Views (`src/views/`)**:
    *   Web Components (Custom Elements) or standard helper functions that render the UI.
    *   They subscribe to `xf` events to update reactively without a heavy Virtual DOM framework.

6.  **Workouts (`src/workouts/`)**:
    *   Stored generally in XML format (resembling ZWO).
    *   Parsed and executed by a timer/logic engine.

### Build System
*   **Bundler**: Parcel.
*   **Test Runner**: Jest.
*   **Transpiler**: Babel.

## Flow of Data
1.  **Hardware Input**: A BLE device sends a notification (e.g., Power measurement).
2.  **Driver Layer**: `src/ble/` decodes the data.
3.  **Event Dispatch**: The driver dispatches an event (e.g., `ble:power`).
4.  **State Update**: `db.js` listens to `ble:power` and updates `state.power`.
5.  **UI Update**: Views listening to `db:power` (or similar) verify the change and re-render the DOM.

## Storage
*   **IndexedDB**: Used for heavy data like activity logs (`src/storage/idb.js`).
*   **LocalStorage**: Used for user preferences (Profile, Settings).
