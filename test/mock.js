import { xf } from '../src/functions.js';
import { rand } from '../src/utils.js';

class TrainerMock {
    constructor() {
        this.powerTarget = 180;
        // this.init();
    }
    init() {
        const self = this;

        xf.sub('db:powerTarget', self.onPowerTarget.bind(self));
        xf.sub('ui:workoutStart', self.run.bind(self));
        xf.sub('ui:watchPause', self.stop.bind(self));

        self.id = 'ble:controllable';
        self.name = 'Tacx Flux 46731';

        xf.dispatch(`${self.id}:connected`);
        xf.dispatch(`${self.id}:name`, self.name);

        self.hrId = 'ble:hrm';
        self.hrName = 'Tacx HRB 20483';

        xf.dispatch(`${self.hrId}:connected`);
        xf.dispatch(`${self.hrId}:name`, self.hrName);

        console.warn('Trainer Mock Data is ON!');
    }
    run() {
        const self = this;
        self.interval = self.broadcast(self.indoorBikeData.bind(self));
    }
    stop() {
        const self = this;
        clearInterval(self.interval);
    }
    broadcast(handler) {
        const interval = setInterval(handler, 1000);
        return interval;
    }
    indoorBikeData() {
        const self = this;
        xf.dispatch('power', self.power(self.powerTarget));
        xf.dispatch('speed', self.speed(27));
        xf.dispatch('cadence', self.cadence(80));
        xf.dispatch('heartRate', self.heartRate(143));
    }
    onPowerTarget(powerTarget) {
        this.powerTarget = powerTarget;
    }
    power(prev) {
        let low = rand(1,100);
        if(low === 90) {
            return 0;
        }
        return prev + rand(-8, 8);
    }
    cadence(prev) {
        return prev + rand(0, 1);
    }
    speed(prev) {
        return prev; // + rand(-0.1, 0.1);
    }
    heartRate(prev) {
        return prev + rand(2, 2);
    }
}

function cadenceTargetMock() {

    setInterval(function() {
        xf.dispatch('cadence', 100 + rand(-4, 4));
    }, 1000);

    setInterval(function() {
        const t = rand(0, 1);
        if(equals(t, 0)) {
            xf.dispatch('ui:cadence-target-set', 100);
        } else {
            xf.dispatch('ui:cadence-target-set', 0);
        }
    }, 4000);
}

const trainerMock = new TrainerMock();

export { trainerMock };
