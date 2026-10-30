import { exists, empty, } from '../functions.js';

const services = {
    fitnessMachine:      '00001826-0000-1000-8000-00805f9b34fb',
    cyclingPower:        '00001818-0000-1000-8000-00805f9b34fb',
    heartRate:           '0000180d-0000-1000-8000-00805f9b34fb',
    speedCadence:        '00001816-0000-1000-8000-00805f9b34fb',
    battery:             '0000180f-0000-1000-8000-00805f9b34fb',
    fec:                 '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e',
    wahooFitnessMachine: 'a026ee0b-0a7d-4ab3-97fa-f1500f9feb8b',
    raceController:      '00000001-19ca-4651-86e5-fa29dcdd09d1',
    smo2:                '6404d801-4cb9-11e8-b566-0800200c9a66',
    coreTemp:            '00002100-5b1e-4347-b07c-97b514dae121',
    openBikeControl:     'd273f680-d548-419d-b9d1-fa0472345229',
};

const characteristics = {
    // Fitness Machine
    indoorBikeData:                '00002ad2-0000-1000-8000-00805f9b34fb',
    fitnessMachineControlPoint:    '00002ad9-0000-1000-8000-00805f9b34fb',
    fitnessMachineFeature:         '00002acc-0000-1000-8000-00805f9b34fb',
    supportedResistanceLevelRange: '00002ad6-0000-1000-8000-00805f9b34fb',
    supportedPowerRange:           '00002ad8-0000-1000-8000-00805f9b34fb',
    fitnessMachineStatus:          '00002ada-0000-1000-8000-00805f9b34fb',

    // Cycling Power
    cyclingPowerMeasurement:       '00002a63-0000-1000-8000-00805f9b34fb',
    cyclingPowerFeature:           '00002a65-0000-1000-8000-00805f9b34fb',
    cyclingPowerControlPoint:      '00002a66-0000-1000-8000-00805f9b34fb',
    wahooTrainer:                  'a026e005-0a7d-4ab3-97fa-f1500f9feb8b',

    // Heart Rate
    heartRateMeasurement:          '00002a37-0000-1000-8000-00805f9b34fb',

    // Cycling Speed and Cadence
    speedCadenceMeasurement:       '00002a5b-0000-1000-8000-00805f9b34fb',
    speedCadenceFeature:           '00002a5c-0000-1000-8000-00805f9b34fb',
    speedCadenceControlPoint:      '00002a55-0000-1000-8000-00805f9b34fb',

    // Battery
    batteryLevel:                  '00002a19-0000-1000-8000-00805f9b34fb',
    batteryLevelStatus:            '00002bed-0000-1000-8000-00805f9b34fb',

    // Device Information
    manufacturerNameString:        '00002a29-0000-1000-8000-00805f9b34fb',
    modelNumberString:             '00002a24-0000-1000-8000-00805f9b34fb',
    firmwareRevisionString:        '00002a26-0000-1000-8000-00805f9b34fb',

    // FEC over BLE
    fec2:                          '6e40fec2-b5a3-f393-e0a9-e50e24dcca9e',
    fec3:                          '6e40fec3-b5a3-f393-e0a9-e50e24dcca9e',

    // Wahoo Fitness Machine
    wahooFitnessMachineControlPoint: 'a026e037-0a7d-4ab3-97fa-f1500f9feb8b',

    // Race Controller (Zwift)
    raceControllerMeasurement:     '00000002-19ca-4651-86e5-fa29dcdd09d1',
    raceControllerControlPoint:    '00000003-19ca-4651-86e5-fa29dcdd09d1',
    raceControllerResponse:        '00000004-19ca-4651-86e5-fa29dcdd09d1',

    // SmO2 Moxy
    smo2SensorData:                '6404d804-4cb9-11e8-b566-0800200c9a66',
    smo2DeviceControl:             '6404d810-4cb9-11e8-b566-0800200c9a66',
    smo2ControlPoint:              '6404d811-4cd9-11e8-b566-0800200c9a66',

    // CoreTemp
    coreBodyTemp:                  '00002101-5b1e-4347-b07c-97b514dae121',
    corePrivate:                   '00004200-f366-40b2-ac37-70cce0aa83b1',

    // OpenBikeControl
    buttonState:                   'd273f681-d548-419d-b9d1-fa0472345229',
    hapticFeedback:                'd273f682-d548-419d-b9d1-fa0472345229',
    appInformation:                'd273f683-d548-419d-b9d1-fa0472345229',

    // others
    sensorLocation:                    '00002a5d-0000-1000-8000-00805f9b34fb',
    clientCharacteristicConfiguration: '00002902-0000-1000-8000-00805f9b34fb',
};

const uuids = { ...services, ...characteristics };

function Filters() {

    function controllable() {
        return {
            filters: [
                {services: [uuids.fitnessMachine]},
                {services: [uuids.fec]},
                {services: [uuids.wahooFitnessMachine]},
                {services: [uuids.cyclingPower]},
            ],
            optionalServices: [uuids.heartRate]
        };
    }

    function powerMeter() {
        return {
            filters: [{services: [uuids.cyclingPower]}],
            optionalServices: [uuids.battery]
        };
    }

    function speedCadenceSensor() {
        return {
            filters: [{services: [uuids.speedCadence]}],
            optionalServices: [uuids.speedCadence, uuids.battery]
        };
    }

    function heartRateMonitor() {
        return {
            filters: [{services: [uuids.heartRate]}],
            optionalServices: [uuids.speedCadence, uuids.battery]
        };
    }

    function smo2() {
        return {
            filters: [{services: [uuids.smo2]}],
            optionalServices: [uuids.battery]
        };
    }

    function coreTemp() {
        return {
            filters: [
                {services: [uuids.coreTemp]},
                {services: [uuids.corePrivate]},
            ],
            optionalServices: [uuids.battery]
        };
    }

    function openBikeControl() {
        return {
            filters: [{services: [uuids.openBikeControl]}],
            optionalServices: [uuids.battery],
        };
    }

    function all() {
        return {acceptAllDevices: true};
    }

    async function generic(args = {}) {
        const devices = await navigator.bluetooth.getDevices();

        let exclusionFilters = devices.reduce((acc, device) => {
            if(device?.gatt?.connected ?? false) {
                acc.push({name: device?.name ?? 'unknown'});
            }
            return acc;
        }, []);
        // NOTE: guard against empty exclusion filter, they cause an error
        exclusionFilters = empty(exclusionFilters) ? undefined : exclusionFilters;

        return {
            filters: [
                {services: [uuids.fitnessMachine]},
                {services: [uuids.fec]},
                {services: [uuids.wahooFitnessMachine]},
                {services: [uuids.cyclingPower]},
                {services: [uuids.speedCadence]},
                {services: [uuids.raceController]},
                {services: [uuids.smo2]},
                {services: [uuids.heartRate]},
                {services: [uuids.coreTemp]},
                {services: [uuids.openBikeControl]},
            ],
            exclusionFilters,
        };
    }

    return Object.freeze({
        controllable,
        speedCadenceSensor,
        heartRateMonitor,
        powerMeter,
        smo2,
        coreTemp,
        openBikeControl,
        all,
        generic,
    });
}

function WebBLE() {
    const filters = Filters();

    function isAvailable() {
        // TODO: comment when not working on the iOS connect functionality.
        // This allows the iOS connection to show up in Chrome not just Safari
        // if(dev) {
        //     console.warn(`BLE Bridge mode ACTIVE!`);
        //     console.warn(`app will use BLE Bridge connection ONLY!`);
        //     return false;
        // }
        // END comment
        if(exists(navigator)) {
            return 'bluetooth' in navigator;
        }
        return false;
    }

    function uuidToName(uuid) {
        return Object.entries(uuids).find(kv => kv[1] === uuid)[0];
    }

    return Object.freeze({
        filters,
        isAvailable,
        uuidToName,
    });
}

const webBle = WebBLE();

export {
    webBle,
    uuids,
};

