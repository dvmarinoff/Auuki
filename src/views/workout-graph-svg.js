import { xf, exists, first, last, } from '../functions.js';
import { formatTime } from '../utils.js';
import { listItemTemplate, } from './planned-list.js';
import { models } from '../models/models.js';

// Just keep here logic that calculates the graph as svg
class WorkoutGraphViewModel {
    constructor() {
        const self = this;
        this.px = this.px ?? 10; // the workouts page font-size from em to absolute px
        this.xOutRange = {min: 0, max: 400};
        this.yOutRange = {min: 0, max: self.calcYOutRangeMax(self.px)};
        this.xInRange = {min: 0, max: 1};
        this.yInRange = {min: 0, max: 1};
        this.powerMin = 0.1;
    }
    translate(value, inRange, outRange) {
        const inSpan = inRange.max - inRange.min;
        const outSpan = outRange.max - outRange.min;

        const valueScaled = (value - inRange.min) / (inSpan);

        return inRange.min + (valueScaled * outSpan);
    }
    findMaxTarget(workout) {
        const intervals = workout.intervals;
        let interval;
        let step;
        let max = 0;
        for(let i = 0; i < intervals.length; i++) {
            interval = intervals[i];
            for(let j = 0; j < interval.steps.length; j++) {
                step = interval.steps[j];
                if(step.power > max) max = step.power;
            }
        }
        return max;
    }
    calcYOutRangeMax(px) {
        const em = 8;
        return px * em;
    }
    calcYInRangeMax(data, ftp) {
        const self = this;
        const targetMax = Math.round(self.findMaxTarget(data) * ftp);
        return (targetMax > ftp) ? targetMax : ftp * 1.6;
    }
    intervalToInfo(interval) {
        const firstStep = first(interval.steps);
        const lastStep = last(interval.steps);

        const powerStart = models.ftp.toAbsolute(firstStep.power);
        const powerEnd = models.ftp.toAbsolute(lastStep.power);
        const cadenceStart = firstStep.cadence;
        const cadenceEnd = lastStep.cadence;
        const slopeStart = firstStep.slope;
        const slopeEnd = lastStep.slope;

        const duration = `${formatTime({value: interval.duration ?? 0, format: 'mm:ss'})}min`;
        const power = exists(powerStart) ? powerStart === powerEnd ?
              `${powerStart}W` : `${powerStart}-${powerEnd}W` : '';

        const cadence = exists(cadenceStart) ? cadenceStart === cadenceEnd ?
              `${cadenceStart}W` : `${cadenceStart}-${cadenceEnd}rpm` : '';

        const slope = exists(slopeStart) ? slopeStart === slopeEnd ?
              `${slopeStart}%` : `${slopeStart}-${slopeEnd}%` : '';

        return { duration, power, cadence, slope, };
    }
    // Int
    // ->
    // String
    toSVG(data, ftp = 200, size) {
        const self = this;

        const intervals = data.intervals;
        let graphWidth = window.innerWidth;
        if(size) {
            self.yOutRange.max = size.height;
        }
        this.xOutRange.max = graphWidth;
        this.xInRange.max = data?.meta?.duration;

        self.yInRange.max = self.calcYInRangeMax(data, ftp);

        // initial values
        let   x  = self.xOutRange.min;
        let   x0 = self.xOutRange.min;
        const y0 = self.yOutRange.min;
        let   x1 = self.xOutRange.min;
        let   y1 = self.yOutRange.min;
        let   x2 = self.xOutRange.min;
        let   y2 = self.yOutRange.min;
        let   x3 = self.xOutRange.min;
        const y3 = self.yOutRange.min;

        let heightStart        = self.yOutRange.min;
        let heightEnd          = self.yOutRange.min;
        let powerStartRelative = this.powerMin;
        let powerEndRelative   = this.powerMin;
        let powerStart         = 0;
        let powerEnd           = 0;
        let width              = 0;

        const initialInterval = {duration: 0, steps: [{duration: 0, power: 0}]};
        const initialStep = initialInterval.steps[0];
        let stepPrev = initialStep;
        let points = '';
        let color  = '#328AFF'; // from css var(--zone-blue)

        // accumulators
        let accX = 0;
        let acc = '';

        for(let i = 0; i < intervals.length; i++) {
            let intervalPrev = (i === 0) ? initialInterval : intervals[i-1];
            let interval     = intervals[i];

            // TODO: handle ramps zone change, maybe with
            // - a mask
            // - a nested polygon element for each color change
            // for(let j = 0; j < interval.steps.length; j++) {
            // }

            powerStartRelative = Math.max(
                first(interval.steps)?.power ?? 0, this.powerMin
            );
            powerEndRelative = Math.max(
                last(interval.steps)?.power ?? 0, this.powerMin
            );
            powerStart = models.ftp.toAbsolute(powerStartRelative, ftp);
            powerEnd = models.ftp.toAbsolute(powerEndRelative, ftp);

            accX += intervalPrev.duration;

            x = self.translate(accX, self.xInRange, self.xOutRange);
            width = self.translate(interval.duration, self.xInRange, self.xOutRange);
            heightStart = self.translate(powerStart, self.yInRange, self.yOutRange);
            heightEnd = self.translate(powerEnd, self.yInRange, self.yOutRange);

            x0 = x;
            x1 = x;
            y1 = heightStart;
            x2 = x1+width;
            y2 = heightEnd;
            x3 = x+width;

            points = `${x0},${y0} ${x1},${y1} ${x2},${y2} ${x3},${y3}`;
            color = models.ftp.zoneToColor(
                models.ftp.powerToZone(powerStart, ftp).name
            );

            const info = self.intervalToInfo(interval);

            acc += `<polygon points="${points}"
                             fill="${color}"
                             power="${info.power}"
                             cadence="${info.cadence}"
                             slope="${info.slope}"
                             duration="${info.duration}" />`;
        }

        return `
            <svg
                class="workout--graph"
                viewBox="0 0 ${graphWidth} ${this.yOutRange.max}"
                preserveAspectRatio="none">
                <g transform="matrix(1 0 0 -1 0 ${this.yOutRange.max})">
                    ${acc}
                </g>
            </svg>
            `;
    }
}


// The graph element itself, just holds some events and actions
class WorkoutGraph extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$info = this.querySelector('.graph--info--cont');

        this.addEventListener('mouseover', this.onHover.bind(this), this.signal);
        this.addEventListener('mouseout', this.onMouseOut.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onHover(e) {
        const self = this;
        const target = this.querySelector('polygon:hover');

        if(exists(target)) {
            const contRect = this.getBoundingClientRect();
            self.renderInfo(target, contRect);
        }
    }
    onMouseOut(e) {
        this.$info.style.display = 'none';
    }
    // TODO: simplify
    renderInfo(target, contRect) {
        const power    = target.getAttribute('power');
        const cadence  = target.getAttribute('cadence');
        const slope    = target.getAttribute('slope');
        const duration = target.getAttribute('duration');

        const rect = target.getBoundingClientRect();

        const intervalLeft = rect.left;
        const contLeft     = contRect.left;
        const contWidth    = contRect.width;
        const left         = intervalLeft;
        const bottom       = rect.height;

        this.$info.style.display = 'block';
        this.$info.innerHTML = `<div>${power}</div><div>${cadence}</div><div>${slope}</div><div class="graph--info--time">${duration}</div>`;

        const width  = this.$info.getBoundingClientRect().width;
        const height = this.$info.getBoundingClientRect().height;
        const minHeight = (bottom + height + (40)); // fix 40
        this.$info.style.left = `min(${contWidth}px - ${width}px, ${left}px)`;

        if(window.innerHeight > minHeight) {
            this.$info.style.bottom = bottom;
        } else {
            this.$info.style.bottom = bottom - (minHeight - window.innerHeight);
        }
    }
}

customElements.define('workout-graph-svg', WorkoutGraph);

// TODO:
// - should extend the workout graph with watch actions
// - it bridges session, activity and workout
class WorkoutGraphActive extends HTMLElement {
}

customElements.define('workout-graph-active-svg', WorkoutGraphActive);



export {
    WorkoutGraphViewModel,
};

