import { equals, isString } from '../functions.js';
import { uuid } from '../storage/uuid.js';

const DialogMsg = {
    noAuth: ':no-auth',
};

const OAuthService = {
    strava: 'strava',
    intervals: 'intervals',
    trainingPeaks: 'trainingPeaks',
};

function StateParam() {
    const storageKey = 'oauth-state';

    function encode(name) {
        const param = name+'_'+uuid();
        return param;
    }
    function decode(param) {
        if(!isString(param)) {
            return { service: '', id: '' };
        }
        const parts = param.split('_');

        return {
            service: parts[0] ?? '',
            id: parts[1] ?? '',
        };
    }

    function store(state) {
        if(!isString(state)) {
            return;
        }
        sessionStorage.setItem(storageKey, state);
    }

    function restore() {
        const saved = sessionStorage.getItem(storageKey);
        return isString(saved) ? saved : '';
    }

    function consume(state) {
        const saved = restore();
        const matches = !equals(saved, '') && equals(saved, state);
        if(matches) {
            sessionStorage.removeItem(storageKey);
        }
        return matches;
    }

    return Object.freeze({
        encode,
        decode,
        store,
        restore,
        consume,
    });
}

const stateParam = StateParam();

export {
    OAuthService,
    DialogMsg,
    StateParam,
    stateParam,
}

