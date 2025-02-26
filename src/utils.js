import { exists, existance, first, last, equals, isObject, isFunction, isArray } from './functions.js';

// format
function formatTime(args = {}) {
    const defaults = {
        unit:   'seconds',
        format: 'hh:mm:ss',
    };

    const value  = args.value;
    const format = args.format ?? defaults.format;
    const unit   = args.unit ?? defaults.unit;

    if(unit === 'seconds') {
        let hour = Math.floor(value / 3600);
        let min  = Math.floor(value % 3600 / 60);
        let sec  = value % 60;
        let sD   = (sec < 10)  ? `0${sec}`  : `${sec}`;
        let mD   = (min < 10)  ? `0${min}`  : `${min}`;
        let hD   = (hour < 10) ? `0${hour}` : `${hour}`;
        let hDs  = (hour < 10) ? `${hour}`  : `${hour}`;
        let res  = ``;

        if(format === 'hh:mm:ss') {
            res = `${hD}:${mD}:${sD}`;
        }
        if(format === 'mm:ss') {
            if(value < 3600) {
                res = `${mD}:${sD}`;
            } else {
                res = `${hD}:${mD}:${sD}`;
            }
        }

        return res;
    }

    return value;
}

function dateToDashString(date) {
    const day    = (date.getDate()).toString().padStart(2, '0');
    const month  = (date.getMonth()+1).toString().padStart(2, '0');
    const year   = date.getFullYear().toString();
    const hour   = (date.getHours()).toString().padStart(2, '0');
    const minute = (date.getMinutes()).toString().padStart(2, '0');
    return `${day}-${month}-${year}-at-${hour}-${minute}h`;
}

function time() {
    const date = new Date();
    const hours = (date.getHours()).toString().padStart(2,'0');
    const minutes = (date.getMinutes()).toString().padStart(2,'0');
    const seconds = (date.getSeconds()).toString().padStart(2,'0');
    const milliseconds = (date.getSeconds().toString()).padStart(4,'0');
    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

function isoDate(date = new Date()) {
    const offset = date.getTimezoneOffset();
    const d = new Date(date.getTime() - (offset*60*1000));
    return d.toISOString().split('T')[0];
}

function format(x, precision = 1000) {
    return Math.round(x * precision) / precision;
}

function kphToMps(kph) {
    return format(kph / 3.6);
};

function mpsToKph(mps) {
    return 3.6 * mps;
};

// Async

// var res = await backoff({max: 4, wait: 1000, fn: maybeFailOp, msg: 'debug'});
// needs a way to be canceled
async function backoff(args = {}) {
    const defaults = {
        max:     1,
        wait:    1000,
        rate:    ((x) => x * 1),
        success: ((x) => x),
        fail:    ((x) => x),
    };

    const max     = existance(args.max, defaults.max);
    const wait    = existance(args.wait, defaults.wait);
    const fn      = existance(args.fn);
    const success = existance(args.success, defaults.success);
    const fail    = existance(args.fail, defaults.fail);
    const rate    = existance(args.rate, defaults.rate);
    const msg     = args.msg;

    async function recur(max, wait, fn, success, fail, msg) {
        try {
            const result = await fn(max);
            return success(result);
        } catch(e) {
            if(max <= 0) return fail(e);
            if(exists(msg)) console.log(`:retry :${msg} :in ${rate(wait)} :left ${max}`);
            await delay(wait);
            return recur(max-1, rate(wait), fn, success, fail, msg);
        }
    }

    return await recur(max, wait, fn, success, fail, msg);
}

// Math
const bod = Math.pow(2, 31) / 180;
const dob = 180 / Math.pow(2, 31);

function degToSemicircles(degrees) {
    return degrees * bod;
}

function semicirclesToDeg(semicircles) {
    return semicircles * dob;
}

function digits(n) {
    return Math.log(n) * Math.LOG10E + 1 | 0;
}

function rand(min = 0, max = 10) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function gte(a, b) { return a >= b; }
function lte(a, b) { return a <= b; }
function gt(a, b) { return a > b; }
function lt(a, b) { return a < b; }

function inRange(min, max, value, lb=gte, ub=lte) {
    return (lb(value, min) && ub(value, max));
}

function divisors(number) {
    let divisors = [1];
    for(let i=2; i < number/2; i++) {
        if(number % i === 0) { divisors.push(i); }
    }
    return divisors;
}
// end Math

// Graphs
function translate(value, leftMin, leftMax, rightMin, rightMax) {
    const leftSpan = leftMax - leftMin;
    const rightSpan = rightMax - rightMin;

    const valueScaled = (value - leftMin) / (leftSpan);

    return rightMin + (valueScaled * rightSpan);
}

function hexColorToArray(hex) {
    return hex.replace('#','').match(/.{1,2}/g).map(x => parseInt(x, 16));
}

function arrayToHexColor(arr) {
    return '#' + arr.map(x => x.toString(16).toUpperCase()).join('');
}

function avgColor(hex1, hex2) {
    const color1 = hexColorToArray(hex1);
    const color2 = hexColorToArray(hex2);
    const color =  color1.map((channel, i) => parseInt((channel+color2[i])/2));
    return arrayToHexColor(color);
}
// end Graphs

// WebBLE
function hex(n) {
    let h = parseInt(n).toString(16).toUpperCase();
    if(h.length === 1) {
        h = '0'+ h;
    }
    return '0x' + h;
}
// end WebBLE

// ANT+ and .FIT
const garmin_epoch = Date.parse('31 Dec 1989 00:00:00 GMT');

function toFitTimestamp(timestamp) {
    return Math.round((timestamp - garmin_epoch) / 1000);
}

function toJsTimestamp(fitTimestamp) {
    return (fitTimestamp * 1000) + garmin_epoch;
}

function now() {
    return toFitTimestamp(Date.now());
}

function timeDiff(timestamp1, timestamp2) {
    let difference = (timestamp1 / 1000) - (timestamp2 / 1000);
    return Math.round(Math.abs(difference));
};

function toFitSpeed(speed, unit = 'kph') {
    const scale = 1000;

    if(unit === 'kph') {
        return parseInt((speed / 3.6) * scale, 10);
    }
    return speed;
}

function toFitDistance(distance, unit = 'km') {
    const scale = 100;

    if(unit === 'km') {
        return parseInt((distance * 1000) * scale, 10);
    }
    return distance;
}

function splitAt(xs, at) {
    if(!isArray(xs)) throw new Error(`splitAt takes an array: ${xs}`);
    let i = -1;
    return xs.reduce((acc, x) => {
        if((equals(x, at)) || (equals(acc.length, 0) && !equals(x, at))) {
            acc.push([x]); i++;
        } else {
            acc[i].push(x);
        }
        return acc;
    },[]);
}

function pad(xs = [], length = 0, value = 0) {
    for(let i = xs.length-1; i < length; i += 1) {
        xs.push(value);
    }
    return xs;
}

function calculateCRC(uint8array, start, end) {
    const crcTable = [
        0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401,
        0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400,
    ];

    let crc = 0;
    for (let i = start; i < end; i++) {
        const byte = uint8array[i];
        let tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[byte & 0xF];
        tmp = crcTable[crc & 0xF];
        crc = (crc >> 4) & 0x0FFF;
        crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xF];
    }

    return crc;
}

function typeToAccessor(basetype, method = 'set') {
    const uint8   = [0, 2, 7, 10, 13, 'enum', 'uint8', 'string', 'byte'];
    const uint16  = [132, 139, 'uint16', 'uint16z'];
    const uint32  = [134, 140, 'uint32', 'uint32z'];
    const uint64  = [143, 144, 'uint64', 'uint64z'];

    const int8    = [1, 'sint8'];
    const int16   = [131, 'sint16'];
    const int32   = [133, 'sint32'];
    const int64   = [142, 'sint64'];

    const float32 = [136, 'float32'];
    const float64 = [137, 'float64'];

    if(uint8.includes(basetype))   return `${method}Uint8`;
    if(uint16.includes(basetype))  return `${method}Uint16`;
    if(uint32.includes(basetype))  return `${method}Uint32`;
    if(uint64.includes(basetype))  return `${method}Uint64`;
    if(int8.includes(basetype))    return `${method}Int8`;
    if(int16.includes(basetype))   return `${method}Int16`;
    if(int32.includes(basetype))   return `${method}Int32`;
    if(int64.includes(basetype))   return `${method}Int64`;
    if(float32.includes(basetype)) return `${method}Float32`;
    if(float64.includes(basetype)) return `${method}Float64`;

    return `${method}Uint8`;
}

export {
    // format
    formatTime,
    dateToDashString,
    isoDate,
    format,
    kphToMps,
    mpsToKph,
    time,

    // data
    pad,

    // async
    backoff,

    // math
    digits,
    rand,
    gte,
    lte,
    gt,
    lt,
    inRange,
    divisors,

    // graph
    translate,
    hexColorToArray,
    arrayToHexColor,
    avgColor,

    // WebBLE
    hex,

    // ANT+ and .FIT
    toFitTimestamp,
    toJsTimestamp,
    now,
    timeDiff,
    toFitSpeed,
    toFitDistance,
    splitAt,
    calculateCRC,
    typeToAccessor,
};
