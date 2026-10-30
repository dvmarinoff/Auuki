//
// OpenBikeControl
// Training Controls
//
// Most workout buttons are digital: 0x00 released, 0x01 pressed.
// Cruise control is a dial. 0x01 toggles it at the rider's current power.
// 0x0A and above is an absolute watt target: the byte times 5.

import { equals } from '../../functions.js';

const trainingControlsButtonIds = [
    0x30, // increaseDifficulty
    0x31, // decreaseDifficulty
    0x32, // skipInterval
    0x33, // pause
    0x34, // resume
    0x35, // lap
    0x36, // previousInterval
    0x37, // uTurn
    0x38, // changeMode
    0x39, // takeABreak
    0x3A, // joinRider
    0x3B, // changeRoute
    0x3C, // cruiseControl
];

const digitalActions = {
    0x30: 'increaseDifficulty',
    0x31: 'decreaseDifficulty',
    0x32: 'skipInterval',
    0x33: 'pause',
    0x34: 'resume',
    0x35: 'lap',
    0x36: 'previousInterval',
    0x37: 'uTurn',
    0x38: 'changeMode',
    0x39: 'takeABreak',
    0x3A: 'joinRider',
    0x3B: 'changeRoute',
};

const cruiseControlId = 0x3C;
const cruiseWattsPerStep = 5;
const cruiseAbsoluteMin = 0x0A;

function TrainingControls() {

    // Int, Int -> Message?
    function decodeDigital(id, state) {
        const action = digitalActions[id];
        if(equals(state, 0x00)) {
            return {id, action, kind: 'digital', state: 'released'};
        }
        if(equals(state, 0x01)) {
            return {id, action, kind: 'digital', state: 'pressed'};
        }

        return;
    }

    // Int -> Message?
    // 0x02 through 0x09 are reserved and mean "do nothing".
    // From 0x0A upward the byte is a watt target in steps of 5 W.
    function decodeCruiseControl(state) {
        if(equals(state, 0x00)) {
            return {
                id: cruiseControlId,
                action: 'cruiseControl',
                kind: 'cruise',
                state: 'released',
            };
        }
        if(equals(state, 0x01)) {
            return {
                id: cruiseControlId,
                action: 'cruiseControl',
                kind: 'cruise',
                state: 'pressed',
            };
        }
        if(state < cruiseAbsoluteMin) {
            return {
                id: cruiseControlId,
                action: 'cruiseControl',
                kind: 'cruise',
                state: 'noop',
            };
        }
        return {
            id: cruiseControlId,
            action: 'cruiseControl',
            kind: 'cruise',
            state: 'value',
            value: state * cruiseWattsPerStep,
        };
    }

    // {id, state} -> Message?
    function decodePair(pair) {
        const id = pair.id;
        const state = pair.state;

        if(id in digitalActions) return decodeDigital(id, state);
        if(equals(id, cruiseControlId)) return decodeCruiseControl(state);

        return;
    }

    // [{id, state}] -> [Message]
    function decode(pairs = []) {
        const messages = [];

        for(let i = 0; i < pairs.length; i++) {
            const message = decodePair(pairs[i]);
            if(message) messages.push(message);
        }

        return messages;
    }

    return Object.freeze({
        decode,
        decodePair,
    });
}

const trainingControls = TrainingControls();

export {
    TrainingControls,
    trainingControls,
    trainingControlsButtonIds,
};
