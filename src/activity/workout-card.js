//
// Workout card
//
// Maps a decoded FIT activity into the numbers and chart series for the
// social media uploadable (Strava).

import { formatDate } from '../functions.js';
import { formatTime } from '../utils.js';

const BUCKETS = 1200;

const CARD = {
    width: 1600,
    height: 900,
    plot: { x: 64, y: 268, width: 1472, height: 500 },
};

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function powerSample(value) {
    return isFiniteNumber(value) && value > 0 && value < 3000;
}

function heartSample(value) {
    return isFiniteNumber(value) && value >= 30 && value <= 220;
}

function smo2Sample(value) {
    return isFiniteNumber(value) && value > 0 && value <= 100;
}

function thbSample(value) {
    return isFiniteNumber(value) && value > 0 && value <= 40;
}

function isDataMessage(message) {
    if(!message || !message.fields || Array.isArray(message.fields)) return false;
    if(message.type && message.type !== 'data') return false;
    return true;
}

function isChartRecord(fields) {
    return isFiniteNumber(fields.timestamp) && fields.time === undefined;
}

// Keep one value per second. A missing sample stays a hole so the line breaks
// instead of dropping to zero.
function collect(records, read, accept) {
    const samples = [];
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;

    for(let i = 0; i < records.length; i++) {
        const value = read(records[i]);
        if(!accept(value)) {
            samples.push(null);
            continue;
        }
        samples.push(value);
        sum += value;
        count += 1;
        if(value < min) min = value;
        if(value > max) max = value;
    }

    if(count === 0) return null;
    return { samples, avg: sum / count, min, max, count };
}

function bucketValues(values, bucketCount = BUCKETS) {
    if(!values || values.length === 0) return [];
    const count = Math.max(1, Math.min(bucketCount, values.length));
    const buckets = [];

    for(let i = 0; i < count; i++) {
        const start = Math.floor(i * values.length / count);
        const end = Math.max(start + 1, Math.floor((i + 1) * values.length / count));
        let sum = 0;
        let n = 0;
        for(let j = start; j < end; j++) {
            const value = values[j];
            if(!isFiniteNumber(value)) continue;
            sum += value;
            n += 1;
        }
        buckets.push(n ? sum / n : null);
    }

    return buckets;
}

function paddedScale(buckets, floor = null, ceil = null) {
    let min = Infinity;
    let max = -Infinity;
    for(let i = 0; i < buckets.length; i++) {
        const value = buckets[i];
        if(!isFiniteNumber(value)) continue;
        if(value < min) min = value;
        if(value > max) max = value;
    }
    if(!isFiniteNumber(min)) return { min: 0, max: 1 };

    if((max - min) < 1) {
        min -= 1;
        max += 1;
    } else {
        const pad = (max - min) * 0.08;
        min -= pad;
        max += pad;
    }
    if(floor !== null && min < floor) min = floor;
    if(ceil !== null && max > ceil) max = ceil;
    if(max <= min) max = min + 1;
    return { min, max };
}

function powerScale(buckets, ftp) {
    let max = 0;
    for(let i = 0; i < buckets.length; i++) {
        const value = buckets[i];
        if(isFiniteNumber(value) && value > max) max = value;
    }
    if(isFiniteNumber(ftp) && ftp > max) max = ftp;
    max = Math.max(100, max * 1.08);
    return { min: 0, max };
}

function seriesFrom(collected, scale) {
    return {
        avg: collected.avg,
        min: collected.min,
        max: collected.max,
        buckets: bucketValues(collected.samples),
        scale,
    };
}

function positive(value) {
    return isFiniteNumber(value) && value > 0;
}

function sessionNumber(sessionValue, computed) {
    if(positive(sessionValue)) return sessionValue;
    return computed;
}

function durationSeconds(records, session, summary) {
    if(isFiniteNumber(summary.duration) && summary.duration >= 0) {
        return summary.duration;
    }
    if(positive(session?.total_timer_time) || session?.total_timer_time === 0) {
        return session.total_timer_time;
    }
    if(records.length >= 2) {
        const firstTime = records[0].timestamp;
        const lastTime = records[records.length - 1].timestamp;
        return Math.max(0, (lastTime - firstTime) / 1000);
    }
    return 0;
}

function dateLabel(timestamp) {
    if(!isFiniteNumber(timestamp)) return '';
    return formatDate({ date: new Date(timestamp), separator: '/' });
}

function whole(value) {
    return `${Math.round(value)}`;
}

function places(value, digits) {
    return Number(value).toFixed(digits);
}

// messages: decoded FIT messages ({ type, name, fields }).
// summary: the label stored next to the file (name, timestamp, duration).
function cardFromMessages(messages, summary = {}) {
    const list = Array.isArray(messages) ? messages : [];
    const records = [];
    let session = null;

    for(let i = 0; i < list.length; i++) {
        const message = list[i];
        if(!isDataMessage(message)) continue;
        if(message.name === 'session') session = message.fields;
        if(message.name === 'record' && isChartRecord(message.fields)) {
            records.push(message.fields);
        }
    }

    const power = collect(records, (r) => r.power, powerSample);
    const heart = collect(records, (r) => r.heart_rate, heartSample);
    const smo2 = collect(records, (r) => r.saturated_hemoglobin_percent, smo2Sample);
    const thb = collect(records, (r) => r.total_hemoglobin_conc, thbSample);

    const ftp = positive(session?.threshold_power) ? session.threshold_power : null;
    const series = {};

    if(power) {
        series.power = seriesFrom(power, powerScale(bucketValues(power.samples), ftp));
    }
    if(heart) {
        series.heartRate = seriesFrom(heart, paddedScale(bucketValues(heart.samples), 0, null));
    }
    if(smo2) {
        series.smo2 = seriesFrom(smo2, paddedScale(bucketValues(smo2.samples), 0, 100));
    }
    if(thb) {
        series.thb = seriesFrom(thb, paddedScale(bucketValues(thb.samples), 0, null));
    }

    const tiles = [
        { label: 'Duration', value: formatTime({
            value: Math.round(durationSeconds(records, session, summary)),
            format: 'hh:mm:ss',
        }) },
    ];

    if(series.power) {
        const avg = sessionNumber(session?.avg_power, series.power.avg);
        const max = sessionNumber(session?.max_power, series.power.max);
        tiles.push({ label: 'Avg Power', value: `${whole(avg)} W` });
        tiles.push({ label: 'Max Power', value: `${whole(max)} W` });
    }
    if(series.heartRate) {
        const avg = sessionNumber(session?.avg_heart_rate, series.heartRate.avg);
        const max = sessionNumber(session?.max_heart_rate, series.heartRate.max);
        tiles.push({ label: 'Avg HR', value: whole(avg) });
        tiles.push({ label: 'Max HR', value: whole(max) });
    }
    if(series.smo2) {
        tiles.push({ label: 'SmO2', value: `${places(series.smo2.avg, 1)}%` });
    }
    if(series.thb) {
        tiles.push({ label: 'THb', value: `${places(series.thb.avg, 2)} g/dL` });
    }

    const name = (typeof summary.name === 'string' && summary.name.trim())
        ? summary.name.trim()
        : 'Workout';

    return {
        name,
        dateLabel: dateLabel(summary.timestamp),
        tiles,
        ftp: series.power ? ftp : null,
        series,
        plot: CARD.plot,
        width: CARD.width,
        height: CARD.height,
    };
}

// Canvas y grows downward, so a bigger value is a smaller y.
function pointsFor(buckets, scale, plot) {
    const n = buckets.length;
    const span = (scale.max - scale.min) || 1;
    const points = [];

    for(let i = 0; i < n; i++) {
        const value = buckets[i];
        if(!isFiniteNumber(value)) {
            points.push(null);
            continue;
        }
        const x = n === 1
            ? plot.x + plot.width / 2
            : plot.x + (i / (n - 1)) * plot.width;
        const t = (value - scale.min) / span;
        const y = plot.y + plot.height - t * plot.height;
        points.push({ x, y });
    }

    return points;
}

export {
    BUCKETS,
    CARD,
    bucketValues,
    cardFromMessages,
    pointsFor,
};
