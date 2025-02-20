import { xf, exists, empty, equals, clamp, debounce, toFixed  } from '../functions.js';
import { formatTime, translate } from '../utils.js';
import { models } from '../models/models.js';
import { g } from './graph.js';

class MoxyGraph extends HTMLElement {
    constructor() {
        super();
        this.postInit();
    }
    postInit() {
        this.prop = {
            elapsed: 'watch:elapsed',
            smo2: 'db:smo2',
            thb: 'db:thb',
            heartRate: 'db:heartRate',
            power: 'db:power1s',
        };
        this.smo2 = {value: 0, x: 0, min: 0, max: 100};
        this.thb = {value: 0, x: 0, min: 8, max: 15};
        this.heartRate = {value: 0, x: 0, min: 30, max: 200};
        this.power = {value: 0, x: 0, min: 0, max: 600};
        this.path = {smo2: [], thb: [], heartRate: [], power: []};
        this.$path = {};
        this.xAxis = {min: 0, max: 100};
        this.yAxis = {min: 0, max: 100};
        this.step = 1;

        this.width = 0;
        this.x = 0;

        this.color = {
            smo2: '#57C057',
            thb: '#FF663A',
            heartRate: '#FE340B',
            power: '#F8C73A',
        };
        this.stroke = {
            width: 1,
        };
        this.selectors = {
            svg: '#moxy-svg',
            path: {
                smo2: '#moxy-path-smo2',
                thb: '#moxy-path-thb',
                heartRate: '#moxy-path-hr',
                power: '#moxy-path-power',
            },
        };
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$cont           = document.querySelector('#graph-power') ?? this;
        this.$svg            = this.querySelector(this.selectors.svg);
        this.$path.smo2      = this.querySelector(this.selectors.path.smo2);
        this.$path.thb       = this.querySelector(this.selectors.path.thb);
        this.$path.heartRate = this.querySelector(this.selectors.path.heartRate);
        this.$path.power     = this.querySelector(this.selectors.path.power);

        this.getWidth();

        this.$path.smo2.setAttribute('stroke', this.color.smo2);
        this.$path.thb.setAttribute('stroke', this.color.thb);
        this.$path.heartRate.setAttribute('stroke', this.color.heartRate);
        this.$path.power.setAttribute('stroke', this.color.power);

        xf.sub(`${this.prop.elapsed}`, this.onElapsed.bind(this), this.signal);
        xf.sub(`${this.prop.smo2}`, this.onSmO2.bind(this), this.signal);
        xf.sub(`${this.prop.thb}`, this.onTHb.bind(this), this.signal);
        xf.sub(`${this.prop.heartRate}`, this.onHeartRate.bind(this), this.signal);
        xf.sub(`${this.prop.power}`, this.onPower.bind(this), this.signal);
        window.addEventListener(`resize`, this.onResize.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    getWidth() {
        const width = this.$cont.getBoundingClientRect()?.width ?? window.innerWidth;
        this.width = width;
    }
    onResize() {
        this.getWidth();
    }
    onSmO2(value) {
        this.smo2.value = value;
    }
    onTHb(value) {
        if(equals(this.thb.value, 0)) {
            this.thb.min = value - 1;
            this.thb.max = value + 1;
        }
        this.thb.value = value;
        if(this.thb.value < this.thb.min) {
            this.thb.min = this.thb.value;
        }
        if(this.thb.value > this.thb.max) {
            this.thb.max = this.thb.value;
        }
    }
    onHeartRate(value) {
        this.heartRate.value = value;
    }
    onPower(value) {
        this.power.value = value;
    }
    onElapsed() {
        // first calculate
        for(let key in this.path) {
            this.calcStep(key);
        }

        // render all
        for(let key in this.path) {
            this.renderStep(key);
        }

        this.x += this.step;
    }
    translateY(key, value) {
        return this.yAxis.max - translate(
            value,
            this[key].min,
            this[key].max,
            this.yAxis.min,
            this.yAxis.max
        );
    }
    // SmO2 range: 0 - 100,   step: 0.1, <30% - blue, 30%-70% - green, >70% red
    // THb  range: 0 - 40.00, step: 0.01, 8.0 - 15.0
    calcStep(key) {
        const y = this.translateY(key, this[key].value);
        let length = this.path[key].length;

        if((length / 2) >= (this.width / this.step)) {
            if((length / 2) - (this.width / this.step) >= 2) {
                let p = (length / 2) - (this.width / this.step);
                length = this.width * 2;

                // splice window diff from the front and account for the one shift
                this.path[key].splice(0, (p*2)+2);

                // shift path x values to start from 0
                for(let i = 0, j = 0; i < length; i+=1) {
                    if(i % 2 == 0) {
                        this.path[key][i] = j;
                        j+=1;
                    };
                }
                this.x = (length/2) - 1;
                // shift
                this.path[key][length-2] = this.x;
                this.path[key][length-1] = y;
            } else {
                // when xAxis.max is reached,
                // shift in place 2 positions back
                // and set the last 2 position with the new data
                for(let i = 2; i < length; i+=1) {
                    if(i % 2 !== 0) {
                        this.path[key][i-2] = this.path[key][i];
                    };
                }
                this.x = (length/2) - 1; // maybe ??
                this.path[key][length-2] = this.x;
                this.path[key][length-1] = y;
            }

        } else {
            // push until xAxis.max is reached
            this.path[key].push(this.x);
            this.path[key].push(y);
        }
    }
    renderStep(key) {
        const points = this.path[key].join(',');
        this.$path[key].setAttribute('points', points);
    }
}

customElements.define('moxy-graph', MoxyGraph);

export {
    MoxyGraph,
}
