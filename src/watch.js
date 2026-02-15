import { equals, exists, empty, first, last, xf, avg, max, toFixed, print, } from './functions.js';
import { kphToMps, mpsToKph, timeDiff, pad } from './utils.js';
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
        this.workoutType       = "workout";
        this.autoStartCounter  = 3;
        this.autoPauseCounter  = 0;
        this.hasBeenAutoPaused = false;
        this.autoPause         = true;
        this.autoStart         = true;
        this.init();
    }
    init() {
        const self = this;

        // Data subs
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
        xf.sub('db:workout',       workout => {
            self.intervals = workout.intervals;
            if(workout.meta.category?.toLowerCase().includes("test")) {
                self.workoutType = "test";
                // force turn off auto pausing for Test Category workouts
                xf.dispatch(`sources`, {autoPause: false});
            } else {
                self.workoutType = "workout";
            }
            console.log(`:workout :type ${self.workoutType}`);
        });
        xf.sub('db:power1s', self.onPower1s.bind(this));
        xf.sub('db:sources', self.onSources.bind(this));
        timer.addEventListener('message', self.onTick.bind(self));

        // UI subs
        xf.sub('ui:workoutStart', e => { self.startWorkout();   });
        xf.sub('ui:watchStart',   e => { self.start();          });
        xf.sub('workout:restore', e => { self.restoreWorkout(); });
        xf.sub('ui:watchPause',   e => { self.pause();          });
        xf.sub('ui:watchResume',  e => { self.resume();         });
        xf.sub('ui:watchLap',     e => { self.lap();            });
        xf.sub('ui:watchBack',    e => { self.back();           });
        xf.sub('ui:watchStop',    e => {
            const stop = confirm('Confirm Stop?');
            if(stop) {
                self.stop();
            }
        });
    }
    isStarted()        { return this.state        === 'started'; };
    isPaused()         { return this.state        === 'paused'; };
    isStopped()        { return this.state        === 'stopped'; };
    isWorkoutStarted() { return this.stateWorkout === 'started'; };
    isWorkoutDone()    { return this.stateWorkout === 'done'; };
    isIntervalType(type) {
        return equals(this.intervalType, type);
    }
    status() {
        return this.state;
    }
    onSources(value) {
        this.autoPause = value.autoPause ?? this.autoPause;
        this.autoStart = value.autoStart ?? this.autoStart;
    }
    onPower1s(power) {
        if(this.autoPause) {
            if(power === 0 && this.isStarted()) {
                this.autoPauseCounter += 1;
            } else {
                this.autoPauseCounter = 0;
            }

            if(this.autoPauseCounter >= 4) {
                this.autoPauseCounter = 0;
                xf.dispatch(`ui:watchPause`);
                this.hasBeenAutoPaused = true;
            }

            if(power > 40 && this.hasBeenAutoPaused) {
                xf.dispatch(`ui:watchResume`);
            }
        }

        if(this.autoStart && this.isStopped()) {
            // check
            if(this.autoStartCounter < 0) return;
            if(this.autoStartCounter === 0) {
                this.autoStartCounter = -1;
                xf.dispatch(`ui:watchStart`);
                xf.dispatch('ui:workoutStart');
                xf.dispatch(`ui:autoStartCounter`, -1);
                return;
            }
            // update
            if(power === 0) {
                this.autoStartCounter = 3;
                xf.dispatch(`ui:autoStartCounter`, this.autoStartCounter);
            }
            if(power > 40) {
                this.autoStartCounter -= 1;
                xf.dispatch(`ui:autoStartCounter`, this.autoStartCounter);
            }
        }
    }
    start() {
        const self = this;
        if(self.isStarted() && !self.isWorkoutStarted()) {
            self.pause();
        } else {
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

        // in case of pressing play button during auto start countdown
        this.autoStartCounter = -1;
        xf.dispatch(`ui:autoStartCounter`, -1);

        if(self.isWorkoutStarted() || (
            // check for intervalIndex allows for multiple workouts in one session
            self.isWorkoutDone() && self.intervalIndex > 0
        )) {
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
            timer.postMessage('stop');

            xf.dispatch('watch:event', {
                timestamp: Date.now(),
                type: EventType.stop,
            });


            if(self.isWorkoutStarted()) {
                xf.dispatch('workout:stopped');
            }

            self.lap();

            // should be called after event and lap are created
            xf.dispatch('watch:stopped');

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
            xf.dispatch('watch:beep', 'interval');
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

// These regs have access to the global db state and can mutate it
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
    const intensity      = existance(db.intensity, 100) / 100;

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
        xf.dispatch('ui:power-target-set', models.ftp.toAbsolute(powerTarget, db.ftp) * intensity);
        if(!exists(slopeTarget) && !equals(db.mode, ControlMode.erg)) {
            xf.dispatch('ui:mode-set', ControlMode.erg);
        }
    } else {
        xf.dispatch('ui:power-target-set', 0);
    }
});
xf.reg('watch:intensity', (intensity, db) => {
    db.intensity = intensity;
    const intervalIndex  = db.intervalIndex;
    const stepIndex      = db.stepIndex;
    const powerTarget    = db.workout?.intervals?.[intervalIndex]?.steps?.[stepIndex]?.power;

    if(exists(powerTarget)) {
        const i = existance(db.intensity, 100) / 100;
        xf.dispatch('ui:power-target-set', models.ftp.toAbsolute(powerTarget, db.ftp) * i);
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

xf.reg('watch:elapsed', models.session.elapsed);
xf.reg('watch:lap', models.session.lap);
xf.reg('watch:event', models.session.event);

const watch = new Watch();

export { watch };
