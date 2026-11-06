//
// A collection of common functions that makes JS more functional
//

// Values
function equals(a, b) {
    return Object.is(a, b);
}

function isNull(x) {
    return Object.is(x, null);
}

function isUndefined(x) {
    return Object.is(x, undefined);
}

function isFunction(x) {
    return equals(typeof x, 'function');
}

function isArray(x) {
    return Array.isArray(x);
}

function isArrayBuffer(x) {
    return x instanceof ArrayBuffer;
}

function isDataView(x) {
    return x instanceof DataView;
}

function isObject(x) {
    return equals(typeof x, 'object') && !(isArray(x));
}

function isCollection(x) {
    return isArray(x) || isObject(x);
}

function isString(x) {
    return equals(typeof x, 'string');
}

function isNumber(x) {
    if(isNaN(x)) return false;
    return equals(typeof x, 'number');
}

function isAtomic(x) {
    return isNumber(x) || isString(x);
}

function exists(x) {
    if(isNull(x) || isUndefined(x)) { return false; }
    return true;
}

function existance(value, fallback) {
    if(exists(value))    return value;
    if(exists(fallback)) return fallback;
    throw new Error(`existance needs a fallback value `, value);
}

function expect(x, msg = 'expected value here') {
    if(exists(x)) return x;
    throw new Error(msg);
}

function validate(predicates = [], value, fallback = undefined) {
    if(predicates.reduce((acc, p) => acc && p(value), true)) return value;
    if(exists(fallback)) return fallback;
    throw new Error(`validate needs a fallback value with `, value);
}

// Collections
function empty(x) {
    if(isObject(x)) return (Object.keys(x).length === 0);
    return x.length === 0;
};

const nth = curry2(function(offset, xs) {
    let i = (offset < 0) ? (xs.length + offset) : (offset);
    if(isString(xs)) {
        return xs.charAt(i);
    }
    return xs[i];
});

function first(xs) {
    return xs.at(0);
}

function second(xs) {
    return xs.at(1);
}

function third(xs) {
    return xs.at(2);
}

function last(xs) {
    return xs.at(-1);
}

const prop = curry2(function(p, x) {
    if(!exists(x)) return;
    return Number.isInteger(p) ? nth(p, x) : x[p];
});

function map(coll, fn) {
    if(isArray(coll)) return coll.map(fn);
    if(isObject(coll)) {
        for (let prop in coll) {
            coll[prop] = fn(coll[prop]);
        }
        return coll;
    }
    if(isString(coll)) {
        return coll.split('').map(fn).join('');
    }
    throw new Error(`map called with unkown collection `, coll);
}


function traverse(obj, fn = ((x) => x), acc = []) {

    function recur(fn, obj, keys, acc) {
        if(empty(keys)) {
            return acc;
        } else {
            let [k, ...ks] = keys;
            let v = obj[k];

            if(isObject(v)) {
                acc = recur(fn, v, Object.keys(v), acc);
                return recur(fn, obj, ks, acc);
            } else {
                acc = fn(acc, k, v, obj);
                return recur(fn, obj, ks, acc);
            }
        }
    }
    return recur(fn, obj, Object.keys(obj), acc);
}

function getIn(...args) {
    let [collection, ...path] = args;
    return path.reduce((acc, key) => {
        if(exists(acc[key])) return acc[key];
        return undefined;
    }, collection);
}

function set(coll, k, v) {
    coll = (coll || {});
    coll[k] = v;
    return coll;
}

function setIn(coll={}, [k, ...keys], v) {
    return keys.length ? set(coll, k, setIn(coll[k], keys, v)) : set(coll, k, v);
}


function avg(xs, prop = false) {
    if(prop !== false) {
        return xs.reduce( (acc,v,i) => acc+(v[prop]-acc)/(i+1), 0);
    } else {
        return xs.reduce( (acc,v,i) => acc+(v-acc)/(i+1), 0);
    }
}

function mavg(value_c, value_p, count_c, count_p = count_c-1) {
    return (value_c + ((count_p) * value_p)) / count_c;
}

function max(xs, prop = false) {
    if(prop !== false) {
        return xs.reduce( (acc,v,i) => v[prop] > acc ? v[prop] : acc, 0);
    } else {
        return Math.max(xs);
    }
};

function sum(xs, path = false) {
    if(path !== false) {
        return xs.reduce( (acc,v,i) => acc + v[path], 0);
    } else {
        return xs.reduce( (acc,v,i) => acc + v, 0);
    }
};

function rand(min = 0, max = 10) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function capitalize(str) {
    return str.trim().replace(/^\w/, (c) => c.toUpperCase());
}

function escapeHtml(value) {
    const text = exists(value) ? String(value) : '';
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function clamp(lower, upper, value) {
    if(value >= upper) {
        return upper;
    } else if(value < lower) {
        return lower;
    } else {
        return value;
    }
}

// Functions
function compose2(f, g) {
    return function(...args) {
        return f(g(...args));
    };
}

function compose(...fns) {
    return fns.reduce(compose2);
}

function pipe(...fns) {
    return fns.reduceRight(compose2);
}

function repeat(n) {
    return function(f) {
        return function(x) {
            if (n > 0) {
                return repeat(n - 1)(f)(f(x));
            } else {
                return x;
            }
        };
    };
};

function curry2(fn) {
    return function (arg1, arg2) {
        if(exists(arg2)) {
            return fn(arg1, arg2);
        } else {
            return function(arg2) {
                return fn(arg1, arg2);
            };
        }
    };
}

function once(fn, context) {
    let result;
    return function() {
        if(fn) {
            result = fn.apply(context || this, arguments);
            fn = null;
        }
        return result;
    };
}

//
// Copied from lodash.js
//
function debounce(func, wait, options = {}) {
    const root = window;
    let lastArgs,
        lastThis,
        maxWait,
        result,
        timerId,
        lastCallTime;

    let lastInvokeTime = 0;
    let leading = false;
    let maxing = false;
    let trailing = true;

    // Bypass `requestAnimationFrame` by explicitly setting `wait=0`.
    const useRAF = (!wait && wait !== 0 && typeof root.requestAnimationFrame === 'function');

    if(!isFunction(func)) { // edit
        throw new TypeError('debounce expectes a function');
    }

    wait = existance(toNumber(wait), 0); // edit

    // if (isObject(options)) {
    leading = toBool(options.leading);
    maxing = exists(options.maxWait);
    maxWait = maxing ? Math.max(existance(toNumber(options.maxWait), 0), wait) : maxWait;
    trailing = exists(options.trailing) ? toBool(options.trailing) : trailing;
    // }

    function invokeFunc(time) {
        const args = lastArgs;
        const thisArg = lastThis;

        lastArgs = lastThis = undefined;
        lastInvokeTime = time;
        result = func.apply(thisArg, args);
        return result;
    }

    function startTimer(pendingFunc, wait) {
        if (useRAF) {
            root.cancelAnimationFrame(timerId);
            return root.requestAnimationFrame(pendingFunc);
        }
        return setTimeout(pendingFunc, wait);
    }

    function cancelTimer(id) {
        if (useRAF) {
            return root.cancelAnimationFrame(id);
        }
        return clearTimeout(id); // edit
    }

    function leadingEdge(time) {
        // Reset any `maxWait` timer.
        lastInvokeTime = time;
        // Start the timer for the trailing edge.
        timerId = startTimer(timerExpired, wait);
        // Invoke the leading edge.
        return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;
        const timeWaiting = wait - timeSinceLastCall;

        return maxing
            ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
            : timeWaiting;
    }

    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        const timeSinceLastInvoke = time - lastInvokeTime;

        // Either this is the first call, activity has stopped and we're at the
        // trailing edge, the system time has gone backwards and we're treating
        // it as the trailing edge, or we've hit the `maxWait` limit.
        return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
               (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
        const time = Date.now();
        if (shouldInvoke(time)) {
            return trailingEdge(time);
        }
        // Restart the timer.
        timerId = startTimer(timerExpired, remainingWait(time));
        return timerId; // edit
    }

    function trailingEdge(time) {
        timerId = undefined;

        // Only invoke if we have `lastArgs` which means `func` has been
        // debounced at least once.
        if (trailing && lastArgs) {
            return invokeFunc(time);
        }
        lastArgs = lastThis = undefined;
        return result;
    }

    function cancel() {
        if (timerId !== undefined) {
            cancelTimer(timerId);
        }
        lastInvokeTime = 0;
        lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
        return isUndefined(timerId) ? result : trailingEdge(Date.now());
    }

    function pending() {
        return !isUndefined(timerId);
    }

    function debounced(...args) {
        const time = Date.now();
        const isInvoking = shouldInvoke(time);

        lastArgs = args;
        lastThis = this;
        lastCallTime = time;

        if(isInvoking) {
            if(isUndefined(timerId)) {
                return leadingEdge(lastCallTime);
            }
            if(maxing) {
                // Handle invocations in a tight loop.
                timerId = startTimer(timerExpired, wait);
                return invokeFunc(lastCallTime);
            }
        }
        if(isUndefined(timerId)) {
            timerId = startTimer(timerExpired, wait);
        }
        return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    debounced.pending = pending;
    return debounced;
}
// end copied from lodash.js

// Async
async function delay(ms) {
    return await new Promise(res => setTimeout(res, ms));
}

async function wait(ms) {
    return await new Promise(res => setTimeout(res, ms));
}

// XF (Events)
function XF(args = {}) {
    let data = {};
    let name = args.name || 'db';

    function create(obj) {
        data = proxify(obj);
    }

    function proxify(obj) {
        let handler = {
            set: (target, key, value) => {
                target[key] = value;
                dispatch(`${name}:${key}`, target);
                return true;
            }
        };
        return new Proxy(obj, handler);
    }

    function dispatch(eventType, value) {
        window.dispatchEvent(evt(eventType)(value));
    }

    function sub(eventType, handler, options = {}) {

        function handlerWraper(e) {
            if(isStoreSource(eventType)) {
                handler(e.detail.data[evtProp(eventType)]);
            } else {
                handler(e.detail.data);
            }
        }

        window.addEventListener(
            eventType, handlerWraper, Object.assign({capture: false}, options)
        );

        return handlerWraper;
    }

    function reg(eventType, handler, options = {}) {

        function handlerWraper(e) {
            return handler(e.detail.data, data);
        }

        window.addEventListener(
            eventType, handlerWraper, Object.assign({capture: false}, options)
        );

        return handlerWraper;
    }

    function unsub(eventType, handler, options = {}) {
        // console.log(`unsub ${eventType}`, handler); // rmv
        window.removeEventListener(eventType, handler, Object.assign({capture: false}, options));
    }

    function isStoreSource(eventType) {
        return equals(evtSource(eventType), name);
    }

    function evt(eventType) {
        return function(value) {
            return new CustomEvent(eventType, {detail: {data: value}});
        };
    }

    function evtProp(eventType) {
        return second(eventType.split(':'));
    }

    function evtSource(eventType) {
        return first(eventType.split(':'));
    }

    return Object.freeze({
        create,
        reg,
        sub,
        dispatch,
        unsub
    });
}

const xf = XF();

// format
function hex(n) {
    return '0x' + parseInt(n).toString(16).toUpperCase().padStart(2, '0');
}

function toNumber(value) {
    return +value;
}

function toBool(value) {
    return !!(value);
};

function toFixed(x, points = 2, fallback = 0) {
    if(!isNumber(x)) return fallback;
    const precision = 10**points;
    return Math.round(x * precision) / precision;
}

function dataviewToArray(dataview) {
    return Array.from(new Uint8Array(dataview.buffer));
}

function dataviewToString(dataview) {
    let utf8decoder = new TextDecoder('utf-8');
    return utf8decoder.decode(dataview.buffer);
}

function arrayBufferToArray(buffer) {
    return Array.from(new Uint8Array(buffer));
}

function stringToCharCodes(str) {
    return str.split('').map(c => c.charCodeAt(0));
}

function stringToDataview(str) {
    let charCodes = stringToCharCodes(str);
    let uint8 = new Uint8Array(charCodes);
    let dataview = new DataView(uint8.buffer);

    return dataview;
}

function time() {
    const d = new Date();
    const mm = (d.getMinutes()).toString().padStart(2, '0');
    const ss = (d.getSeconds()).toString().padStart(2, '0');
    const mmmm = (d.getMilliseconds()).toString().padStart(4, '0');
    return `${mm}:${ss}:${mmmm}`;
}

function formatDate(args = {}) {
    const date = args.date ?? new Date();
    const s = args.separator ?? '/';
    const showYear = args.year ?? true;

    const day    = (date.getDate()).toString().padStart(2, '0');
    const month  = (date.getMonth()+1).toString().padStart(2, '0');
    const year   = date.getFullYear().toString();

    return `${day}${s}${month}${showYear ? s : ''}${showYear ? year : ''}`;
}

// Bits
function nthBit(field, bit) {
    return (field >> bit) & 1;
};

function setBit(i, n) {
    return n |= (1 << i);
}

function getBits(start, end, value) {
    return (value >> start) & ((1 << (end - start)) - 1);
}

function nthBitToBool(field, bit) {
    return toBool(nthBit(field, bit));
}

function xor(view, start = 0, end = view.byteLength) {
    let cs = 0;
    const length = (end < 0) ? (view.byteLength + end) : end;
    for (let i=start; i < length; i++) {
        cs ^= view.getUint8(i);
    }
    return cs;
}

function setUint24LE(dataview, index, value) {
    dataview.setUint8(index,    value        & 0xFF, true); // LSB
    dataview.setUint8(index+1, (value >> 8 ) & 0xFF, true);
    dataview.setUint8(index+2,  value >> 16        , true); // MSB
    return dataview;
}

function getUint24LE(dataview, index = 0) {
    const LSB = dataview.getUint8(index,   true); // LSB
    const MB  = dataview.getUint8(index+1, true);
    const MSB = dataview.getUint8(index+2, true); // MSB

    return (MSB << 16) + (MB << 8) + LSB;
}

function Spec(args = {}) {
    const definitions = expect(args.definitions);

    const applyResolution = curry2((prop, value) => {
        return value / definitions[prop].resolution;
    });

    const removeResolution = curry2((prop, value) => {
        return value * definitions[prop].resolution;
    });

    function encodeField(prop, input, transform = applyResolution(prop)) {
        const fallback = definitions[prop].default;
        const min      = applyResolution(definitions[prop].min);
        const max      = applyResolution(definitions[prop].max);
        const value    = input ?? fallback;

        return Math.floor(clamp(min, max, transform(value)));
    }

    function decodeField(prop, input, transform = removeResolution) {
        return transform(prop, input);
    }

    return {
        definitions,
        applyResolution,
        removeResolution,
        encodeField,
        decodeField,
    };
}

// print
function Print() {
    if(!exists(process)) {
        var process = {env: {NODE_ENV: "development"}};
    }

    let printLog = (process?.env?.NODE_ENV ?? "development" == "development") ?? false;
    let printWarn = true;

    console.log(`:env ${process?.env?.NODE_ENV} :print ${printLog}`);

    function log(msg) {
        if(printLog) {
            console.log(`[${time()}] ${msg}`);
        }
    }

    function warn(msg) {
        if(printWarn) {
            console.warn(`[${time()}] ${msg}`);
        }
    }

    function callKarenFromHR() {
        console.warn(`calling Karen from HR ...`);
    }

    function makeCoffee() {
        console.warn(`making coffee ...`);
        console.warn(`
      )  (
     (   ) )
      ) ( (
    _______)_
 .-'---------|
( C|=========|
 '-./_/_/_/_/|
   '_________'
    '-------'
`);
    }

    return {
        log,
        warn,
        makeCoffee,
        callKarenFromHR,
    };
}

const print = Print();

export {
    // values
    equals,
    isNull,
    isUndefined,
    isFunction,
    exists,
    existance,
    expect,
    isArray,
    isArrayBuffer,
    isDataView,
    isObject,
    isString,
    isCollection,
    isNumber,
    isAtomic,
    validate,

    // collections
    first,
    second,
    third,
    last,
    empty,
    map,
    traverse,
    getIn,
    set,
    setIn,
    avg,
    mavg,
    max,
    sum,
    rand,
    capitalize,
    escapeHtml,
    clamp,

    // functions
    compose,
    compose2,
    pipe,
    repeat,
    nth,
    curry2,
    once,
    debounce,

    // async
    delay,
    wait,

    // events
    xf,

    // format
    hex,
    toNumber,
    toFixed,
    toBool,
    dataviewToArray,
    dataviewToString,
    arrayBufferToArray,
    stringToCharCodes,
    time,
    formatDate,
    print,
    Spec,

    // bits
    nthBit,
    setBit,
    getBits,
    nthBitToBool,
    xor,
    setUint24LE,
    getUint24LE,
};

