//
// LocalStorageItem
//

import { equals, exists, existance } from '../functions.js';

let globalContext = () => '';

export function setGlobalContext(fn) {
    globalContext = fn;
}

function LocalStorageItem(args = {}) {
    const defaults = {
        fallback: '',
        isValid:  function (v) { return exists(v); },
        parse:    function(str) { return str; },
        encode:   function(str) { return str; },
    };

    let key      = args.key;
    let fallback = existance(args.fallback, defaults.fallback);
    let isValid  = existance(args.isValid, defaults.isValid);
    let parse    = existance(args.parse, defaults.parse);
    let encode   = existance(args.encode, defaults.encode);
    
    // Add user context prefix support
    let contextProvider = args.contextProvider || (() => globalContext());

    if(!exists(key)) throw new Error('LocalStorageItem needs a key!');

    function restore() {
        const inStorageValue = get();

        if(equals(inStorageValue, fallback)) {
            set(fallback);
        }

        return get();
    }

    function getFullKey() {
        const prefix = contextProvider();
        return prefix ? `${prefix}:${key}` : key;
    }

    function get() {
        const value = window.localStorage.getItem(getFullKey());

        if(!exists(value)) {
            // console.warn(`Trying to get non-existing value from Local Storage at key ${key}!`);
            return fallback;
        }

        return parse(value);
    }

    function set(value) {
        if(isValid(value)) {
            window.localStorage.setItem(getFullKey(), encode(value));
            return value;
        } else {
            console.warn(`Trying to enter invalid ${key} value in Local Storage: ${typeof value}`, value);
            window.localStorage.setItem(getFullKey(), fallback);
            return fallback;
        }
    }

    function remove() {
        window.localStorage.removeItem(getFullKey());
    }

    return Object.freeze({
        restore,
        get,
        set,
        remove,
    });
}

export { LocalStorageItem };

