import { print, } from '../functions.js';
import ReactiveConnectable from './reactive-connectable.js';
import { webBle, } from './web-ble.js';
import { Device, } from './enums.js';

const controllable = ReactiveConnectable({
    deviceType: Device.controllable,
    filter: webBle.filters.controllable(),
});

const speedCadenceSensor = ReactiveConnectable({
    deviceType: Device.speedCadenceSensor,
    filter: webBle.filters.speedCadenceSensor(),
});

const heartRateMonitor = ReactiveConnectable({
    deviceType: Device.heartRateMonitor,
    filter: webBle.filters.heartRateMonitor(),
});

const powerMeter = ReactiveConnectable({
    deviceType: Device.powerMeter,
    filter: webBle.filters.powerMeter(),
});

const moxy = ReactiveConnectable({
    deviceType: Device.smo2,
    filter: webBle.filters.smo2(),
});

const coreTemp = ReactiveConnectable({
    deviceType: Device.coreTemp,
    filter: webBle.filters.coreTemp(),
});

const openBikeControl = ReactiveConnectable({
    deviceType: Device.openBikeControl,
    filter: webBle.filters.openBikeControl(),
});

// export {
//     controllabe,
//     heartRateMonitor,
//     powerMeter,
//     speedCadenceSensor,
// };

