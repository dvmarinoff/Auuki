const Status = {
    disconnected: "disconnected",
    connected: "connected",
    connecting: "connecting",
    disconnecting: "disconnecting",
};

const Device = {
    controllable: 'controllable',
    speedCadenceSensor: 'speedCadenceSensor',
    powerMeter: 'powerMeter',
    heartRateMonitor: 'heartRateMonitor',
    raceController: 'raceController',
    smo2: 'smo2',
    coreTemp: 'coreTemp',
    openBikeControl: 'openBikeControl',
    generic: 'generic',
};

const Metric = {
    power: 'power',
    cadence: 'cadence',
    heartRate: 'heartRate',
    smo2: 'smo2',
    thb: 'thb',
    coreBodyTemperature: 'coreBodyTemperature',
    skinTemperature: 'skinTemperature',
};

const Responsibility = {
    controllable: [Metric.power, Metric.cadence, Metric.heartRate],
    powerMeter: [Metric.power, Metric.cadence],
    speedCadenceSensor: [Metric.cadence],
    heartRateMonitor: [Metric.heartRate, Metric.cadence],
    smo2: [Metric.smo2, Metric.thb],
};

const Priority = {
    power: [
        Device.powerMeter,
        Device.controllable,
    ],
    cadence: [
        Device.speedCadenceSensor,
        Device.powerMeter,
        Device.controllable,
        Device.heartRateMonitor,
    ],
    heartRate: [
        Device.heartRateMonitor,
        Device.controllable,
    ],
    smo2: [
        Device.smo2,
    ],
    coreTemp: [
        Device.coreTemp,
    ]
};

const ControlMode = {
    erg: 'erg',
    sim: 'sim',
    resistance: 'resistance',
    virtualGear: 'virtualGear',
};

export {
    Status,
    Device,
    Metric,
    Responsibility,
    Priority,
    ControlMode,
};

