import { xf, exists, existance, equals, clamp, debounce, toFixed  } from '../functions.js';
import { formatTime, translate } from '../utils.js';
import { models } from '../models/models.js';
import { g } from './graph.js';



function powerToHeight(power, powerMax, viewPort) {
    const height = translate(power, 0, powerMax, 0, viewPort.height * 0.90);
    // console.log(`${viewPort.height} -> ${height}`);
    if(height < (viewPort.height * 0.10)) {
        return viewPort.height * 0.14;
    }
    return height;
}

function intervalToWidth(intervalDuration, totalDuration, totalWidth) {
    return clamp(1,
                 totalDuration,
                 translate(intervalDuration, 0, totalDuration, 0, totalWidth)
                );
}

function intervalsToMaxPower(intervals, ftp) {
    return intervals.reduce((highest, interval) => {
        interval.steps.forEach((step) => {
            const power = models.ftp.toAbsolute(step.power, ftp);
            if(power > highest) highest = power;
        });
        return highest;
    }, ftp * 1.6);
}

function Interval(acc, interval, width, ftp, powerMax, viewPort) {
    const stepsLength = interval.steps.length;

    return acc + interval.steps.reduce((a, step) => {
        const power    = models.ftp.toAbsolute(step.power, ftp) ?? 0;
        const cadence  = step.cadence;
        const slope    = step.slope;
        const duration = step.duration;
        const width    = 100 / stepsLength;
        const height   = powerToHeight(power, powerMax, viewPort);
        const zone     = (models.ftp.powerToZone(power, ftp)).name;
        const infoTime = formatTime({value: duration, format: 'mm:ss'});

        const powerAttr    = exists(power)    ? `power="${power}"` : '';
        const cadenceAttr  = exists(cadence)  ? `cadence="${cadence}"` : '';
        const slopeAttr    = exists(slope)    ? `slope="${slope}"` : '';
        const durationAttr = exists(duration) ? `duration="${infoTime}"` : '';

        return a +
            `<div class="graph--bar zone-${zone}" style="height: ${height}px; width: ${width}%" ${powerAttr} ${cadenceAttr} ${slopeAttr} ${durationAttr}></div>`;
    }, `<div class="graph--bar-group" style="width: ${width}px;">`) + `</div>`;
}


function intervalsToGraph(workout, ftp, viewPort, intensity = 100) {
    const totalWidth    = viewPort.width;
    const intervals     = workout.intervals;
    const totalDuration = workout.meta.duration; // in seconds
    const intensityFactor = intensity / 100;
    
    // Helper to calculate target power for a step based on intensity
    const getTargetPower = (stepPower) => {
        // models.ftp.toAbsolute converts relative (0.5) to watts (100W if FTP=200)
        // or keeps absolute (150) as watts.
        // Then apply intensity factor.
        return Math.round(models.ftp.toAbsolute(stepPower, ftp) * intensityFactor);
    };

    // Calculate max power for scaling
    // Use a base max that scales with intensity too, or stick to raw max power in workout.
    let maxPower = intervals.reduce((highest, interval) => {
        interval.steps.forEach((step) => {
            const power = getTargetPower(step.power);
            if(power > highest) highest = power;
        });
        return highest;
    }, 0);
    
    // Ensure graph has headroom above max power or FTP, whichever is higher
    const currentFtp = Math.round(ftp * intensityFactor);
    maxPower = Math.max(maxPower, currentFtp * 1.5);

    // Generate Graph Bars
    const barsHtml = intervals.reduce((acc, interval) => {
        let width = 1;

        if(exists(interval.duration)) {
            width = intervalToWidth(interval.duration, totalDuration, totalWidth);
            const stepsLength = interval.steps.length;
            
            // Build inner HTML for this interval group
            const groupInner = interval.steps.reduce((a, step) => {
                const targetPower = getTargetPower(step.power);
                const height      = powerToHeight(targetPower, maxPower, viewPort);
                const stepWidth   = 100 / stepsLength;
                
                // Color zone based on adjusted power relative to user's real FTP base capability
                // (High intensity workout might push you into red zone constantly)
                const zoneInfo = models.ftp.powerToZone(targetPower, ftp);
                const zoneClass = `zone-${zoneInfo.name}`;
                
                const timeStr = formatTime({value: step.duration, format: 'mm:ss'});
                
                // Attributes for tooltip/hover
                const attrs = [
                    `power="${targetPower}"`,
                    exists(step.cadence) ? `cadence="${step.cadence}"` : '',
                    exists(step.slope) ? `slope="${step.slope}"` : '',
                    `duration="${timeStr}"`
                ].join(' ');

                return a + `<div class="graph--bar ${zoneClass}" style="height: ${height}px; width: ${stepWidth}%" ${attrs}></div>`;
            }, '');

            return acc + `<div class="graph--bar-group" style="width: ${width}px; flex-shrink: 0;">${groupInner}</div>`;
        }
        return acc;
    }, '');

    // Generate Y-Axis Labels (every 50W or so depending on scale)
    let yLabelsHtml = '';
    const yStep = Math.ceil(maxPower / 5 / 50) * 50 || 50; // coarse steps
    for(let p = yStep; p < maxPower; p += yStep) {
        const h = powerToHeight(p, maxPower, viewPort);
        yLabelsHtml += `<div class="graph--y-label" style="bottom: ${h}px;">${p}</div>`;
    }
    
    // FTP Line
    const ftpHeight = powerToHeight(currentFtp, maxPower, viewPort);
    const ftpLineHtml = `
        <div class="graph--ftp-line" style="bottom: ${ftpHeight}px;"></div>
        <div class="graph--ftp-label" style="bottom: ${ftpHeight}px;">FTP ${intensity}% (${currentFtp}W)</div>
    `;

    return `
        <div class="graph--y-axis" style="height: ${viewPort.height}px;">
            ${yLabelsHtml}
        </div>
        ${ftpLineHtml}
        <div class="graph--bars-container" style="display: flex; align-items: flex-end; height: 100%; width: 100%;">
            ${barsHtml}
        </div>
        <div class="graph--info--cont"></div>
    `;
}

function renderInfo(args = {}) {
    const power    = exists(args.power)    ? `${args.power}W `: '';
    const cadence  = exists(args.cadence)  ? `${args.cadence}rpm `: '';
    const slope    = exists(args.slope)    ? `${toFixed(args.slope, 2)}%` : '';
    const duration = exists(args.duration) ? `${args.duration}min `: '';
    const distance = exists(args.distance) ? `${args.distance}m `: '';
    const dom      = args.dom;

    const intervalLeft = args.intervalRect.left;
    const contLeft     = args.contRect.left;
    const contWidth    = args.contRect.width;
    const left         = intervalLeft - contLeft;
    const bottom       = args.intervalRect.height;

    dom.info.style.display = 'block';
    dom.info.innerHTML = `<div>${power}</div><div>${cadence}</div><div>${slope}</div><div class="graph--info--time">${duration}</div>`;

    const width  = dom.info.getBoundingClientRect().width;
    const height = dom.info.getBoundingClientRect().height;
    const minHeight = (bottom + height + (40)); // fix 40
    dom.info.style.left = `min(${contWidth}px - ${width}px, ${left}px)`;

    if(window.innerHeight > minHeight) {
        dom.info.style.bottom = bottom;
    } else {
        dom.info.style.bottom = bottom - (minHeight - window.innerHeight);
    }
}

class WorkoutGraph extends HTMLElement {
    constructor() {
        super();
        this.workout = {};
        this.workoutStatus = "stopped";
        this.metricValue = 0;
        this.index = 0;
        this.minHeight = 30;
        this.type = 'workout';
    }
    connectedCallback() {
        const self = this;
        this.dom = {};
        this.$graphCont = document.querySelector('#graph-workout') ?? this;
        this.viewPort = this.getViewPort();
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.debounced = {
            onWindowResize: debounce(
                self.onWindowResize.bind(this), 300, {trailing: true, leading: false},
            ),
        };


        xf.sub(`db:workout`, this.onWorkout.bind(this), this.signal);
        xf.sub(`db:ftp`, this.onFTP.bind(this), this.signal);
        xf.sub(`db:intensity`, this.onIntensity.bind(this), this.signal);

        xf.sub('db:intervalIndex', this.onIntervalIndex.bind(this), this.signal);
        xf.sub('db:distance', this.onDistance.bind(this), this.signal);
        xf.sub('db:page', this.onPage.bind(this), this.signal);
        xf.sub('db:lapTime', this.onLapTime.bind(this), this.signal);
        xf.sub('db:workoutStatus', this.onWorkoutStatus.bind(this), this.signal);

        this.addEventListener('mouseover', this.onHover.bind(this), this.signal);
        this.addEventListener('mouseout', this.onMouseOut.bind(this), this.signal);
        // window.addEventListener('resize', this.debounced.onWindowResize.bind(this), this.signal);
        window.addEventListener('resize', this.onWindowResize.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    getViewPort() {
        // const rect = this.getBoundingClientRect();
        const rect = this.$graphCont.getBoundingClientRect();

        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            aspectRatio: rect.width / rect.height,
        };
    }
    onFTP(value) {
        this.ftp = value;
        if(exists(this.workout.intervals)) this.render();
    }
    onIntensity(value) {
        this.intensity = value;
        if(exists(this.workout.intervals)) this.render();
    }
    onPage(page) {
        if(equals(page, 'home')) {
            const viewPort = this.getViewPort();
            this.viewPort = viewPort;
            this.render();
        }
    }
    onWindowResize(e) {
        const viewPort = this.getViewPort();
        if(equals(viewPort.width, 0)) return;
        this.viewPort = viewPort;
        this.render();
    }
    onHover(e) {
        const self = this;
        const target = e.target.closest('.graph--bar');
        if(exists(target)) {
            const power        = target.getAttribute('power');
            const cadence      = target.getAttribute('cadence');
            const slope        = target.getAttribute('slope');
            const duration     = target.getAttribute('duration');
            const distance     = target.getAttribute('distance');
            const intervalRect = target.getBoundingClientRect();

            this.renderInfo({
                power,
                cadence,
                slope,
                duration,
                distance,
                intervalRect,
                contRect: self.viewPort,
                dom: self.dom,
            });
        }
    }
    onMouseOut(e) {
        this.dom.info.style.display = 'none';
    }
    onWorkout(value) {
        this.workout = value; // this.workout = Object.assign({}, value);

        if(exists(value.intervals)) {
            this.type = 'workout';
        }
        if(exists(value.points)) {
            this.type = 'course';
        }

        if(!equals(this.viewPort.width, 0)) {
            this.render();
        }
    }
    onWorkoutStatus(value) {
        this.workoutStatus = value;
    }
    onIntervalIndex(index) {
        const self = this;
        this.index = index;
        this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});
    }
    onDistance(distance) {
        const self = this;
        if(exists(this.workout?.points)) {
            const totalDistance = this.workout.meta.distance;
            const $dom = self.dom;
            const $parent = self;
            const height = $parent.getBoundingClientRect().height;
            const width = $parent.getBoundingClientRect().width;
            const left = translate(distance, 0, totalDistance, 0, width);
            $dom.active.style.left   = `${left % width}px`;
            $dom.active.style.width  = `2px`;
            $dom.active.style.height = `${height}px`;

            if(equals(this.type, 'course')) {
                $dom.progress.style.left   = `${left % width}px`;
            }
        }
        return;
    }
    onLapTime(lapTime) {
        const self = this;
        this.lapTime = lapTime;
        if(equals(this.type, 'workout')) {
            this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});
        }
    }
    progress(args = {}) {
        if(this.workoutStatus === "done") {
            return;
        }
        
        const index = args.index ?? 0;
        
        // Safety check if intervals are rendered
        if (empty(this.dom.intervals)) return;
        if (!exists(this.workout.intervals[index])) return;

        const lapTime               = args.lapTime ?? this.workout.intervals[index].duration;
        const $dom                  = args.dom;
        const $parent               = args.parent;
        const $container            = this.querySelector('.graph--bars-container');
        // Fallback or safety if container not found
        if (!$container) return;

        const rect                  = $dom.intervals[index].getBoundingClientRect();
        const parentRect            = $container.getBoundingClientRect(); 
        const left                  = rect.left - parentRect.left;
        const lapPercentageComplete = 1 - (lapTime / this.workout.intervals[index].duration);

        $dom.active.style.left   = `${left}px`;
        $dom.active.style.width  = `${rect.width}px`;
        $dom.active.style.height = `${parentRect.height}px`;

        $dom.progress.style.width = `${left + (rect.width * lapPercentageComplete)}px`;
    }
    render() {
        const self = this;
        const progress = '<div id="progress" class="progress"></div><div id="progress-active"></div>';

        if(equals(this.type, 'workout')) {
            this.innerHTML = progress +
                intervalsToGraph(this.workout, this.ftp, this.viewPort, this.intensity ?? 100);

            this.dom.info      = this.querySelector('.graph--info--cont');
            this.dom.progress  = this.querySelector('#progress');
            this.dom.active    = this.querySelector('#progress-active');
            this.dom.intervals = this.querySelectorAll('.graph--bar-group');
            this.dom.steps     = this.querySelectorAll('.graph--bar');

            this.progress({index: self.index, dom: self.dom, parent: self, lapTime: self.lapTime});
        }

        if(equals(this.type, 'course')) {
            this.innerHTML = progress +
                courseToGraph(this.workout, this.viewPort);

            this.dom.info     = this.querySelector('.graph--info--cont');
            this.dom.progress = this.querySelector('#progress');
            this.dom.active   = this.querySelector('#progress-active');
        }
    }
    renderInfo(args = {}) {
        renderInfo(args);
    }
}

customElements.define('workout-graph', WorkoutGraph);



function Segment(points, prop) {
    return points.reduce((acc, point, i) => {
        const value = point[prop];
        if(value > acc.max) acc.max = value;
        if(value < acc.min) acc.min = value;
        if(equals(i, 0)) { acc.min = value; acc.start = value; };
        if(equals(i, points.length-1)) acc.end = value;
        return acc;
    }, {min: 0, max: 0, start: 0, end: 0,});
}

function scale(value, max = 100) {
    return 100 * (value/max);
}

function courseToGraph(course, viewPort) {
    const altitudeSpec  = Segment(course.points, 'y');

    const distanceTotal = course.meta.distance;
    const aspectRatio   = viewPort.aspectRatio;
    const yOffset       = Math.min(altitudeSpec.min, altitudeSpec.start, altitudeSpec.end);
    const yMax          = (altitudeSpec.max - altitudeSpec.min);
    const yScale        = (1 / ((aspectRatio * yMax) / distanceTotal));
    const flatness      = ((altitudeSpec.max - altitudeSpec.min));
    const altitudeScale = yScale * ((flatness < 100) ? 0.2 : 0.7);

    const viewBox = { width: distanceTotal, height: yMax, };

    // console.table({distanceTotal, yMax, aspectRatio, yScale, flatness, altitudeScale, altitudeSpec});

    const track = course.pointsSimplified.reduce((acc, p, i, xs) => {
        const color = g.slopeToColor(p.slope);

        const px1 = p.x;
        const px2 = xs[i+1]?.x ?? px1;
        const py1 = p.y;
        const py2 = xs[i+1]?.y ?? py1;

        const x1 = px1;
        const y1 = yMax;
        const x2 = px1;
        const y2 = yMax - ((py1-yOffset) * altitudeScale);
        const x3 = px2;
        const y3 = yMax - ((py2-yOffset) * altitudeScale);
        const x4 = px2;
        const y4 = yMax;

        return acc + `<polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}" stroke="none" fill="${color}" class="graph--bar" index="${i}" slope="${p.slope}" />`;

    }, ``);

    const display =
          `<altitude-value class="elevation--value altitude--value">${altitudeSpec.start ?? '--'}</altitude-value>
        <ascent-value class="elevation--value ascent--value">0.0</ascent-value>`;

    return `${display}<div class="graph--info--cont"></div><svg class="graph--bar-group" width="100%" height="100%" viewBox="0 0 ${viewBox.width} ${viewBox.height}" preserveAspectRatio="xMinYMax meet">${track}</svg>`;
}

export {
    WorkoutGraph,
    intervalsToGraph,
    courseToGraph,
    renderInfo,
};

