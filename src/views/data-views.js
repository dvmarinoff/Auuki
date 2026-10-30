import { xf, exists, existance, validate, equals, isNumber, last, empty, avg, toFixed, formatDate, } from '../functions.js';
import { formatTime } from '../utils.js';
import { models } from '../models/models.js';
import { DialogMsg } from '../models/enums.js';


//
// DataView
//
// Usage:
// <data-view id="count-value" prop="db:count">--</data-view>
//
// Template Method:
// overwrite methods to augment the general logic
//
// getDefaults() -> setup default and fallback values
// config()      -> work with attributes and props here
// subs()        -> subscribe to events or db
// unsubs()      -> executes after abort signal
// getValue()    -> getter for the value for state from a complex prop say an object or array
// onUpdate()    -> determine the rules for state update that will trigger rendering
// transform()   -> apply transforming functions to state just before rendering
//
class DataView extends HTMLElement {
    constructor() {
        super();
        this.state = '';
        this.postInit();
    }
    postInit() { return; }
    static get observedAttributes() {
        return ['disabled'];
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if(equals(name, 'disabled')) {
            this.disabled = exists(newValue) ? true : false;
        }
    }
    getDefaults() {
        return { prop: '', };
    }
    config() {
        return;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.prop     = existance(this.getAttribute('prop'), this.getDefaults().prop);
        this.disabled = this.hasAttribute('disabled');

        this.config();
        this.subs();
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
        this.unsubs();
    }
    unsubs() {}
    getValue(propValue) {
        return propValue;
    }
    shouldUpdate(value) {
        return !equals(value, this.state) && !this.disabled;
    }
    updateState(value) {
        this.state = value;
    }
    onUpdate(propValue) {
        const value = this.getValue(propValue);

        if(this.shouldUpdate(value)) {
            this.updateState(value);
            this.render();
        }
    }
    transform(state) {
        return state;
    }
    render() {
        this.textContent = this.transform(this.state);
    }
}

customElements.define('data-view', DataView);


class AutoStartCounter extends HTMLElement {
    constructor() {
        super();
        this.isVisible = false;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.sub('ui:autoStartCounter', this.onUpdate.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onUpdate(value) {
        if(value === -1) {
            this.hide();
        } else {
            if(!this.isVisible) {
                this.show();
            }
            this.render(value);
        }
    }
    show() {
        this.classList.add('active');
    }
    hide() {
        this.classList.remove('active');
    }
    render(value) {
        this.textContent = value;
    }
}

customElements.define('auto-start-counter', AutoStartCounter);

class ModeLockToggle extends HTMLElement {
    constructor() {
        super();
        this.isOn = false;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };
        this.$icon = this.querySelector('.mode-lock--toggle--icon');
        this.$use = this.querySelector('use');

        this.addEventListener('pointerup', this.onPointerup.bind(this), this.signal);
        xf.sub('db:lock', this.onUpdate.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onUpdate(value) {
        this.isOn = value;
        this.render();
    }
    onPointerup() {
        xf.dispatch('ui:lock-set');
    }
    render() {
        if(this.isOn) {
            this.$use.setAttribute('href', '#icon--lock--close');
        } else {
            this.$use.setAttribute('href', '#icon--lock--open');
        }
    }
}

customElements.define('mode-lock-toggle', ModeLockToggle);


class TimerTime extends DataView {
    getDefaults() {
        return {
            format: 'hh:mm:ss',
            prop:   'db:elapsed',
        };
    }
    config() {
        this.format = existance(this.getAttribute('format'), this.getDefaults().format);
    }
    transform(state) {
        return formatTime({value: this.state, format: this.format, unit: 'seconds'});
    }
}

customElements.define('timer-time', TimerTime);


class IntervalTime extends DataView {
    getDefaults() {
        return {
            format: 'mm:ss',
            prop:   'db:lapTime',
        };
    }
    config() {
        this.format = existance(this.getAttribute('format'), this.getDefaults().format);
    }
    transform(state) {
        return formatTime({value: this.state, format: this.format, unit: 'seconds'});
    }
}

customElements.define('interval-time', IntervalTime);

class SpeedValue extends DataView {
    postInit() {
        this.measurement = this.getDefaults().measurement;
    }
    getDefaults() {
        return {
            prop: 'db:speed',
            measurement: 'metric',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        xf.sub(`db:measurement`, this.onMeasurement.bind(this), this.signal);
    }
    onMeasurement(measurement) {
        this.measurement = measurement;
    }
    format(value, measurement = 'metric') {
        if(equals(measurement, 'imperial')) {
            value = `${models.speed.mpsToMph(value).toFixed(1)}`;
        } else {
            value = `${(models.speed.mpsToKmh(value)).toFixed(1)}`;
        }
        return value;
    }
    transform(state) {
        return this.format(state, this.measurement);
    }
}

customElements.define('speed-value', SpeedValue);

class SpeedVirtual extends SpeedValue {
    getDefaults() {
        return {
            prop: 'db:speedVirtual',
            measurement: 'metric',
        };
    }
}

customElements.define('speed-virtual', SpeedVirtual);

class SpeedSwitch extends SpeedValue {
    postInit() {
        this.measurement = this.getDefaults().measurement;
    }
    getDefaults() {
        return {
            prop: '',
            measurement: 'metric',
        };
    }
    subs() {
        xf.sub(`db:speed`,        this.onSpeed.bind(this), this.signal);
        xf.sub(`db:speedVirtual`, this.onSpeedVirtual.bind(this), this.signal);
        xf.sub(`db:measurement`,  this.onMeasurement.bind(this), this.signal);
        xf.sub(`db:sources`,      this.onSources.bind(this), this.signal);
    }
    onSpeed(value) {
        if(equals(this.source, 'speed')) this.onUpdate(value);
    }
    onSpeedVirtual(value) {
        if(equals(this.source, 'power')) this.onUpdate(value);
    }
    onSources(sources) {
        this.source = sources.virtualState;
    }
}

customElements.define('speed-switch', SpeedSwitch);


class DistanceValue extends DataView {
    postInit() {
        this.measurement = this.getDefaults().measurement;
    }
    getDefaults() {
        return {
            prop: 'db:distance',
            measurement: 'metric',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        xf.sub(`db:measurement`, this.onMeasurement.bind(this), this.signal);
    }
    onMeasurement(measurement) {
        this.measurement = measurement;
    }
    metersToYards(meters) {
        return 1.09361 * meters;
    }
    format(meters, measurement = 'metric') {
        let value   = `0`;
        const km    = (meters / 1000);
        const miles = (meters / 1609.34);
        const yards = this.metersToYards(meters);

        if(equals(measurement, 'imperial')) {
            const yardsTemplate = `${(this.metersToYards(meters)).toFixed(0)}`;
            const milesTemplate = `${miles.toFixed(2)}`;
            return value = (yards < 1609.34) ? yardsTemplate : milesTemplate;
        } else {
            const metersTemplate = `${meters.toFixed(0)}`;
            const kmTemplate = `${km.toFixed(2)}`;
            return value = (meters < 1000) ? metersTemplate : kmTemplate;
        }
    }
    transform(state) {
        return this.format(state, this.measurement);
    }
}

customElements.define('distance-value', DistanceValue);


class AltitudeValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:altitude',
        };
    }
    transform(state) {
        return (state).toFixed(1);
    }
}

customElements.define('altitude-value', AltitudeValue);


class AscentValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:ascent',
        };
    }
    transform(state) {
        return (state).toFixed(1);
    }
}

customElements.define('ascent-value', AscentValue);


class CadenceValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:cadence',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('cadence-value', CadenceValue);

class CadenceLapValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:cadenceLap',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('cadence-lap-value', CadenceLapValue);

class CadenceAvgValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:cadenceAvg',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('cadence-avg-value', CadenceAvgValue);


class CadenceTarget extends DataView {
    getDefaults() {
        return {
            prop: 'db:cadenceTarget',
        };
    }
    transform(state) {
        if(equals(state, 0)) {
            return '';
        }

        return state;
    }
}

customElements.define('cadence-target', CadenceTarget);


class CadenceGroup extends DataView {
    getDefaults() {
        return {
            prop: 'db:cadenceTarget',
        };
    }
    config() {
        this.$main = this.querySelector('cadence-value');
        this.$aux = this.querySelector('cadence-target');
    }
    render() {
        if(equals(this.state, 0)) {
            this.$main.classList.remove('active');
            this.$aux.classList.remove('active');
        } else {
            this.$main.classList.add('active');
            this.$aux.classList.add('active');
        }
    }
}

customElements.define('cadence-group', CadenceGroup);


class HeartRateValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:heartRate',
        };
    }
    transform(state) {
        this.style = 'color: #FE340B';
        return Math.round(state);
    }
}

customElements.define('heart-rate-value', HeartRateValue);

class HeartRateLapValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:heartRateLap',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('heart-rate-lap-value', HeartRateLapValue);

class HeartRateAvgValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:heartRateAvg',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('heart-rate-avg-value', HeartRateAvgValue);

class HeartRateMaxValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:heartRateMax',
        };
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('heart-rate-max-value', HeartRateMaxValue);


class SmO2Value extends DataView {
    getDefaults() {
        return {
            prop: 'db:smo2',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }

    // this.style = 'color: #2A5F97';
    // this.style = 'color: #278B65';
    // this.style = 'color: #D72A1C';
    transform(state) {
        // if(state < models.smo2.zones.one) {
        //     this.style = 'color: #328AFF';
        // } else if(state < models.smo2.zones.two) {
        //     this.style = 'color: #56C057';
        // } else {
        //     this.style = 'color: #FE340B';
        // }
        this.style = 'color: #56C057';
        return toFixed(state, 1);
    }
}

customElements.define('smo2-value', SmO2Value);


class THbValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:thb',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        this.style = 'color: #FF663A';
        return toFixed(state, 2);
    }
}

customElements.define('thb-value', THbValue);


class CoreBodyTemperatureValue extends DataView {
    postInit() {
        this.measurement = this.getDefaults().measurement;
    }
    getDefaults() {
        return {
            prop: 'db:coreBodyTemperature',
            measurement: 'metric',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        xf.sub(`db:measurement`, this.onMeasurement.bind(this), this.signal);
    }
    onMeasurement(measurement) {
        this.measurement = measurement;
    }
    celsiusToFahrenheit(celsius) {
        return Math.round(((celsius * 9/5) + 32) * 100) / 100;
    }
    format(temperature, measurement = 'metric') {
        if(equals(measurement, 'imperial')) {
            return this.celsiusToFahrenheit(temperature);
        }

        if(equals(measurement, 'metric')) {
            return toFixed(temperature);
        }

        return toFixed(temperature);
    }
    transform(state) {
        return this.format(state, this.measurement);
    }
}

customElements.define('core-body-temperature-value', CoreBodyTemperatureValue);


class SkinTemperatureValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:skinTemperature',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        return toFixed(state, 2);
    }
}

customElements.define('skin-temperature-value', SkinTemperatureValue);


class WorkoutTextEvent extends DataView {
    getDefaults() {
        return {
            prop: 'db:workoutTextEvent',
        };
    }
    render() {
        const message = this.transform(this.state);

        this.textContent = message;

        if(empty(message)) {
            this.classList.remove('active');
        } else {
            this.classList.add('active');
        }
    }
}

customElements.define('workout-text-event', WorkoutTextEvent);



class WorkoutName extends DataView {
    getDefaults() {
        return {
            prop: 'db:workout',
        };
    }
    getValue(propValue) {
        return propValue.meta.name;
    }
}

customElements.define('workout-name', WorkoutName);


class PowerTarget extends DataView {
    getDefaults() {
        return {
            prop: 'db:powerTarget',
        };
    }
}

customElements.define('power-target', PowerTarget);

class PowerTargetFTP extends DataView {
    getDefaults() {
        return {
            prop: 'db:powerTarget',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        xf.sub(`db:ftp`,       this.onFTP.bind(this), this.signal);
    }
    onFTP(ftp) {
        this.ftp = ftp;
    }
    toPercentage(state, ftp) {
        return Math.round((state * 100) / ftp);
    }
    transform(state) {
        return `${this.toPercentage(state, this.ftp)}%`;
    }
}

customElements.define('power-target-ftp', PowerTargetFTP);

class CompanionGroup extends DataView {
    getDefaults() {
        return {
            prop: '',
            active: false,
        };
    }
    config() {
        this.$main = this.querySelector('.companion-main');
        this.$aux = this.querySelector('.companion-aux');
    }
    subs() {
        this.addEventListener(`pointerup`, this.onPointerup.bind(this), this.signal);
    }
    onPointerup() {
        this.active = !this.active;
        this.render();
    }
    render() {
        if(this.active) {
            this.$main.classList.add('active');
            this.$aux.classList.add('active');
        } else {
            this.$main.classList.remove('active');
            this.$aux.classList.remove('active');
        }
    }
}

customElements.define('companion-group', CompanionGroup);

class ZStack extends HTMLElement {
    constructor() {
        super();
        this.items = [];
        this.activeIndex = 0;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$items = this.querySelectorAll('z-stack-item');
        this.key = this.dataset.key;
        this.persistance = exists(this.key) ? true : false;
        this.hasSwitchSub = exists(this.dataset.sub);

        if(this.hasSwitchSub) {
            xf.sub(this.$sub, this.onSwitch.bind(this), this.signal);
        } else {
            this.addEventListener(`pointerup`, this.onSwitch.bind(this), this.signal);
        }

        if(this.persistance) {
            xf.sub(`db:sources`, this.onSources.bind(this), this.signal);
        }
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onSources(value) {
        const index = parseInt(value[this.key] ?? this.activeIndex);
        // console.log(`:onSources ${index} === ${this.activeIndex}`);
        if(index === this.activeIndex) return;
        this.activeIndex = index;
        this.render();
    }
    onSwitch() {
        this.incrementActive();
        this.render();

        if(this.persistance) {
            this.backup();
        }
    }
    backup() {
        const update = {};
        update[this.key] = this.activeIndex;
        xf.dispatch(`sources`, update);
    }
    incrementActive() {
        this.activeIndex = (this.activeIndex + 1) % Math.max(this.$items.length, 1);
    }
    render() {
        this.$items.forEach(($item, i) => {
            if(equals(i, this.activeIndex)) {
                $item.classList.add('active');
            } else {
                $item.classList.remove('active');
            }
        });
    }
}

customElements.define('z-stack', ZStack);


class SlopeTarget extends DataView {
    getDefaults() {
        return {
            prop: 'db:slopeTarget',
        };
    }
    transform(state) {
        return state.toFixed(1);
    }
}

customElements.define('slope-target', SlopeTarget);


class PowerTargetControl extends DataView {
    postInit() {
        const self = this;
        this.state = 0;
    }
    setDefaults() {
        this.prop = 'db:powerTarget';
        this.selectors = {
            input: '#power-target-input',
            inc:   '#power-target-inc',
            dec:   '#power-target-dec',
        };
        this.effects = {
            inc: 'power-target-inc',
            dec: 'power-target-dec',
            set: 'power-target-set',
        };
        this.parse = parseInt;
    }
    config() {
        this.setDefaults();
        this.$input = document.querySelector(this.selectors.input);
        this.$inc   = document.querySelector(this.selectors.inc);
        this.$dec   = document.querySelector(this.selectors.dec);
    }
    subs() {
        this.$input.addEventListener('change', this.onChange.bind(this), this.signal);
        this.$inc.addEventListener('pointerup', this.onInc.bind(this), this.signal);
        this.$dec.addEventListener('pointerup', this.onDec.bind(this), this.signal);

        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    onInc(e) {
        xf.dispatch(`ui:${this.effects.inc}`);
    }
    onDec(e) {
        xf.dispatch(`ui:${this.effects.dec}`);
    }
    onChange(e) {
        this.state = this.parse(e.target.value);
        xf.dispatch(`ui:${this.effects.set}`, this.state);
    }
    render() {
        this.$input.value = this.transform(this.state);
    }
}

customElements.define('power-target-control', PowerTargetControl);


class ResistanceTargetControl extends PowerTargetControl {
    setDefaults() {
        this.prop = 'db:resistanceTarget';
        this.selectors = {
            input: '#resistance-target-input',
            inc:   '#resistance-target-inc',
            dec:   '#resistance-target-dec',
        };
        this.effects = {
            inc: 'resistance-target-inc',
            dec: 'resistance-target-dec',
            set: 'resistance-target-set',
        };
        this.parse = parseInt;
    }
}

customElements.define('resistance-target-control', ResistanceTargetControl);


class SlopeTargetControl extends PowerTargetControl {
    setDefaults() {
        this.prop = 'db:slopeTarget';
        this.selectors = {
            input: '#slope-target-input',
            inc:   '#slope-target-inc',
            dec:   '#slope-target-dec',
        };
        this.effects = {
            inc: 'slope-target-inc',
            dec: 'slope-target-dec',
            set: 'slope-target-set',
        };
        this.parse = parseFloat;
    }
    transform(state) {
        return (state).toFixed(1);
    }
}

customElements.define('slope-target-control', SlopeTargetControl);


class PowerValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:power',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        this.style = 'color: #F8C73A';
        return Math.round(state);
    }
}

customElements.define('power-value', PowerValue);

class PowerAvg extends DataView {
    getDefaults() {
        return {
            prop: 'db:powerAvg',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        return Math.ceil(state);
    }
}

customElements.define('power-avg', PowerAvg);

class PowerLap extends DataView {
    getDefaults() {
        return {
            prop: 'db:powerLap',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        return Math.ceil(state);
    }
}

customElements.define('power-lap', PowerLap);

class KcalAvg extends DataView {
    getDefaults() {
        return {
            prop: 'db:kcal',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        return Math.round(state);
    }
}

customElements.define('kcal-avg', KcalAvg);

class VirtualGearValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:virtualGear',
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    transform(state) {
        if(equals(state, 0)) return '--';
        return state;
    }
}

customElements.define('virtual-gear', VirtualGearValue);

class PowerInZone extends HTMLElement {
    constructor() {
        super();
        this.state = [[0,0],[0,0],[0,0],[0,0], [0,0],[0,0],[0,0]];
        this.selectors = {
            values: '.power--zone-value',
            bars: '.power--zone-bar',
            btn: '.power--unit',
        };
        this.format = 'percentage';
        this.prop = 'db:powerInZone';
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$values = this.querySelectorAll(this.selectors.values);
        this.$bars = this.querySelectorAll(this.selectors.bars);
        this.$btn = this.querySelector(this.selectors.btn);

        this.$btn.addEventListener('pointerup', this.onSwitch.bind(this), this.signal);

        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onUpdate(propValue) {
        this.state = propValue;
        this.render();
    }
    onSwitch() {
        if(equals(this.format, 'time')) {
            this.format = 'percentage';
            this.$btn.textContent = '%';
            this.render();
        } else {
            this.format = 'time';
            this.$btn.textContent = 'min';
            this.render();
        }
    }
    render() {
        for(let i=0; i < this.state.length; i++) {
            let text;
            if(equals(this.format, 'percentage')) {
                 text = Math.round(this.state[i][0]*100);
            } else {
                 text = formatTime({value:Math.round(this.state[i][1]), format: 'mm:ss'});
            }
            const height = `${this.state[i][0]*100}%`;

            this.$values[i].textContent = text;
            this.$bars[i].style.height = height;
        }
    }
}

customElements.define('power-in-zone', PowerInZone);


class LapsList extends DataView {
    postInit() {
        this.isEmpty = true;
    }
    getDefaults() {
        return { prop: 'db:lap', };
    }
    config() {
        this.$lapsCont = this.querySelector('.laps--cont');
    }
    subs() {
        xf.reg(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    toLap(lap, index) {
        const duration = lap.totalElapsedTime;
        const powerLap = validate(
            [exists, isNumber],
            toFixed(lap.avgPower, 0),
            0,
        );
        const cadenceLap = validate(
            [exists, isNumber],
            toFixed(lap.avgCadence, 0),
            0,
        );
        const heartRateLap = validate(
            [exists, isNumber],
            toFixed(lap.avgHeartRate, 0),
            0,
        );
        const zone = models.ftp.powerToZone(powerLap).name;

        const smo2Lap = validate([exists, isNumber], lap.saturated_hemoglobin_percent, 0);
        const thbLap  = validate([exists, isNumber], lap.total_hemoglobin_conc, 0);
        const coreTemperatureLap = validate(
            [exists, isNumber],
            lap.core_temperature,
            0,
        );
        const skinTemperatureLap = validate(
            [exists, isNumber],
            lap.skin_temperature,
            0,
        );

        return `<div class="lap--item">
                    <div class="lap--item--inner">
                        <div class="lap--value lap--index">${index}</div>
                        <div class="lap--value lap--duration">${formatTime({value: duration, format: 'mm:ss'})}</div>
                        <div class="lap--value lap--power zone-${zone}-color">${powerLap} W</div>
                        <div class="lap--value lap--cadence">${cadenceLap}</div>
                        <div class="lap--value lap--heart-rate">${heartRateLap}</div>
                        <div class="lap--value lap--smo2">${smo2Lap.toFixed(2)}</div>
                        <div class="lap--value lap--thb">${thbLap.toFixed(2)}</div>
                        <div class="lap--value lap--core-temperature">${coreTemperatureLap.toFixed(2)}</div>
                        <div class="lap--value lap--skin-temperature">${skinTemperatureLap.toFixed(2)}</div>
                    </div>
                </div>`;
    }
    restore(laps) {
        this.state = laps;
        laps.forEach((lap, index) => this.render(lap, index+1));
    }
    onUpdate(propValue, db) {
        if(empty(db.laps)) {
            return;
        } else if(this.isEmpty) {
            this.restore(db.laps);
            this.isEmpty = false;
        } else {
            this.updateState(db.laps);
            this.render(last(db.laps), this.state.length);
        }

    }
    render(lap, i) {
        this.$lapsCont.insertAdjacentHTML('afterbegin', this.toLap(lap, i));
    }
}

customElements.define('laps-list', LapsList);


function scale(value, max = 100) {
    return 100 * (value/max);
}

class InstantPowerGraph extends HTMLElement {
    constructor() {
        super();
        this.value       = this.defaults().value;
        this.metricValue = this.defaults().metricValue;
        this.scaleFactor = this.defaults().scaleFactor;
        this.barsCount   = this.defaults().barsCount;
        this.scaleMax    = this.setScaleMax();
        this.model       = {};
        this.postInit();
    }
    postInit() {
        this.model  = models.ftp;
        this.prop   = 'power';
        this.metric = 'ftp';
    }
    defaults () {
        return {
            value:       0,
            barsCount:   0,
            metricValue: 200,
            scaleFactor: 1.6,
        };
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.graphWidth = this.calcGraphWidth();

        xf.sub(`db:${this.prop}`, this.onUpdate.bind(this), this.signal);
        xf.sub(`db:${this.metric}`, this.onMetric.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    calcGraphWidth() {
        return this.getBoundingClientRect().width;
    }
    onUpdate(value) {
        this.value = value;
        this.render();
    }
    onMetric(value) {
        this.metricValue = value;
        this.setScaleMax();
    }
    setScaleMax() {
        this.scaleMax = this.metricValue * this.scaleFactor;
    }
    bar(zone = 'one', height = 80, width = 1) {
        return `<div class="graph-bar zone-${zone}" style="height: ${height}%; width: ${width}px;"></div>`;
    }
    shift() {
        this.removeChild(this.childNodes[0]);
    }
    render() {
        const zone = models.ftp.powerToZone(this.value, this.metricValue).name;
        const barHeight = scale(this.value, this.scaleMax);
        if(this.barsCount >= this.graphWidth) {
            this.shift();
        }
        this.insertAdjacentHTML('beforeend', this.bar(zone, barHeight, 1));
        this.barsCount += 1;
    }
}

customElements.define('instant-power-graph', InstantPowerGraph);


class SwitchGroup extends HTMLElement {
    constructor() {
        super();
        this.state = 0;
        this.postInit();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$switchList = this.querySelectorAll('.switch-item');
        this.config();

        xf.sub(`db:${this.prop}`, this.onState.bind(this), this.signal);
        this.addEventListener('pointerup', this.onSwitch.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    eventOwner(e) {
        const path = e.composedPath();
        const pathLength = path.length;

        for(let i = 0; i < pathLength; i++) {
            if(exists(path[i].hasAttribute) &&
               path[i].hasAttribute('index')) {
                return path[i];
            }
        }

        return e.path[0];
    }
    onSwitch(e) {
        const element = this.eventOwner(e);

        if(exists(element.attributes.index)) {

            const id = parseInt(element.attributes.index.value) || 0;

            if(equals(id, this.state)) {
                return;
            } else {
                xf.dispatch(`${this.effect}`, id);
            }
        }
    }
    onState(state) {
        this.state = state;
        this.setSwitch(this.state);
        this.renderEffect(this.state);
    }
    setSwitch(state) {
        this.$switchList.forEach(function(s, i) {
            if(equals(i, state)) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    }
    // overwrite the rest to augment behavior
    postInit() {
        this.prop = '';
    }
    config() {
    }
    renderEffect(state) {
        return state;
    }
}

class DataTileSwitchGroup extends SwitchGroup {
    postInit() {
        this.prop = 'dataTileSwitch';
        this.effect = 'ui:data-tile-switch-set';
    }
    config() {
        this.$speed    = document.querySelector('#data-tile--speed');     // tab 0
        this.$distance = document.querySelector('#data-tile--distance');  // tab 0
        this.$powerAvg = document.querySelector('#data-tile--power-avg'); // tab 1
        this.$slope    = document.querySelector('#data-tile--slope');     // tab 1
        this.$smo2     = document.querySelector('#data-tile--smo2');      // tab 2
        this.$thb      = document.querySelector('#data-tile--thb');       // tab 2
        this.$coreBodyTemperature =
            document.querySelector('#data-tile--core-body-temperature');  // tab 3
        this.$skinTemperature =
            document.querySelector('#data-tile--skin-temperature');       // tab 3

        this.renderEffect(this.state);
    }
    renderEffect(state) {
        if(equals(state, 0)) {
            this.$speed.classList.add('active');
            this.$distance.classList.add('active');
            this.$slope.classList.add('active');
            this.$powerAvg.classList.add('active');

            this.$smo2.classList.remove('active');
            this.$thb.classList.remove('active');
            this.$coreBodyTemperature.classList.remove('active');
            this.$skinTemperature.classList.remove('active');
        }
        if(equals(state, 1)) {
            this.$smo2.classList.add('active');
            this.$thb.classList.add('active');
            this.$coreBodyTemperature.classList.add('active');
            this.$skinTemperature.classList.add('active');

            this.$speed.classList.remove('active');
            this.$distance.classList.remove('active');
            this.$powerAvg.classList.remove('active');
            this.$slope.classList.remove('active');
        }
        return;
    }
}

customElements.define('data-tile-switch-group', DataTileSwitchGroup);


class NavigationStack extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.tabs = {
            settings: {
                $view: document.querySelector(`#view--settings`),
                $link: document.querySelector(`#link--settings`),
                children: {
                    settings: {
                        $view: document.querySelector(`#view--settings-settings`),
                        $link: document.querySelector(`#link--settings-settings`),
                    },
                    profile: {
                        $view: document.querySelector(`#view--settings-profile`),
                        $link: document.querySelector(`#link--settings-profile`),
                    }
                }
            },
            home: {
                $view: document.querySelector(`#view--home`),
                $link: document.querySelector(`#link--home`),
            },
            workouts: {
                $view: document.querySelector(`#view--workouts`),
                $link: document.querySelector(`#view--workouts`),

                children: {
                    workouts: {
                        $view: document.querySelector(`#view--workouts-workouts`),
                        $link: document.querySelector(`#link--workouts-workouts`),
                    },
                    editor: {
                        $view: document.querySelector(`#view--workouts-editor`),
                        $link: document.querySelector(`#link--workouts-editor`),
                    },
                    report: {
                        $view: document.querySelector(`#view--workouts-report`),
                        $link: document.querySelector(`#link--workouts-report`),
                    }
                }
            },
        };
        xf.sub(`action:nav`, this.onAction.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onAction(action) {
        console.log(action);

        if(action === 'settings') {
            this.switch('settings', this.tabs);
            return;
        }
        if(action === 'home') {
            this.switch('home', this.tabs);
            return;
        }
        if(action === 'workouts') {
            this.switch('workouts', this.tabs);
            return;
        }

        if(action === 'settings:settings') {
            this.switch('settings', this.tabs.settings.children);
            return;
        }
        if(action === 'settings:profile') {
            this.switch('profile', this.tabs.settings.children);
            models.api.auth.loadTurnstile();
            return;
        }

        if(action === 'workouts:workouts') {
            this.switch('workouts', this.tabs.workouts.children);
            return;
        }
        if(action === 'workouts:editor') {
            this.switch('editor', this.tabs.workouts.children);
            return;
        }
        if(action === 'workouts:report') {
            this.switch('report', this.tabs.workouts.children);
            return;
        }
    }
    switch(target, elements) {
        // prevent potential content flash
        // by first removing and only after that adding .active
        // if there is no target element this is not an error,
        // it means all content should be 'non-active'
        for(let prop in elements) {
            if(!(target === prop)) {
                elements[prop].$view.classList.remove('active');
                elements[prop].$link.classList.remove('active');
            }
        }
        if(target) {
            elements[target].$view.classList.add('active');
            elements[target].$link.classList.add('active');
        }
    }
}

customElements.define('navigation-stack', NavigationStack);


// TODO:
// - use data-<prop name> properties instead of attributes
// - get them with this.dataset.<data name>
class ViewAction extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        const action = this.getAttribute('action');
        const topic = this.getAttribute('topic') ?? '';
        const on = this.getAttribute('on') ?? 'pointerup';
        const stopPropagation = this.hasAttribute('stoppropagation');

        if(action === undefined || action === '') {
            throw Error(`need to setup action attribute on view-action `, self);
        }

        this.addEventListener(on, (e) => {
            if(stopPropagation) {
                e.stopPropagation();
            }
            // console.log(`action${topic}`, action, stopPropagation);
            xf.dispatch(`action${topic}`, action);
            this.postAction();
        }, this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    postAction() {
    }
}

customElements.define('view-action', ViewAction);


class BatteryLevel extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.for = this.getAttribute('for');
        this.$level = this.querySelector('.battery--level');

        xf.sub(`${this.for}:batteryLevel`, this.onUpdate.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onUpdate(level) {
        this.$level.style.width = `${level}%`;

        this.classList.remove('ok');
        this.classList.remove('low');
        this.classList.remove('critical');

        if(level < 11) {
            this.classList.add('critical');
            return;
        }
        if(level < 21) {
            this.classList.add('low');
            return;
        }
        this.classList.add('ok');
    }
}

customElements.define('battery-level', BatteryLevel);


class NavigationAction extends ViewAction {
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
    }
    postAction() {
        // this.siblings = this.parentElement.querySelectorAll('navigation-action');
        // for(let sibling of this.siblings) {
        //     sibling.classList.remove('active');
        // }
        // this.classList.add('active');
    }
}

customElements.define('navigation-action', NavigationAction);


class OAuth extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };
        this.services = {strava: false, intervals: false};

        this.$stravaButton = self.querySelector('#strava--connect--button');
        this.$intervalsButton = self.querySelector('#intervals--connect--button');
        this.$tpButton = self.querySelector('#tp--connect--button');

        xf.sub('action:oauth', self.onAction.bind(this), this.signal);
        xf.sub('db:services', self.onServices.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onServices(value) {
        this.services = value;
        this.render(this.services);
    }
    onAction(action) {
        const self = this;
        console.log(action);

        let service = action.split(':')[1];

        if(service === 'strava' ||
           service === 'intervals' ||
           service === 'trainingPeaks') {

            console.log(this.services[service]);
            if(this.services[service]) {
                models.api[service].disconnect();
            } else {
                models.api[service].connect();
            }
            return;
        }
    }
    render(services) {
        if(exists(this.$stravaButton)) {
            this.$stravaButton.textContent = services.strava ? 'Disconnect' : 'Connect';
        }
        if(exists(this.$intervalsButton)) {
            this.$intervalsButton.textContent = services.intervals ? 'Disconnect' : 'Connect';
        }
        if(exists(this.$tpButton)) {
            this.$tpButton.textContent = services.tp ? 'Disconnect' : 'Connect';
        }
    }
}

customElements.define('o-auth', OAuth);




class ModalError extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$dialog = this.querySelector(`dialog`);
        this.$dismissBtn = this.querySelector(`.dialog--dismiss--btn`);
        this.$message = this.querySelector(`.dialog--message`);

        xf.sub(`ui:modal:error:open`, this.onOpen.bind(this), this.signal);
        this.$dismissBtn.addEventListener('pointerup', this.onClose.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onOpen(msg) {
        this.$dialog.showModal();
        this.$message.innerHTML = this.message(msg);
    }
    onClose(result) {
        this.$dialog.close();
    }
    message(msg) {
        if(msg === DialogMsg.noAuth) {
            return `Your session is over. You need to login again.`;
        };
        return '';
    }
}

customElements.define('modal-error', ModalError);


class MeasurementUnit extends DataView {
    getDefaults() {
        return {
            state: models.measurement.default,
            prop: 'db:measurement',
        };
    }
    formatUnit(measurement = models.measurement.default) {
        if(measurement === 'imperial') {
            return `lbs`;
        } else {
            return `kg`;
        }
    }
    transform(state) {
        return this.formatUnit(state);
    }
}

customElements.define('measurement-unit', MeasurementUnit);

class ThemeValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:theme',
        };
    }
}

customElements.define('theme-value', ThemeValue);

class MeasurementValue extends DataView {
    getDefaults() {
        return {
            prop: 'db:measurement',
        };
    }
}

customElements.define('measurement-value', MeasurementValue);


class VirtualStateSource extends DataView {
    postInit() {
        this.sources = ['power', 'speed'];
        this.source  = 'power';
        this.effect  = 'sources';
        this.state   = { virtualState: 'power' };
    }
    getDefaults() {
        return {
            prop: 'db:sources',
            effect: 'sources'
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        this.addEventListener('pointerup', this.onEffect.bind(this), this.signal);
    }
    onUpdate(value) {
        this.state = value.virtualState;
        this.render();
    }
    onEffect() {
        if(equals(this.state, 'power')) {
            xf.dispatch(`${this.effect}`, {virtualState: 'speed'});
        } else {
            xf.dispatch(`${this.effect}`, {virtualState: 'power'});
        }
    }
    render() {
        this.textContent = this.state;
    }
}

customElements.define('virtual-state-source', VirtualStateSource);


class AutoPause extends DataView {
    postInit() {
        this.effect  = 'sources';
        this.key     = 'autoPause';
        this.state   = { autoPause: false };
        this.values  = {on: {autoPause: true}, off: {autoPause: false}};
    }
    getDefaults() {
        return {
            prop: 'db:sources',
            effect: 'sources'
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        this.addEventListener('pointerup', this.onEffect.bind(this), this.signal);
    }
    onUpdate(value) {
        this.state = value[this.key];
        this.render();
    }
    onEffect() {
        if(equals(this.state, true)) {
            xf.dispatch(`${this.effect}`, this.values.off);
        } else {
            xf.dispatch(`${this.effect}`, this.values.on);
        }
    }
    render() {
        this.textContent = this.state ? 'On' : 'Off';
    }
}

customElements.define('auto-pause', AutoPause);

class AutoStart extends AutoPause {
    postInit() {
        this.effect  = 'sources';
        this.key     = 'autoStart';
        this.state   = { autoStart: true };
        this.values  = {on: {autoStart: true}, off: {autoStart: false}};
    }
}

customElements.define('auto-start', AutoStart);

class Theme extends DataView {
    postInit() {
        this.effect  = 'sources';
        this.state   = { theme: 'DARK' };
    }
    getDefaults() {
        return {
            prop: 'db:sources',
            effect: 'sources'
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        this.addEventListener('pointerup', this.onEffect.bind(this), this.signal);
    }
    onUpdate(value) {
        this.state = value.theme;
        this.render();
    }
    onEffect() {
        if(equals(this.state, 'DARK')) {
            xf.dispatch(`${this.effect}`, {theme: 'WHITE'});
        }else if (equals(this.state, 'WHITE')) {
            xf.dispatch(`${this.effect}`, {theme: 'AUTO'});
        } else {
            xf.dispatch(`${this.effect}`, {theme: 'DARK'});
        }
    }
    render() {
        this.textContent = equals(this.state, 'DARK') ? 'DARK' : equals(this.state, 'WHITE') ? 'WHITE' : 'AUTO';
        document.body.className =  equals(this.state, 'DARK') ? 'dark-theme' : equals(this.state, 'WHITE') ? 'white-theme' : 'auto-theme';
    }
}

customElements.define('theme-layout', Theme);

class DockModeDefault extends DataView {
    postInit() {
        this.effect  = 'dockMode';
        this.state   = false;
    }
    getDefaults() {
        return {
            prop: 'db:dockMode',
            effect: 'dockMode'
        };
    }
    subs() {
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
        this.addEventListener('pointerup', this.onEffect.bind(this), this.signal);
    }
    onUpdate(value) {
        this.state = value;
        this.render();
    }
    onEffect() {
        if(equals(this.state, true)) {
            xf.dispatch(`${this.effect}`, false);
        } else {
            xf.dispatch(`${this.effect}`, true);
        }
    }
    render() {
        this.textContent = equals(this.state, true) ? 'ON' : 'OFF';
    }
}

customElements.define('dock-mode-default', DockModeDefault);

class DockModeBtn extends DataView {
    subs() {
        this.addEventListener('pointerup', this.onSwitch.bind(this), this.signal);
    }
    onSwitch() {
        models.dockMode.open();
    }
}

customElements.define('dock-mode-btn', DockModeBtn);


class SoundControl extends DataView {
    postInit() {
        this.volume = 100;
        this.selectors = {
            mute:    '#sound--mute',
            down:    '#sound--down',
            up:      '#sound--up',
            volume:  '#sound--volume',
        };
    }
    getDefaults() {
        return { prop: 'db:volume', };
    }
    config() {
        this.$mute   = this.querySelector(this.selectors.mute);
        this.$down   = this.querySelector(this.selectors.down);
        this.$up     = this.querySelector(this.selectors.up);
        this.$volume = this.querySelector(this.selectors.volume);
    }
    subs() {
        this.$mute.addEventListener(`pointerup`, this.onMute.bind(this), this.signal);
        this.$down.addEventListener(`pointerup`, this.onDown.bind(this), this.signal);
        this.$up.addEventListener(`pointerup`, this.onUp.bind(this), this.signal);
        xf.sub(`${this.prop}`, this.onUpdate.bind(this), this.signal);
    }
    onMute() {
        xf.dispatch(`ui:volume-mute`);
    }
    onDown() {
        xf.dispatch(`ui:volume-down`);
    }
    onUp() {
        xf.dispatch(`ui:volume-up`);
    }
    render() {
        this.$volume.textContent = `${this.state}%`;
    }
}

customElements.define('sound-control', SoundControl);


class CompatibilityCheck extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        if(!self.compatible()) {
            self.show();
        }
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    compatible() {
        return 'bluetooth' in navigator;
    }
    show() {
        const self = this;
        this.innerHTML =
        `<div id="compatibility--cont">
             <p>This browser is NOT supported. Please open the app with </p>
             <a href="https://www.google.com/chrome/" target="_blank">Chrome</a> or
             <a href="https://www.microsoft.com/edge" target="_blank">Edge</a>
             <p>Please note that <b>iOS</b> is NOT supported at all, regardless of browser.</p>
             <p>For more information visit the project <a href="https://github.com/dvmarinoff/Flux" target="_blank">Page.</a></p>
         </div>`;
    }
    hide() {
        const self = this;
        this.innerHTML = '';
    }
}


customElements.define('compatibility-check', CompatibilityCheck);

export {
    DataView,

    TimerTime,
    IntervalTime,
    CadenceValue,
    CadenceLapValue,
    CadenceAvgValue,
    CadenceTarget,
    CadenceGroup,
    SpeedValue,
    DistanceValue,
    HeartRateValue,
    HeartRateLapValue,
    HeartRateAvgValue,
    SmO2Value,
    THbValue,
    PowerAvg,
    PowerValue,
    MeasurementUnit,
    ThemeValue,
    MeasurementValue,

    SlopeTarget,
    PowerTarget,

    WorkoutName,

    InstantPowerGraph,

    SwitchGroup,
    DataTileSwitchGroup,

    DockModeBtn,

    NavigationStack,
    ViewAction,
    BatteryLevel,
}
