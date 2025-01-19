import { xf, exists, existance, empty, equals, mavg,
         first, second, last, clamp, toFixed, isArray,
         isString, isObject } from '../functions.js';

import { inRange, dateToDashString } from '../utils.js';

import { LocalStorageItem } from '../storage/local-storage.js';
import { idb } from '../storage/idb.js';
import { uuid } from '../storage/uuid.js';

import API from './api.js';
import { workouts as workoutsFile }  from '../workouts/workouts.js';
import { zwo } from '../workouts/zwo.js';
import { fileHandler } from '../file.js';
import { Model as Cycling } from '../physics.js';
import { fit } from '../fit/fit.js';

import { Device, Status, ControlMode, } from '../ble/enums.js';

class Model {
    constructor(args = {}) {
        this.init(args);
        this.prop      = args.prop;
        this.default   = existance(args.default, this.defaultValue());
        this.prev      = args.default;
        this.set       = existance(args.set, this.defaultSet);
        this.parser    = existance(args.parser, this.defaultParse);
        this.isValid   = existance(args.isValid, this.defaultIsValid);
        this.onInvalid = existance(args.onInvalid, this.defaultOnInvalid);
        this.storage   = this.defaultStorage();
        this.postInit(args);
    }
    init() { return; }
    postInit() { return; }
    defaultValue() { return ''; }
    defaultIsValid(value) { return exists(value); }
    defaultSet(value) {
        const self = this;
        if(self.isValid(value)) {
            self.state = value;
            // console.log(`${this.prop} : ${this.state}`);
            return value;
        } else {
            self.defaultOnInvalid(value);
            return self.default;
        }
    }
    defaultParse(value) {
        return value;
    }
    defaultOnInvalid(x) {
        const self = this;
        console.error(`Trying to set invalid ${self.prop}. ${typeof x}`, x);
    }
    defaultStorage() {
        const self = this;
        return {add: ((x)=>x),
                restore: ((_)=> self.default)};
    }
    backup(value) {
        const self = this;
        self.storage.set(value);
    }
    restore() {
        const self = this;
        return self.parser(self.storage.restore());
    }
}

class Power extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 2500);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
}

class HeartRate extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 255);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        const self = this;
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
}

class Cadence extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 255);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
}

class Speed extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 120);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        return (Number.isInteger(value) || Number.isFloat(value)) &&
                inRange(self.min, self.max, value);
    }
    kmhToMps(kmh) {
        return kmh / 3.6;
    }
    mpsToKmh(mps) {
        return mps * 3.6;
    }
    mpsToMph(mps) {
        return mps * 2.23693629;
    }
    kmhToMph(kmh) {
        return kmh * 0.621371192;
    }
}

class SmO2 extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 100);
        this.zones = {
            one: 30,
            two: 70,
            three: 100,
        };
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        return inRange(self.min, self.max, value);
    }
}

class THb extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 400);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        return inRange(self.min, self.max, value);
    }
}

class Sources extends Model {
    postInit(args = {}) {
        const self = this;
        self.state = self.default;
        xf.sub('db:sources', value => self.state = value);

        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
            parse: JSON.parse,
            encode: JSON.stringify
        };

        self.storage = new args.storage(storageModel);
    }
    defaultSet(target, source) {
        return Object.assign(target, source);
    }
    isSource(path, value) {
        const self = this;
        if(exists(self.state[path])) {
            return equals(self.state[path], value);
        }
        return false;
    }
    defaultValue() {
        const sources = {
            power:        'ble:controllable',
            cadence:      'ble:controllable',
            speed:        'ble:controllable',
            control:      'ble:controllable',
            heartRate:    'ble:heartRateMonitor',
            smo2:         'ble:smo2',
            thb:          'ble:smo2',
            coreBodyTemperature: 'ble:coreTemp',
            skinTemperature:     'ble:coreTemp',
            virtualState: 'power',
            autoPause:    false,
            theme:        'DARK'
        };
        return sources;
    }
}

class Target extends Model {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 100);
        this.step = existance(args.step, 1);
    }
    defaultValue() { return 0; }
    defaultIsValid(value) {
        const self = this;
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
    defaultSet(value) {
        const self = this;
        if(isNaN(value)) {
            self.onInvalid();
            return self.default;
        }
        return clamp(self.min, self.max, self.parse(value));
    }
    parse(value) { return parseInt(value); }
    inc(value) {
        const self = this;
        const x = value + self.step;
        return self.set(x);
    }
    dec(value) {
        const self = this;
        const x = value - self.step;
        return self.set(x);
    }
}

class Volume extends Target {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
            parse: parseInt,
        };
        self.min = existance(args.min, 0);
        self.max = existance(args.max, 100);
        self.step = existance(args.max, 10);
        self.storage = new args.storage(storageModel);
    }
    defaultValue() { return 0; }
    mute() {
        const self = this;
        return self.set(self.min);
    }
}

class PowerTarget extends Target {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 4000);
        this.step = existance(args.step, 10);
    }
}

class ResistanceTarget extends Target {
    postInit(args = {}) {
        this.min = existance(args.min, -100);
        this.max = existance(args.max, 100);
        this.step = existance(args.step, 10);
    }
    parse(value) { return parseInt(value); }
}

class SlopeTarget extends Target {
    postInit(args = {}) {
        this.min = existance(args.min, -40);
        this.max = existance(args.max, 40);
        this.step = existance(args.step, 0.5);
    }
    defaultIsValid(value) {
        const self = this;
        return Number.isFloat(value) && inRange(self.min, self.max, value);
    }
    parse(value) { return parseFloat(value); }
}

class CadenceTarget extends Target {
    postInit(args = {}) {
        this.min = existance(args.min, 0);
        this.max = existance(args.max, 255);
        this.step = existance(args.step, 5);
    }
    parse(value) { return parseInt(value); }
}

class Mode extends Model {
    postInit(args) {
        this.state = this.defaultValue();
        this.values = Object.values(ControlMode);
    }
    defaultValue() { return ControlMode.erg; }
    defaultIsValid(value) { return this.values.includes(value); }
}

class Page extends Model {
    postInit(args) {
        this.values = ['settings', 'home', 'workouts'];
    }
    defaultValue() { return 'home'; }
    defaultIsValid(value) { return this.values.includes(value); }
}

class FTP extends Model {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
            parse: parseInt,
        };
        self.state       = self.default;
        self.min         = existance(args.min, 0);
        self.max         = existance(args.max, 500);
        self.storage     = args.storage(storageModel);
        self.zones       = existance(args.zones, self.defaultZones());
        self.percentages = existance(args.percentages, self.defaultPercentages());
        self.minAbsValue = 9;
    }
    defaultValue() { return 200; }
    defaultIsValid(value) {
        const self = this;
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
    defaultZones() {
        return ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    }
    defaultPercentages() {
        return {'one': 0.54, 'two': 0.75, 'three': 0.87, 'four': 0.94, 'five': 1.05, 'six': 1.20};
    }
    toRelative(value, ftp) {
        const self = this;
        if(value > self.minAbsValue) return toFixed(value / ftp, 2);
        return value;
    }
    toAbsolute(value, ftp) {
        const self = this;
        if(value < self.minAbsValue) return parseInt(value * (ftp ?? self.state));
        return value;
    }
    powerToZone(value, ftp, zones) {
        const self = this;
        if(!exists(ftp)) ftp = self.state;
        if(!exists(zones)) zones = self.zones;

        let index = 0;
        let name = zones[index];
        if(value < (ftp * self.percentages.one)) {
            index = 0;
            name = zones[index];
        } else if(value < (ftp * self.percentages.two)) {
            index = 1;
            name = zones[index];
        } else if(value < (ftp * self.percentages.three)) {
            index = 2;
            name = zones[index];
        } else if(value < (ftp * self.percentages.four)) {
            index = 3;
            name = zones[index];
        } else if(value < (ftp * self.percentages.five)) {
            index = 4;
            name = zones[index];
        } else if (value < (ftp * self.percentages.six)) {
            index = 5;
            name = zones[index];
        } else {
            index = 6;
            name = zones[index];
        }
        return {name, index};
    }
    zoneToColor(zone) {
        if(equals(zone, 'one'))   return '#636468';
        if(equals(zone, 'two'))   return '#328AFF';
        if(equals(zone, 'thee'))  return '#44A5AB';
        if(equals(zone, 'four'))  return '#57C057';
        if(equals(zone, 'five'))  return '#F8C73A';
        if(equals(zone, 'six'))   return '#FF663A';
        if(equals(zone, 'seven')) return '#FE340B';
        return '#636468';
    }
    percentageToZone(value) {
        const self = this;
        const zones = self.zones;
        if(value < (self.percentages.one)) {
            return zones[0];
        } else if(value < (self.percentages.two)) {
            return zones[1];
        } else if(value < (self.percentages.three)) {
            return zones[2];
        } else if(value < (self.percentages.four)) {
            return zones[3];
        } else if(value < (self.percentages.five)) {
            return zones[4];
        } else if (value < (self.percentages.six)) {
            return zones[5];
        } else {
            return zones[6];
        }
        return zones[0];
    }
}

class Weight extends Model {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
            parse: parseInt,
        };
        self.min = existance(args.min, 0);
        self.max = existance(args.max, 500);
        self.storage = new args.storage(storageModel);
    }
    defaultValue() { return 75; }
    defaultIsValid(value) {
        const self = this;
        return Number.isInteger(value) && inRange(self.min, self.max, value);
    }
}

class Theme extends Model {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
        };
        self.storage = new args.storage(storageModel);
        self.values = ['dark', 'light'];
    }
    defaultValue() { return 'dark'; }
    defaultIsValid(value) { return this.values.includes(value); }
    switch(theme) {
        const self = this;
        if(equals(theme, first(self.values))) return second(self.values);
        if(equals(theme, second(self.values))) return first(self.values);
        self.onInvalid(theme);
        return self.default;
    }
}
class Measurement extends Model {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
        };
        self.storage = new args.storage(storageModel);
        self.values = ['metric', 'imperial'];
    }
    defaultValue() { return 'metric'; }
    defaultIsValid(value) { return this.values.includes(value); }
    switch(theme) {
        const self = this;
        if(equals(theme, first(self.values))) return second(self.values);
        if(equals(theme, second(self.values))) return first(self.values);
        self.onInvalid(theme);
        return self.default;
    }
}

class DataTileSwitch extends Model {
    postInit(args = {}) {
        const self = this;
        const storageModel = {
            key: self.prop,
            fallback: self.defaultValue(),
        };
        self.storage = new args.storage(storageModel);
        this.values = [0, 1, 2];
    }
    defaultValue() { return 0; }
    defaultIsValid(value) { return this.values.includes(value); }
    defaultParse(value) {
        return parseInt(value);
    }
}


class Activity extends Model {
    // var activity = {
    //         id: UUID,
    //         blob: Blob,
    //         summary: {
    //             timestamp: Int,
    //             duration: Int,
    //             name: String,
    //             status: {
    //                 strava: String,
    //                 intervals: String,
    //                 trainingPeaks: String,
    //             }
    //         },
    // };

    name = 'activity';
    postInit(args) {
        this.api = args.api;
        this.capacity = 3;
    }
    defaultValue() { return []; }
    createFromCurrent(db) {
        const id = uuid();
        const blob = fileHandler.toBlob(this.encode(db));
        const name = db.workout?.meta?.name ?? 'Powered by Auuki workout';

        const summary = {
            id,
            timestamp: Date.now(),
            name,
            duration: db.elapsed ?? 0,
            status: {strava: 'none', intervals: 'none', trainingPeaks: 'none'},
        };
        const record = {
            id,
            blob,
            summary,
        };

        this.add(summary, db.activity);
        idb.put('activity', record);
        xf.dispatch('activity:add', summary);
    }
    add(activity, activityList) {
        activityList.unshift(activity);
        if(activityList.length > this.capacity) {
            const summary = activityList.pop();
            idb.remove('activity', summary.id);
        }
        return activityList;
    }
    remove(id) {
        idb.remove('activity', id);
    }
    async upload(service, id) {
        let record = await idb.get('activity', id);

        if(service === 'strava' ||
           service === 'intervals' ||
           service === 'trainingPeaks') {

            const res = await this.api[service].uploadWorkout(record);
            record = await idb.get('activity', id);
            record.summary.status[service] = res.substring(1);
            await idb.put('activity', record);

            xf.dispatch(`action:activity:${id}`, `:${service}:upload${res}`);
        }
        return;
    }
    async download(id) {
        const self = this;
        const record = await idb.get('activity', id);
        fileHandler.download()(
            record.blob,
            self.fileName(record.summary.timestamp),
            fileHandler.Type.OctetStream
        );
    }
    fileName(timestamp) {
        return `workout-${dateToDashString(new Date(timestamp))}.fit`;
    }
    encode(db) {
        const records = db.records;
        const laps = db.laps;
        const events = db.events;

        return fit.localActivity.encode({
            records,
            laps,
            events,
        });
    }
    async restore() {
        const records = await idb.getAll('activity') ?? [];

        // migrate summary.status String to {strava: String, intervals: String}
        records.forEach((record) => {
            if(typeof record.summary.status === 'string') {
                console.log(`:activity :migrating `, record.id);
                record.summary.status = {strava: 'none', intervals: 'none'};
                idb.put('activity', record);
            }
        });

        return records
            .map((record) => record.summary)
            .sort((a, b) => b.timestamp - a.timestamp);
    }
}

// TODO:
// - differentiate between Workout and Activity
// - this model should hold methods related to working on a Workout as memeber of the
//   workout list or as the current selected workout
// - Activity is about the current active recording, session, and the list of actities
//   which are just recorded data or .fit format, Workout is about .zwo format
class Workout extends Model {
    postInit(args = {}) {
        const self = this;
        self.api = args.api;
    }
    // state init
    defaultValue() { return this.parse((first(workoutsFile))); }
    defaultIsValid(value) {
        return exists(value);
    }
    restore(db) {
        return first(db.workouts);
    }
    // accessors
    find(workouts, id) {
        for(let workout of workouts) {
            if(equals(workout.id, id)) {
                return workout;
            }
        }
        console.error(`tring to get a missing workout: ${id}`, workouts);
        return first(workouts);
    }
    // parsers
    parse(result, name = '') {
        if(isArray(result) || isObject(result)) {
            const view = new DataView(result);
            const courseJS = fit.localCourse.decode(view, name);
            console.log(courseJS);
            return courseJS;
        }
        return zwo.readToInterval(result);
    }
    fromIntervalsEvent(event) {
        const workout = this.parse(atob(event.workout_file_base64));
        workout.meta.planned = true;
        workout.id = uuid();
        workout.intervals_id = event.id;
        return workout;
    }
    fromIntervalsResponse(response) {
        return response.map(this.fromIntervalsEvent.bind(this));
    }
    async readFromFile(file) {
        const result = await fileHandler.read(file);
        return {result, name: file.name};
    }
    encode(db) {
        const records = db.records;
        const laps = db.laps;
        const events = db.events;

        return fit.localActivity.encode({
            records,
            laps,
            events,
        });
    }
    // utils
    fileName () {
        return `workout-${dateToDashString(new Date())}.fit`;
    }
    download(db) {
        fileHandler.download()(this.encode(db), this.fileName(), fileHandler.Type.OctetStream);
    }
    send(db) {
        // TODO: remove the whole method
        const name = this.fileName();
        const blob = fileHandler.toBlob(this.encode(db));

        this.api.strava.uploadWorkout(blob);

        return {
            name,
            blob,
        };
    }
}

// TODO:
// - rename to Libarary
// - use to just manage the library list of workouts
class Workouts extends Model {
    name = 'workouts';

    init(args) {
        const self = this;
        self.workoutModel = args.workoutModel;
    }
    defaultValue() {
        const self = this;
        return workoutsFile.map((w) => Object.assign(self.workoutModel.parse(w), {id: uuid()}));
    }
    defaultIsValid(value) {
        const self = this;
        return exists(value);
    }
    async restore(db) {
        const self = this;
        const workouts = await idb.getAll(`${self.name}`) ?? [];

        if(empty(workouts)) {
            return self.default;
        } else {
            return self.default.concat(workouts);
        }
    }
    get(workouts, id) {
        for(let workout of workouts) {
            if(equals(workout.id, id)) {
                return workout;
            }
        }
        console.error(`tring to get a missing workout: ${id}`, workouts);
        return first(workouts);
    }
    add(workouts, workout) {
        const self = this;
        workouts.push(idb.setId(workout));
        self.save(workout);
        return workouts;
    }
    save(workout) {
        const self = this;
        console.log(`:models :workouts :save`);
        idb.put(self.name, idb.setId(workout));
    }
    remove(workouts, id) {
        const self = this;
        if(!exists(id)) {
            console.error(`:models :workouts :remove 'called without workout id!'`);
            return workouts;
        }
        if(empty(workout)) {
            console.error(`:models :workouts :remove 'called with empty id!'`);
            return workouts;
        }
        idb.remove(self.name, id);
        return workouts.filter((w) => w.id !== id);
    }
}

function yesterdayOrOlder(timestamp) {
    return new Date().getDate() - new Date(timestamp).getDate() > 0;
}

// TODO:
// - standardize the methods
class Planned {
    name = 'planned';
    constructor(args = {}) {
        const self = this;
        this.data = this.defaultValue();
        this.workoutModel = args.workoutModel;
        this.storage = LocalStorageItem({
            key: 'planned',
            encode: JSON.stringify,
            parse: JSON.parse,
            fallback: this.defaultValue(),
        });
    }
    defaultValue() {
        return {workouts: [], modified: {}};
    }
    get(id) {
        for(let workout of this.data.workouts) {
            if(workout.id === id) {
                return workout;
            }
        }
        console.error(`tring to get a missing planned workout: ${id}`);
        return first(this.data.workouts);
    }
    setWorkouts(workouts) {
        this.data.workouts = workouts;
    }
    list() {
        return this.data.workouts;
    }
    setModified(service = 'intervals') {
        this.data.modified[service] = Date.now();
    }
    isEmpty() {
        return this.data.workouts.length === 0;
    }
    restore() {
        console.log(':planned :restore');

        this.data = this.storage.restore();

        if(yesterdayOrOlder(this.data.modified.intervals)) {
            console.log(`:planned :outdated :calling :wod 'intervals'`);
            this.wod('intervals');
            return;
        }

        console.log(`:planned :up-to-date`);
        xf.dispatch(`action:planned`, ':data');
    }
    backup() {
        this.storage.set(this.data);
        xf.dispatch(`action:planned`, ':data');
    }
    // forse refresh the wod data
    async wod(service) {
        const self = this;
        if(service === 'intervals') {
            const response = await api.intervals.wod();
            const workouts = self.workoutModel.fromIntervalsResponse(response);

            this.setWorkouts(workouts);
            this.setModified(service);
            this.backup();

            if(!this.isEmpty()) {
                const id = first(this.data.workouts).id;
                xf.dispatch(`action:li:${id}`, ':select');
            }
        }
    }
}

function Session(args = {}) {
    let name = 'session';

    function backup(db) {
        idb.put('session', idb.setId(dbToSession(db), 0));
    }

    async function restore(db) {
        const sessions = await idb.getAll(`${name}`);
        xf.dispatch(`${name}:restore`, sessions);
        console.log(`:idb :restore '${name}' :length ${sessions.length}`);

        let session = last(sessions);

        if(!empty(sessions)) {
            if(session.elapsed > 0) {
                sessionToDb(db, session);
            } else {
                idb.clear(`${name}`);
            }
        }
    }

    function sessionToDb(db, session) {
        return Object.assign(db, session);
    }

    function dbToSession(db) {
        const session = {
            // Watch
            elapsed: db.elapsed,
            lapTime: db.lapTime,
            stepTime: db.stepTime,
            intervalIndex: db.intervalIndex,
            stepIndex: db.stepIndex,
            intervalDuration: db.intervalDuration,
            stepDuration: db.stepDuration,
            lapStartTime: db.lapStartTime,
            watchStatus: db.watchStatus,
            workoutStatus: db.workoutStatus,

            // Course
            courseIndex: db.courseIndex,
            speedVirtual: db.speedVirtual,
            speed: db.speed,

            // Recording
            records: db.records,
            laps: db.laps,
            events: db.events,
            lap: db.lap,
            distance: db.distance,
            altitude: db.altitude,
            position_lat: db.position_lat,
            position_long: db.position_long,

            // Avg State
            kcal: db.kcal,
            powerLap: db.powerLap,
            cadenceLap: db.cadenceLap,
            heartRateLap: db.heartRateLap,
            powerAvg: db.powerAvg,
            cadenceAvg: db.cadenceAvg,
            heartRateAvg: db.heartRateAvg,
            powerLapCount: db.powerLapCount,
            cadenceLapCount: db.cadenceLapCount,
            heartRateLapCount: db.heartRateLapCount,
            powerAvgCount: db.powerAvgCount,
            cadenceAvgCount: db.cadenceAvgCount,
            heartRateAvgCount: db.heartRateAvgCount,

            // Report
            powerInZone: db.powerInZone,

            // Workouts
            workout: db.workout,
            mode: db.mode,
            page: db.page,

            // Targets
            powerTarget: db.powerTarget,
            resistanceTarget: db.resistanceTarget,
            slopeTarget: db.slopeTarget,

            // sources: db.sources,

            // UI options
            powerSmoothing: db.powerSmoothing,
        };

        return session;
    }

    return Object.freeze({
        backup,
        restore,
        sessionToDb,
        dbToSession,
    });
}

class MetaProp {
    constructor(args = {}) {
        const self = this;
        this.init(args);
        this.prop     = args.prop ?? this.getDefaults().prop;
        this.disabled = args.default ?? this.getDefaults().disabled;
        this.default  = args.default ?? this.getDefaults().default;
        this.state    = args.state ?? this.default;
        this.name     = args.name ?? `meta-prop`;
        this.propName = self.toCamelCase(args.name) ?? `metaProp`;
        this.postInit(args);
        this.start();
    }
    init(args) {
        return args;
    }
    postInit(args = {}) {
        return args;
    }
    getPropValue(propValue) {
        return propValue;
    }
    getState() {
        return this.format(this.state);
    }
    setState(propValue) {
        return this.updateState(propValue);
    }
    format(state) {
        return state;
    }
    start() {
        this.subs();
    }
    stop() {
        this.unsubs();
    }
    toCamelCase(str) {
        if(exists(str)) {
            return str.replace(/-([a-z])/g, function (g) {
                return g[1].toUpperCase();
            });
        }
        return str;
    }
    subs() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };
        this.subsConfig();
    }
    subsConfig() { return; }
    unsubs() {
        this.abortController.abort();
    }
    onUpdate(propValue) {
        if(this.shouldUpdate(propValue)) {
            this.updateState(propValue);
        }
    }
    shouldUpdate() {
        return true;
    }
    updateState(value) {
        this.state = value;
        return this.state;
    }
}

class PropAccumulator extends MetaProp {
    postInit(args = {}) {
        this.event = args.event ?? this.getDefaults().event;
        this.count = this.getDefaults().count;
        this.prev  = this.getDefaults().prev;
    }
    getDefaults() {
        return {
            value: 0,
            prev: 0,
            default: 0,
            disabled: false,
            prop: '',

            event: '',
            prev: 0,
            count: 0,
        };
    }
    format(state) {
        return Math.round(state);
    }
    reset() { this.count = 0; }
    subsConfig() {
        if(!equals(this.prop, '')) {
            xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        }
        if(!equals(this.event, '')) {
            xf.sub(`${this.event}`, this.onEvent.bind(this), this.signal);
        }
    }
    updateState(value) {
        if(this.state === 0 && value === 0) {
            this.state = 0;
        } else if(value === 0) {
            return this.state;
        } else {
            this.count += 1;
            const value_c = value;
            const value_p = this.prev;
            const count_c = this.count;
            const count_p = this.count-1;
            this.state = mavg(value_c, value_p, count_c, count_p);
            this.prev = this.state;

        }
        return this.state;
    }
    onEvent() {
        this.reset();
    }
    restore(db) {
        this.count = db[this.propName+"Count"] ?? this.count;
        this.state = db[this.propName] ?? this.state;
        this.prev = db[this.propName] ?? this.prev;
    }
}

class KcalAccumulator extends PropAccumulator {
    updateState(power) {
        this.state = this.state + power * 0.001;
        return this.state;
    }
}

const powerLap = new PropAccumulator({
    event: 'watch:lap',
    name: 'power-lap',
});
const powerAvg = new PropAccumulator({
    event: 'watch:stopped',
    name: 'power-avg',
});
const kcal = new KcalAccumulator({
    event: 'watch:stopped',
    name: 'kcal',
});

const cadenceLap = new PropAccumulator({
    event: 'watch:lap',
    name: 'cadence-lap',
});
const cadenceAvg = new PropAccumulator({
    event: 'watch:stopped',
    name: 'cadence-avg',
});

const heartRateLap = new PropAccumulator({
    event: 'watch:lap',
    name: 'heart-rate-lap',
});
const heartRateAvg = new PropAccumulator({
    event: 'watch:stopped',
    name: 'heart-rate-avg',
});



class PropInterval {
    constructor(args = {}) {
        const self = this;
        this.default     = existance(args.default, this.getDefaults().default);
        this.state       = existance(args.state, this.getDefaults().default);
        this.accumulator = existance(args.accumulator, this.getDefaults().accumulator);
        this.count       = existance(args.count, this.getDefaults().count);
        this.prop        = existance(args.prop, this.getDefaults().prop);
        this.effect      = existance(args.effect, this.getDefaults().effect);
        this.interval    = existance(args.interval, this.getDefaults().interval);
        this.start();
    }
    getDefaults() {
        const self = this;
        return {
            default: 0,
            accumulator: 0,
            count: 0,
            interval: 1000,
            prop: '',
            effect: '',
        };
    }
    start() {
        this.subs();
        this.intervalId = setInterval(this.onInterval.bind(this), this.interval);
    }
    stop() {
        clearInterval(this.intervalId);
        this.unsubs();
    }
    reset() {
        this.accumulator = 0;
        this.count = 0;
    }
    subs() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    unsubs() {
        this.abortController.abort();
    }
    onUpdate(propValue) {
        this.accumulator += propValue;
        this.count += 1;
    }
    onInterval() {
        if(equals(this.count, 0)) return;

        this.state = this.accumulator / this.count;
        xf.dispatch(`${this.effect}`, this.state);
        this.reset();
    }
}

class PowerInZone {
    constructor(args = {}) {
        const self = this;
        this.ftpModel = existance(args.ftpModel);
        this.default  = existance(args.default, this.getDefaults().default);
        this.count    = existance(args.count,   this.getDefaults().count);
        this.weights  = existance(args.weights, this.getDefaults().weights);
        this.state    = existance(args.state,   this.getDefaults().default);
        this.prop     = existance(args.prop,    this.getDefaults().prop);
        this.start();
    }
    getDefaults() {
        const self = this;
        const value = self.ftpModel.zones.map(x => [0,0]);
        const weights = self.ftpModel.zones.map(x => 0);

        return {
            default: value,
            weights: weights,
            count: 0,
            prop: 'db:elapsed',
        };
    }
    start() {
        this.subs();
    }
    stop() {
        this.unsubs();
    }
    subs() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.reg(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    unsubs() {
        this.abortController.abort();
    }
    onUpdate(propValue, db) {
        this.updateState(db.power);
    }
    powerToZone(power) {
        return this.ftpModel.powerToZone(power);
    }
    updateState(value) {
        if(equals(value, 0)) return this.state;

        const zone = this.powerToZone(value);

        this.count += 1;
        this.weights[zone.index] += 1;

        for(let i=0; i < this.state.length; i++) {
            if(!equals(this.weights[i], 0)) {
                this.state[i] = [this.weights[i] / this.count, this.weights[i]];
            }
        }

        xf.dispatch('powerInZone', this.state);
        return this.state;
    }
}

class VirtualState extends MetaProp {
    postInit() {
        this.speed           = this.getDefaults().speed;
        this.altitude        = this.getDefaults().altitude;
        this.distance        = this.getDefaults().distance;
        this.ascent          = this.getDefaults().ascent;

        this.slope           = this.getDefaults().slope;
        this.riderWeight     = this.getDefaults().riderWeight;
        this.equipmentWeight = this.getDefaults().equipmentWeight;
        this.mass            = this.getDefaults().mass;

        this.source          = this.getDefaults().source;
        this.cycling         = Cycling({
            rho:             1.275,
            dragCoefficient: 0.88,   // 1.0, 0.88
            frontalArea:     0.36,   // 0.4, 0.36
            CdA:             0.3168, // 0.4, 0.3168
        });
        this.lastUpdate      = undefined;
    }
    getDefaults() {
        return {
            riderWeight: 75,
            equipmentWeight: 10,
            mass: 85,
            slope: 0.00,

            speed: 0,
            altitude: 0,
            distance: 0,
            ascent: 0,

            prop: 'power',
            source: 'power',
            disabled: false,
            default: 0,
        };
    }
    subs() {
        xf.reg(`${this.prop}`,  this.onUpdate.bind(this), this.signal);
        xf.sub(`db:sources`,    this.onSources.bind(this), this.signal);
        xf.sub(`db:weight`,     this.onWeight.bind(this), this.signal);
        xf.sub('watch:started', this.onStarted.bind(this), this.signal);
    }
    onSources(sources) {
        if(!equals(this.source, sources.virtualState)) {
            this.lastUpdate = Date.now();
        }

        this.source = sources.virtualState;
    }
    onWeight(weight) {
        this.riderWeight = weight;
        this.systemWeight = this.riderWeight + this.equipmentWeight;
    }
    onStarted() {
        this.lastUpdate = Date.now();
    }
    onUpdate(power, db) {
        if(!equals(this.source, this.prop)) return;

        // Take into acount the pauses
        const now = Date.now();
        const dt  = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        if(equals(dt, 0)) {
            console.warn(`dt: ${dt}, s: ${this.speed}`);
            return;
        };

        const { speed, distance, altitude, ascent } = this.cycling.virtualSpeedCF({
            power:    db.power,
            slope:    db.slopeTarget / 100,
            distance: db.distance,
            altitude: db.altitude,
            ascent:   db.ascent,
            mass:     this.mass,
            speed:    this.speed,
            dt:       isNaN(dt) ? 1/4 : dt,
        });

        this.speed = speed;

        // xf.dispatch('speedVirtual', (speed * 3.6));
        xf.dispatch('speedVirtual', speed);
        xf.dispatch('distance', distance);
        xf.dispatch('altitude', altitude);
        xf.dispatch('ascent', ascent);
    }
}

class SpeedState extends VirtualState {
    getDefaults() {
        return {
            prop: 'speed',
            source: 'power',
            disabled: false,
            default: 0,

            riderWeight: 75,
            equipmentWeight: 10,
            mass: 85,
            slope: 0.00,

            speed: 0,
            altitude: 0,
            distance: 0,
        };
    }
    onUpdate(speed, db) {
        if(!equals(this.source, this.prop)) return;

        const now = Date.now();
        const dt  = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        const { distance, altitude, ascent } = this.cycling.trainerSpeed({
            slope:     db.slopeTarget / 100,
            // speed:     db.speed / 3.6,
            speed:     db.speed,
            distance:  db.distance,
            altitude:  db.altitude,
            ascent:    db.ascent,
            speedPrev: this.speedPrev,
            mass:      this.mass,
            dt:        isNaN(dt) ? 1/4 : dt,
        });

        // this.speedPrev = speed / 3.6;
        this.speedPrev = speed;

        xf.dispatch('distance', distance);
        xf.dispatch('altitude', altitude);
        xf.dispatch('ascent', ascent);
    }
}

class TSS {
    // TSS = (t * NP * IF) / (FTP * 3600) * 100
    // NP:
    // 1. Calculate a rolling 30-second average power for the workout or
    //    specific section of data
    // 2. Raise the resulting values to the fourth power.
    // 3. Determine the average of these values.
    // 4. Find the fourth root of the resulting average.
    // IF = NP / FTP
}


const api = API();

const power = new Power({prop: 'power'});
const cadence = new Cadence({prop: 'cadence'});
const heartRate = new HeartRate({prop: 'heartRate'});
const speed = new Speed({prop: 'speed'});
const smo2 = new SmO2({prop: 'smo2'});
const thb = new THb({prop: 'thb'});
const sources = new Sources({prop: 'sources', storage: LocalStorageItem});

const virtualState = new VirtualState();
const speedState   = new SpeedState();

const powerTarget = new PowerTarget({prop: 'powerTarget'});
const resistanceTarget = new ResistanceTarget({prop: 'resistanceTarget'});
const slopeTarget = new SlopeTarget({prop: 'slopeTarget'});
const cadenceTarget = new CadenceTarget({prop: 'cadenceTarget'});
const mode = new Mode({prop: 'mode'});
const page = new Page({prop: 'page'});

const ftp = new FTP({prop: 'ftp', storage: LocalStorageItem});
const weight = new Weight({prop: 'weight', storage: LocalStorageItem});
const theme = new Theme({prop: 'theme', storage: LocalStorageItem});
const volume = new Volume({prop: 'volume', storage: LocalStorageItem});
const measurement = new Measurement({prop: 'measurement', storage: LocalStorageItem});
const dataTileSwitch = new DataTileSwitch({prop: 'dataTileSwitch', storage: LocalStorageItem});

const power1s = new PropInterval({prop: 'db:power', effect: 'power1s', interval: 1000});
const power3s = new PropInterval({prop: 'db:power', effect: 'power3s', interval: 3000});
const powerInZone = new PowerInZone({ftpModel: ftp});

const activity = new Activity({prop: 'activity', api: api});
const workout = new Workout({prop: 'workout', api: api});
const workouts = new Workouts({prop: 'workouts', workoutModel: workout});
const planned = new Planned({prop: 'planned', workoutModel: workout, api: api});

const session = Session();

let models = {
    power,
    heartRate,
    cadence,
    speed,
    smo2,
    thb,
    sources,

    virtualState,

    power1s,
    power3s,
    powerLap,
    powerAvg,
    powerInZone,
    kcal,

    heartRateLap,
    heartRateAvg,

    cadenceLap,
    cadenceAvg,

    powerTarget,
    resistanceTarget,
    slopeTarget,
    cadenceTarget,

    mode,
    page,
    ftp,
    weight,
    volume,
    theme,
    measurement,
    dataTileSwitch,

    activity,
    workout,
    workouts,
    planned,
    session,

    PropInterval,

    api,
};

export { models };
