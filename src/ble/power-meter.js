import { xf, exists } from '../functions.js';
import { ble } from './web-ble.js';
import { uuids } from './uuids.js';
import { Device } from './device.js';
import { DeviceInformationService } from './dis/dis.js';
import { CyclingPowerService } from './cps/cps.js';
import { models } from '../models/models.js';

class PowerMeter extends Device {
    defaultId()     { return 'ble:power-meter'; }
    defaultFilter() { return ble.requestFilters.power; }
    postInit(args) {
        return;
    }
    async start() {
        const self = this;

        self.cps = await self.cyclingPower();
        // self.dis = await self.deviceInformation();

        xf.dispatch('sources', {power: self.id});
        xf.dispatch(`${self.id}:feature`, self.cps.feature);
        console.log(self.cps.feature);
    }
    async deviceInformation() {
        const self = this;
        const dis = new DeviceInformationService({
            onInfo:   onCyclingPowerInfo.bind(self),
            services: self.services,
            server:   self.server,
            ble,
        });

        if(ble.hasService(self.services, uuids.deviceInformation)) {
            await dis.init();
        }

        return dis;
    }
    async cyclingPower() {
        const self = this;
        const cps = new CyclingPowerService({
            onData:    onPowerData.bind(self),
            onControl: onCyclingPowerControlPoint.bind(self),
            services:  self.services,
            server:    self.server,
            ble,
        });
        await cps.start();
        return cps;
    }
}

function onPowerData(data) {
    const self = this;
    if(exists(data.power)   && models.sources.isSource('power', self.id)) {
        xf.dispatch('power', data.power);
    }
    if(exists(data.cadence) && models.sources.isSource('cadence', self.id)) {
        xf.dispatch('cadence', data.cadence);
    }
    if(exists(data.speed)   && models.sources.isSource('speed', self.id)) {
        xf.dispatch('speed', data.speed);
    }
    if(exists(data.offsetIndicator)) {
        xf.dispatch(`${self.id}:offsetIndicator`, data.offsetIndicator);
    };
}

function onCyclingPowerInfo() {
}

function onCyclingPowerControlPoint() {
}

export {
    PowerMeter
};

