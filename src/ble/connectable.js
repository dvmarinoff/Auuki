import { equals, exists, first, expect, compose2, time, print, } from '../functions.js';
import { Characteristic } from './characteristic.js';
import { Service, serviceToString, gattListToObject, } from './service.js';
import FTMS from './ftms/ftms.js';
import FEC from './fec/fec.js';
import WCPS from './wcps/wcps.js';
import CPS from './cps/cps.js';
import CSCS from './cscs/cscs.js';
import HRS from './hrs/hrs.js';
import BAS from './bas/bas.js';
import RCS from './rcs/rcs.js';
import SMO2 from './moxy/smo2.js';
import CoreTemp from './ct/ct.js';
import OBC from './obc/obc.js';
import { webBle, uuids } from './web-ble.js';
import { Device, Status, } from './enums.js';

// TODO:
// - in the watch() method handle:
//     - getDevices() fail,
//     - the device not being in devices.
// - in the setup() method and services object add the ability to work with multiple
//   services start and stop them on demand, and switch between them dynamically

// Usage:
//
// Case 1: Connect unknown number of devices or multiple devices
// of the same device type (power meters, heart rate monitors).
// Here the device is being requested from client code and passed
// as option to the construtor function:
//
// const filter = {filters: [
//     {services: [uuids.heartRate]},
//     {services: [uuids.cyclingPower]},
// ]};
// const device = await navigator.bluetooth.requestDevice(filter);
// const connectable = Connectable({device});
// await connectable.connect();
//
// Case 2: Connect devices by Device Category
// Here we are going to have a predetermined set of devices that we are interested in.
// We care to connect only one device per device type: power meter, heart rate monitor
// The client code creates a strict filter and passes it as configuration option to
// the function constructor:
//
// const heartRateMonitorFilter = {filters: [{services: [uuids.heartRate]}]};
// const heartRateMonitor = Connectable({filter: heartRateMonitorFilter});
// await heartRateMonitor.connect();
//
// const powerMeterFilter = {filters: [{services: [uuids.cyclingPower]}]};
// const powerMeter = Connectable({filter: powerMeterFilter});
// await powerMeter.connect();
//
function Connectable(args = {}) {
    const defaults = {
        name: 'Unknown',
        filter: webBle.filters.all(),
    };

    //
    // Config
    //

    // the following values can be optionally configured if not they will use the
    // their default values.

    // this is the device filter for requestDevice.
    // The default value will look for any bluetooth device.
    //
    // {}
    const filter        = args.filter ?? defaults.filter;

    // setup(), method will be executed by the end of the connection procedure,
    // It will try to determine the deviceType of the device based on what services
    // are present there and it will initialize those services.
    // Extend the method if you want to add support for new Services.
    // Overwrite the method if you want to implement each device separetly.
    //
    // Function
    const setup         = args.setup ?? defaultSetup;

    // Connection callbacks
    // the defaults only log, but they are composed with corresponding optional
    // callbacks
    //
    // Function
    const onConnecting  = compose2(
        args.onConnecting ?? ((x) => x),
        defaultOnConnecting
    );
    const onConnected  = compose2(
        args.onConnected ?? ((x) => x),
        defaultOnConnected
    );
    const onConnectFail  = compose2(
        args.onConnectFail ?? ((x) => x),
        defaultOnConnectFail
    );
    const onDisconnect  = compose2(
        args.onDisconnect ?? ((x) => x),
        defaultOnDisconnect
    );

    // Characteristics notify/indicate callbacks
    // onData(), will be attached to the each service measurement characteristic
    // it will return data like power, heartRate, etc. in an object called with
    // structure: {power?: Int, heartRate?: Int, ...}
    // note that each object will have different contents based on what
    // data is included in the message being decoded.
    //
    // Function
    const onData        = args.onData ?? defaultOnData;

    // onControl(), will be attached to the each service control characteristic
    // if one is present and has a notify property.
    // It will return object from the decoded message.
    // The parser that decodes the message is configured on the Service factory.
    //
    // Function
    const onControl     = args.onControl ?? defaultOnControl;

    // default callback implementations

    // Void -> Void
    function defaultOnConnecting() {
        print.log(`ble: connecting: to: ${getName()} ...`);
    }

    // Void -> Void
    function defaultOnConnected() {
        print.log(`ble: connected: to: ${getName()} ${getDeviceType()}`);
    }

    // Void -> Void
    function defaultOnConnectFail() {
        print.log(`ble: connection-fail: from: ${getName()}`);
    }

    // Void -> Void
    function defaultOnDisconnect() {
        print.log(`ble: disconnected: from: ${getName()}`);
    }

    // {} -> Void
    function defaultOnData(msg) {
        print.log(`ble: rx: from: ${getName()} `, msg);
    }

    // {} -> Void
    function defaultOnControl(msg) {
        print.log(`ble: rx: from: ${getName()} `, msg);
    }
    // end default callback implementations
    //
    // End Config
    //

    //
    // State
    //

    // public state
    // {'<service-name>': Service}
    let services = {};

    // end public state

    // private state variables, please don't expose them, use the accesor methods

    // BluetoothDevice{
    //     id: String,
    //     name: String,
    //     gatt: BluetoothRemoteGATTServer,
    //     onadvertisementreceived: null,
    //     ongattserverdisconnected: null,
    //     watchingAdvertisements: Bool,
    // }
    let _device = args.device;

    // BluetoothRemoteGATTServer{
    //     device: BluetoothDevice,
    //     connected: Bool
    // }
    let _server;

    // [BluetoothRemoteGATTService{
    //     device: BluetoothDevice,
    //     uuid: String,
    //     isPrimary: Bool,
    // }]
    let _primaryServicesList;

    // {'<service-uuid>': BluetoothRemoteGATTService}
    let _primaryServices;

    let _status = Status.disconnected;
    let _connected = false;
    let _ready = false;
    let _autoReconnect = true;
    let _deviceType = Device.generic;

    let abortController;
    let signal;

    // end private state

    // accesor methods
    function isConnected() {
        return _connected;
    }

    function isReady() {
        return _ready;
    }

    function getName() {
        return exists(_device) ? _device.name : defaults.name;
    }

    function getId() {
        return exists(_device) ? _device.id : undefined;
    }

    function getDeviceType() {
        return _deviceType;
    }

    function getSignature() {
        return {
            id: getId(),
            name: getName(),
            deviceType: getDeviceType(),
        };
    }

    function getStatus() {
        return _status;
    }

    function setReady(ready) {
        _ready = ready;
    }
    // end accesor methods

    function printServices() {
        _primaryServicesList.forEach((service) => {
            print.log(`ble: service: ${serviceToString(service)}`);
        });
    }

    // String -> Bool
    function hasService(uuid) {
        return uuid in _primaryServices;
    }

    // String -> BluetoothRemoteGATTService?
    function getService(uuid) {
        return _primaryServices[uuid];
    }

    //
    // methods
    //

    // connect(), can be used in 3 ways to connect to a device
    //
    // - connect({requesting: false, watching: false})
    //   this is the default case, here the raw gatt device has been already requested
    //   and must be passed as config option:
    //
    //   const connectable = Connectable({device: GATTDevice});
    //   connectable.connect();
    //
    // - connect({requesting: true, watching: false})
    //   here we want to request and connect to the device in one step
    //
    //   const connectable = Connectable();
    //   connectable.connect();
    //
    // - connect({requesting: false, watching: true})
    //   here the device is already known and available in the browser web-ble cache
    //   so we want to listen for when it becomes availbale again. This is used to
    //   recover devices that have droped.
    //
    async function connect(args = {}) {
        if(equals(getStatus(), Status.connecting) ||
           equals(getStatus(), Status.connected)) return;

        const requesting = args.requesting ?? false;
        const watching = args.watching ?? false;

        // guard
        // stop execution on missuse and notify the developer
        if((!requesting && !watching) && !exists(_device)) {
            // can't be watching or requesting if device is not passed as config
            console.error(`ble: connectable: 'watching false and requesting false requires a gatt device to be passed as config to Connectable!'`);

            print.makeCoffee();

        }
        if(requesting && watching) {
            // can't be watching and requesting at the same time
            console.error(`ble: connectable: 'can't be requesting and watching for a devices at the same time pick one!'`);

            print.callKarenFromHR();

            return;
        }
        // end guard

        abortController = new AbortController();
        signal = { signal: abortController.signal };

        _status = Status.connecting;
        onConnecting();

        try {
            if(watching) {
                _device = await watch(_device.id);
            }
            if(requesting) {
                _device = await request();
            }
            _server              = await _device.gatt.connect();
            print.log(`ble: gatt: connected: to: ${getName()} 'setting up ...'`);
            _primaryServicesList = await _server.getPrimaryServices();
            _primaryServices     = gattListToObject(_primaryServicesList);
            _connected           = true;
            _autoReconnect       = true;
            _status              = Status.connected;

            _device.addEventListener('gattserverdisconnected', _onDisconnect, signal);

            print.log(`ble: gatt: services: of: ${getName()}`);
            printServices();

            let resSetup = await setup();

            // calling the connected callback last, because only at that point
            // the device is usable.
            onConnected();

        } catch(e) {
            _connected = false;
            _status = Status.disconnected;
            onConnectFail(e);
            console.warn(e);
        }
    }

    // request a device by using the configured filter
    // can throw an error handle it outside
    //
    // Void -> GATTDevice?
    async function request() {
        const device = await navigator.bluetooth.requestDevice(filter);
        return device;
    }

    // Int -> GATTDevice?
    async function watch(deviceId) {
        print.log(`ble: watching: advertisements: for: ${deviceId}`);

        const devices = await navigator.bluetooth.getDevices();
        const device = devices.find(device => device.id === deviceId);

        let resolve;
        let reject;
        const maybeDevice = new Promise(function(res, rej) {
            resolve = res;
            reject = rej;
        });

        const timeout = 1 * 60 * 1000; // 60s
        const timeoutId = setTimeout(function() {
            print.log(`ble: watch: timeout:`);
            abortController.abort();
            reject();
        }, timeout);

        const abortController = new AbortController();
        device.addEventListener(
            'advertisementreceived',
            onAdvertisementReceived,
            {
                signal: abortController.signal,
                once: true,
            }
        );

        async function onAdvertisementReceived(e) {
            abortController.abort();
            clearTimeout(timeoutId);

            print.log(`ble: watch: advertisement: received:`);
            resolve(e.device);
        }

        await device.watchAdvertisements({signal: abortController.signal});

        return maybeDevice;
    }

    async function disconnect() {
        if(!_connected) { return; }

        _status = Status.disconnecting;
        // TODO: implement Disconnecting
        onConnecting();

        if(services?.trainer?.reset ?? false) {
            let res = await services.trainer.reset();
        }

        for(let key in services) {
            await services[key].stop();
        }

        _connected = false;
        _status = Status.disconnected;
        _autoReconnect = false;

        abortController.abort();

        const res = await _device.gatt.disconnect();
        onDisconnect();
    }

    function _onDisconnect() {
        _status = Status.disconnected;
        onDisconnect();
        if(_autoReconnect) onDropout();
    }

    async function onDropout() {
        print.warn(`ble: dropout: ${_device.name}`);

        if(watchAdvertisementsSupported()) {
            connect({watching: true, requesting: false});
        } else {
            print.log(`:connectable 'watchAdvertisements not supported falling back to device.connect ${_device.name}'`);
            connect({watching: false, requesting: false});
        }
    }

    function watchAdvertisementsSupported() {
        return exists(_device.watchAdvertisements);
    }

    // check what services got collected from the device
    // execute a fallthrough logic to determine:
    // - deviceType
    // - setup Services by linking them to data callbacks
    //   and the raw gattService object
    async function defaultSetup() {
        const hasFTMS = hasService(uuids.fitnessMachine);
        const hasFEC = hasService(uuids.fec);
        const hasWCPS = hasService(uuids.wahooFitnessMachine);
        const hasPower = hasService(uuids.cyclingPower);
        const hasCadence = hasService(uuids.speedCadence);
        const hasHeartRate = hasService(uuids.heartRate);
        const hasBattery = hasService(uuids.battery);
        const hasRaceController = hasService(uuids.raceController);
        const hasSmo2 = hasService(uuids.smo2);
        const hasCoreTemp = hasService(uuids.coreTemp);
        const hasOpenBikeControl = hasService(uuids.openBikeControl);
        const hasTrainerControl = hasFTMS || hasWCPS || hasFEC;

        // Order here is important
        if(hasBattery) {
            services['bas'] = BAS({
                service: getService(uuids.battery),
                onData: onData,
            });
            let res = await services.bas.setup();

            services.bas.readBatteryLevel();
            // always continue
        }
        if(hasOpenBikeControl) {
            _deviceType = Device.openBikeControl;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['obc'] = OBC({
                service: getService(uuids.openBikeControl),
                onData: onData,
            });
            let res = await services.obc.setup();

            return res;
        }
        if(hasHeartRate) {
            // heart rate
            _deviceType = Device.heartRateMonitor;
            print.log(`ble: connectable: setup: ${getDeviceType()} `);

            services['hrs'] = HRS({
                service: getService(uuids.heartRate),
                onData: onData,
            });
            let res = await services.hrs.setup();

            // NOTE: we don't return here because:
            // - the Tickr X has a CSC service too
            // - the Zwift Hub has FTMS
            if(!(hasCadence || hasTrainerControl)) return res;
        }

        if(hasTrainerControl) {
            // controllable
            //
            // Here we are determining which trainer control service the device
            // supports and we initialize it. We can initialize only one if more are
            // present else the device could fail (Tacx), so we do early return.
            // The supported control services are FTMS, FEC and WCPS.
            // There choosen one will be called 'trainer' and assigned to services.
            //
            // We don't want more than one control service to be initialized, because
            // on many trainers they will clash and this results in resistance jumping
            // between both services. This is resolved only by power cycling the
            // trainer and reconnecting again.
            _deviceType = Device.controllable;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            if(hasFTMS) {
                services['trainer'] = FTMS({
                    service: getService(uuids.fitnessMachine),
                    onData: onData,
                });
                let res = await services.trainer.setup();
                return res;
            }

            if(hasFEC) {
                services['trainer'] = FEC({
                    service: getService(uuids.fec),
                    onData: onData,
                });
                let res = await services.trainer.setup();
                return res;
            }

            if(hasWCPS) {
                services['trainer'] = WCPS({
                    service: getService(uuids.cyclingPower),
                    onData: onData,
                });
                let res = await services.trainer.setup();
                return res;
            }
        }

        if(hasPower) {
            // power meter
            _deviceType = Device.powerMeter;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['cps'] = CPS({
                service: getService(uuids.cyclingPower),
                onData: onData,
            });
            let res = await services.cps.setup();

            return res;
        }

        if(hasRaceController) {
            // zwift click or play
            _deviceType = Device.raceController;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['rcs'] = RCS({
                service: getService(uuids.raceController),
                onData: onData,
            });
            let res = await services.rcs.setup();

            return res;
        }

        if(hasSmo2) {
            // SmO2
            _deviceType = Device.smo2;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['smo2'] = SMO2({
                service: getService(uuids.smo2),
                onData: onData,
            });
            let res = await services.smo2.setup();

            return res;
        }

        if(hasCoreTemp) {
            // CoreTemp
            _deviceType = Device.coreTemp;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['coreTemp'] = CoreTemp({
                service: getService(uuids.coreTemp),
                onData: onData,
            });
            let res = await services.coreTemp.setup();

            return res;
        }

        if(hasCadence) {
            // cadence
            _deviceType = Device.speedCadenceSensor;
            print.log(`ble: connectable: setup: ${getDeviceType()}`);

            services['cscs'] = CSCS({
                service: getService(uuids.speedCadence),
                onData: onData,
            });
            let res = await services.cscs.setup();

            return res;
        }

        // NOTE: if we reach this point the device doesn't have the advertized
        // services or is not supported at all. This is a developer error.
        // Either the filters are wrong or the remote device is advertising wrong.
        // In any case we can't continue using the device.
        // If we throw an error here the device will disconnect and the User
        // won't know why.
        // So this case must be handled in the UI and the method simply returns false.
        console.warn(`ble: connectable: setup: ${getName()} fail: 'this device doesn't have a supported service!`);

        return false;
    }

    async function setupService(args = {}) {
        const name   = expect(
            args.name,
            'connectable.setupService needs name: String'
        );
        const struct = expect(
            args.struct,
            `connectable.setupService needs struct: Function.`
        );
        const uuid   = expect(
            args.uuid,
            `connectable.setupService needs service uuid: UUID.`
        );

        services[name] = struct({
            service: getService(uuid),
            onData: onData,
        });

        let res = await services[name].setup();
        return res;
    }

    // expose public methods and properties
    return {
        connect,
        disconnect,
        request,
        watch,
        hasService,
        getService,
        getName,
        getId,
        getDeviceType,
        getSignature,
        getStatus,
        isConnected,
        isReady,
        setReady,
        services,
    };
}

export default Connectable;
