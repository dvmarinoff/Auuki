import { equals, exists, empty, first, last, xf, avg, max, toFixed, print, } from './functions.js';
import { kphToMps, mpsToKph, timeDiff } from './utils.js';
import { models } from './models/models.js';
import { ControlMode, } from './ble/enums.js';
import { TimerStatus, EventType, } from './activity/enums.js';

// const timer = new Worker('./timer.js');
const timer = new Worker(new URL('./timer.js', import.meta.url));

class Watch {
    constructor(args) {
        this.elapsed          = 0;
        this.lapTime          = 0;
        this.stepTime         = 0;

        this.intervalIndex    = 0;
        this.stepIndex        = 0;
        this.intervalDuration = 0;
        this.stepDuration     = 0;

        this.state            = 'stopped';
        this.stateWorkout     = 'stopped';

        // Distance
        this.intervalType      = 'duration';
        // end Distance

        this.intervals         = [];
        this.autoPauseCounter  = 0;
        this.hasBeenAutoPaused = false;
        this.autoPause         = false;
        this.init();
    }
    init() {
        const self = this;

        xf.sub('db:workout',       workout => { self.intervals     = workout.intervals; });
        xf.sub('db:elapsed',       elapsed => { self.elapsed       = elapsed; });
        xf.sub('db:lapTime',          time => { self.lapTime       = time; });
        xf.sub('db:stepTime',         time => { self.stepTime      = time; });
        xf.sub('db:intervalDuration', time => { self.lapDuration   = time; });
        xf.sub('db:stepDuration',     time => { self.stepDuration  = time; });
        xf.sub('db:intervalIndex',   index => { self.intervalIndex = index; });
        xf.sub('db:stepIndex',       index => { self.stepIndex     = index; });
        xf.sub('db:watchStatus',     state => { self.state         = state; });
        xf.sub('db:workoutStatus',   state => {
            self.stateWorkout = state;

            if(self.isWorkoutDone()) {
                xf.dispatch('watch:lap');
                // reset to slope mode 0% when workout is done
                xf.dispatch('ui:slope-target-set', 0);
                xf.dispatch('ui:mode-set', ControlMode.sim);
                console.log(`Workout done!`);
            }
        });
        xf.sub('db:power1s', self.onPower1s.bind(this));
        xf.sub('db:sources', self.onSources.bind(this));
        timer.addEventListener('message', self.onTick.bind(self));
    }
    isStarted()        { return this.state        === 'started'; };
    isPaused()         { return this.state        === 'paused'; };
    isStopped()        { return this.state        === 'stopped'; };
    isWorkoutStarted() { return this.stateWorkout === 'started'; };
    isWorkoutDone()    { return this.stateWorkout === 'done'; };
    isIntervalType(type) {
        return equals(this.intervalType, type);
    }
    onSources(value) {
        this.autoPause = value.autoPause ?? false;
    }
    onPower1s(power) {
        if(!this.autoPause) { return; }

        if(power === 0 && this.isStarted()) {
            this.autoPauseCounter += 1;
        } else {
            this.autoPauseCounter = 0;
        }

        // print.log(`:auto-pause-counter ${this.autoPauseCounter} ${this.hasBeenAutoPaused}`);

        if(this.autoPauseCounter >= 4) {
            this.autoPauseCounter = 0;
            xf.dispatch(`ui:watchPause`);
            this.hasBeenAutoPaused = true;
        }

        if(power > 40 && this.hasBeenAutoPaused) {
            xf.dispatch(`ui:watchResume`);
        }
    }
    start() {
        const self = this;
        if(self.isStarted() && !self.isWorkoutStarted()) {
            self.pause();
        } else {
            // self.timer = setInterval(self.onTick.bind(self), 1000);
            timer.postMessage('start');
            xf.dispatch('watch:started');

            xf.dispatch('watch:event', {
                timestamp: Date.now(),
                type: EventType.start,
            });
        }
    }
    startWorkout() {
        const self = this;

        if(self.isWorkoutStarted() || self.isWorkoutDone()) {
            return;
        }

        let intervalTime = 0;
        let stepTime     = 0;

        if(exists(self.intervals)) {
            intervalTime = self.intervals[0]?.duration ?? 0;
            stepTime     = self.intervals[0]?.steps[0].duration ?? 0;

            xf.dispatch('watch:intervalIndex',  0);
            xf.dispatch('watch:stepIndex', 0);

            xf.dispatch('workout:started');

            xf.dispatch('watch:intervalDuration', intervalTime);
            xf.dispatch('watch:stepDuration',     stepTime);
            xf.dispatch('watch:lapTime',          intervalTime);
            xf.dispatch('watch:stepTime',         stepTime);
        }

        if(exists(self.points)) {
            self.intervalType = 'distance';
        }

        if(!self.isStarted()) {
            self.start();
        }
    }
    restoreWorkout() {
        const self = this;

        if(self.isWorkoutStarted()) {
            xf.dispatch('workout:started');
        }
        if(self.isStarted()) {
            self.pause();
        }
    }
    resume() {
        const self = this;
        if(!self.isStarted()) {
            // self.timer = setInterval(self.onTick.bind(self), 1000);
            timer.postMessage('start');
            xf.dispatch('watch:started');

            xf.dispatch('watch:event', {
                timestamp: Date.now(),
                type: EventType.start,
            });

            this.hasBeenAutoPaused = false;
        }
    }
    pause() {
        const self = this;
        timer.postMessage('pause');
        xf.dispatch('watch:paused');

        xf.dispatch('watch:event', {
            timestamp: Date.now(),
            type: EventType.stop,
        });
    }
    stop() {
        const self = this;
        if(self.isStarted() || self.isPaused()) {
            // clearInterval(self.timer);
            timer.postMessage('stop');

            xf.dispatch('watch:stopped');

            xf.dispatch('watch:event', {
                timestamp: Date.now(),
                type: EventType.stop,
            });

            if(self.isWorkoutStarted()) {
                xf.dispatch('workout:stopped');
            }

            self.lap();

            if(exists(self.intervals)) {
                xf.dispatch('watch:intervalIndex', 0);
                xf.dispatch('watch:stepIndex',     0);
            }
            xf.dispatch('watch:elapsed', 0);
            xf.dispatch('watch:lapTime', 0);
        }
    }
    onTick() {
        const self   = this;
        let elapsed  = self.elapsed + 1;
        let lapTime  = self.lapTime;
        let stepTime = self.stepTime;

        if(self.isWorkoutStarted() && !equals(self.stepTime, 0)) {
            lapTime  -= 1;
            stepTime -= 1;
        } else {
            lapTime  += 1;
        }

        if(equals(lapTime, 4) && stepTime > 0) {
            xf.dispatch('watch:beep');
        }
        xf.dispatch('watch:elapsed',  elapsed);
        xf.dispatch('watch:lapTime',  lapTime);
        xf.dispatch('watch:stepTime', stepTime);

        if(self.isWorkoutStarted() &&
           (stepTime <= 0) &&
            this.isIntervalType('duration')) {

            self.step();
        }
    }
    lap() {
        const self = this;

        if(self.isWorkoutStarted()) {
            let i             = self.intervalIndex;
            let s             = self.stepIndex;
            let intervals     = self.intervals;
            let moreIntervals = i < (intervals.length - 1);

            if(moreIntervals) {
                i += 1;
                s  = 0;

                self.nextInterval(intervals, i, s);
                self.nextStep(intervals, i, s);
            } else {
                xf.dispatch('workout:done');
            }
        } else {
            xf.dispatch('watch:lap');
            xf.dispatch('watch:lapTime', 0);
        }
    }
    step() {
        const self        = this;
        let i             = self.intervalIndex;
        let s             = self.stepIndex;
        let intervals     = self.intervals;
        let steps         = intervals[i].steps;
        let moreIntervals = i < (intervals.length  - 1);
        let moreSteps     = s < (steps.length - 1);

        if(moreSteps) {
            s += 1;
            self.nextStep(intervals, i, s);
        } else if (moreIntervals) {
            i += 1;
            s  = 0;

            self.nextInterval(intervals, i, s);
            self.nextStep(intervals, i, s);
        } else {
            xf.dispatch('workout:done');
        }
    }
    nextInterval(intervals, intervalIndex, stepIndex) {
        if(exists(intervals[intervalIndex].duration)) {
            return this.nextDurationInterval(intervals, intervalIndex, stepIndex);
        }
        return undefined;
    }
    nextStep(intervals, intervalIndex, stepIndex) {
        if(this.isDurationStep(intervals, intervalIndex, stepIndex)) {
            this.intervalType = 'duration';
            return this.nextDurationStep(intervals, intervalIndex, stepIndex);
        }
        return undefined;
    }
    back() {
        const self = this;

        if(self.isWorkoutStarted()) {
            let i             = self.intervalIndex;
            let s             = self.stepIndex;
            let intervals     = self.intervals;
            let lessIntervals = (i - 1) >= 0;

            if(lessIntervals) {
                i -= 1;
                s  = 0;

                self.nextInterval(intervals, i, s);
                self.nextStep(intervals, i, s);
            }
        } else {
            xf.dispatch('watch:lap');
            xf.dispatch('watch:lapTime', 0);
        }
    }

    isDurationStep(intervals, intervalIndex, stepIndex) {
        return exists(intervals[intervalIndex].steps[stepIndex].duration);
    }
    nextDurationInterval(intervals, intervalIndex, stepIndex) {
        const intervalDuration = this.intervalsToDuration(intervals, intervalIndex);
        const stepDuration     = this.intervalsToStepDuration(intervals, intervalIndex, stepIndex);
        this.dispatchInterval(intervalDuration, intervalIndex);
    }
    nextDurationStep(intervals, intervalIndex, stepIndex) {
        const stepDuration = this.intervalsToStepDuration(intervals, intervalIndex, stepIndex);
        this.dispatchStep(stepDuration, stepIndex);
    }
    intervalsToDuration(intervals, intervalIndex) {
        return intervals[intervalIndex].duration;
    }
    intervalsToStepDuration(intervals, intervalIndex, stepIndex) {
        const steps = intervals[intervalIndex].steps;
        return steps[stepIndex].duration;
    }
    dispatchInterval(intervalDuration, intervalIndex) {
        xf.dispatch('watch:intervalDuration', intervalDuration);
        xf.dispatch('watch:lapTime',          intervalDuration);
        xf.dispatch('watch:intervalIndex',    intervalIndex);
        xf.dispatch('watch:lap');
    }
    dispatchStep(stepDuration, stepIndex) {
        xf.dispatch('watch:stepDuration', stepDuration);
        xf.dispatch('watch:stepTime',     stepDuration);
        xf.dispatch('watch:stepIndex',    stepIndex);
        xf.dispatch('watch:step');
    }
}

// Register DB Events
xf.reg('watch:lapDuration',    (time, db) => db.intervalDuration = time);
xf.reg('watch:stepDuration',   (time, db) => db.stepDuration     = time);
xf.reg('watch:lapTime',        (time, db) => db.lapTime          = time);
xf.reg('watch:stepTime',       (time, db) => db.stepTime         = time);
xf.reg('watch:intervalIndex', (index, db) => db.intervalIndex    = index);
xf.reg('watch:stepIndex',     (index, db) => {
    db.stepIndex         = index;
    const intervalIndex  = db.intervalIndex;
    const powerTarget    = db.workout.intervals[intervalIndex].steps[index].power;
    const slopeTarget    = db.workout.intervals[intervalIndex].steps[index].slope;
    const cadenceTarget  = db.workout.intervals[intervalIndex].steps[index].cadence;
    const distanceTarget = db.workout.intervals[intervalIndex].steps[index].distance;

    if(exists(slopeTarget)) {
        xf.dispatch('ui:slope-target-set', slopeTarget);
        if(!equals(db.mode, ControlMode.sim)) {
            xf.dispatch('ui:mode-set', ControlMode.sim);
        }
    }
    if(exists(distanceTarget)) {
        xf.dispatch('ui:distance-target-set', distanceTarget);
    }
    if(exists(cadenceTarget)) {
        xf.dispatch('ui:cadence-target-set', cadenceTarget);
    } else {
        xf.dispatch('ui:cadence-target-set', 0);
    }
    if(exists(powerTarget)) {
        xf.dispatch('ui:power-target-set', models.ftp.toAbsolute(powerTarget, db.ftp));
        if(!exists(slopeTarget) && !equals(db.mode, ControlMode.erg)) {
            xf.dispatch('ui:mode-set', ControlMode.erg);
        }
    } else {
        xf.dispatch('ui:power-target-set', 0);
    }
});
xf.reg('workout:started', (x, db) => db.workoutStatus = 'started');
xf.reg('workout:stopped', (x, db) => db.workoutStatus = 'stopped');
xf.reg('workout:done',    (x, db) => db.workoutStatus = 'done');
xf.reg('watch:started',   (x, db) => {
    db.watchStatus = 'started';
    if(db.lapStartTime === false) {
        db.lapStartTime = Date.now(); // if first lap
    }
});
xf.reg('watch:paused',  (x, db) => db.watchStatus = 'paused');
xf.reg('watch:stopped', (x, db) => db.watchStatus = 'stopped');

xf.reg('watch:elapsed', (x, db) => {
    if(equals(db.watchStatus, TimerStatus.stopped)) {
        db.elapsed   = x;
        return;
    };

    db.elapsed   = x;

    const speed = equals(db.sources.virtualState, 'speed') ?
                  db.speed :
                  db.speedVirtual;

    const record = {
        timestamp:  Date.now(),
        power:      db.power1s,
        cadence:    db.cadence,
        speed:      speed,
        heart_rate: db.heartRate,
        distance:   db.distance,
        grade:      db.slopeTarget,
        altitude:   db.altitude,
        position_lat:                 db.position_lat,
        position_long:                db.position_long,
        saturated_hemoglobin_percent: db.smo2,
        total_hemoglobin_conc:        db.thb,
        core_temperature:             db.coreBodyTemperature,
        skin_temperature:             db.skinTemperature,
        device_index:                 0,
    };

    db.records.push(record);
    db.lap.push(record);

    if(equals(db.elapsed % 60, 0)) {
        models.session.backup(db);
        console.log(`backing up of ${db.records.length} records ...`);
    }
});
xf.reg('watch:lap', (x, db) => {
    let timeEnd   = Date.now();
    let timeStart = db.lapStartTime;
    let elapsed   = timeDiff(timeStart, timeEnd);

    if(elapsed > 0) {
        const lap = {
            timestamp:        timeEnd,
            start_time:       timeStart,
            totalElapsedTime: elapsed,
            avgPower:         db.powerLap,
            maxPower:         max(db.lap, 'power'),
            avgCadence:       Math.round(avg(db.lap, 'cadence')),
            avgHeartRate:     Math.round(avg(db.lap, 'heart_rate')),
            saturated_hemoglobin_percent: toFixed(avg(db.lap, 'saturated_hemoglobin_percent'), 2),
            total_hemoglobin_conc: toFixed(avg(db.lap, 'total_hemoglobin_conc'), 2),
            core_temperature: toFixed(avg(db.lap, 'core_temperature'), 2),
            skin_temperature: toFixed(avg(db.lap, 'skin_temperature'), 2)
        };

        db.laps.push(lap);
        db.lap = [];
    }
    db.lapStartTime = timeEnd + 0;
});

xf.reg('watch:event', (x, db) => {
    if(!empty(db.events) && equals(last(db.events).type, x.type)) return;

    db.events.push(x);
});

const watch = new Watch();

xf.sub('ui:workoutStart', e => { watch.startWorkout();   });
xf.sub('ui:watchStart',   e => { watch.start();          });
xf.sub('workout:restore', e => { watch.restoreWorkout(); });
xf.sub('ui:watchPause',   e => { watch.pause();          });
xf.sub('ui:watchResume',  e => { watch.resume();         });
xf.sub('ui:watchLap',     e => { watch.lap();            });
xf.sub('ui:watchBack',    e => { watch.back();           });
xf.sub('ui:watchStop',    e => {
    const stop = confirm('Confirm Stop?');
    if(stop) {
        watch.stop();
    }
});

export { watch };
