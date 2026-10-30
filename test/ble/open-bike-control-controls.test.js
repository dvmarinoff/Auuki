/**
 * @jest-environment jsdom
 */

import { xf } from '../../src/functions.js';
import { openBikeControl } from '../../src/ble/obc/controls.js';

const pressed = (action) => ({action, state: 'pressed'});
const released = (action) => ({action, state: 'released'});

function eventsFor(messages, context) {
    return openBikeControl.controlsFor(messages, context).map((action) => {
        if('data' in action) return `${action.event}:${action.data}`;
        return action.event;
    });
}

describe('controlsFor arrows', () => {
    test.each([
        ['erg', 'ui:power-target-inc', 'ui:power-target-dec'],
        ['resistance', 'ui:resistance-target-inc', 'ui:resistance-target-dec'],
        ['sim', 'ui:slope-target-inc', 'ui:slope-target-dec'],
    ])('shift up and shift down follow the %s mode', (mode, up, down) => {
        expect(eventsFor([pressed('shiftUp')], {mode})).toEqual([up]);
        expect(eventsFor([pressed('shiftDown')], {mode})).toEqual([down]);
    });

    test.each([
        ['erg', 'ui:power-target-inc', 'ui:power-target-dec'],
        ['resistance', 'ui:resistance-target-inc', 'ui:resistance-target-dec'],
        ['sim', 'ui:slope-target-inc', 'ui:slope-target-dec'],
    ])('difficulty buttons follow the %s mode', (mode, up, down) => {
        expect(eventsFor([pressed('increaseDifficulty')], {mode})).toEqual([up]);
        expect(eventsFor([pressed('decreaseDifficulty')], {mode})).toEqual([down]);
    });

    test('a shift and the same difficulty arrow are one notch', () => {
        expect(eventsFor([
            pressed('shiftUp'),
            pressed('increaseDifficulty'),
        ], {mode: 'erg'})).toEqual(['ui:power-target-inc']);
        expect(eventsFor([
            pressed('increaseDifficulty'),
            pressed('shiftUp'),
        ], {mode: 'erg'})).toEqual(['ui:power-target-inc']);
    });

    test('opposite arrows happen in the order the bytes arrived', () => {
        expect(eventsFor([
            pressed('shiftUp'),
            pressed('decreaseDifficulty'),
        ], {mode: 'erg'})).toEqual([
            'ui:power-target-inc',
            'ui:power-target-dec',
        ]);
        expect(eventsFor([
            pressed('decreaseDifficulty'),
            pressed('shiftUp'),
        ], {mode: 'erg'})).toEqual([
            'ui:power-target-dec',
            'ui:power-target-inc',
        ]);
    });

    test('a release, a gear set, a chainring, and a cassette do not move the target', () => {
        expect(eventsFor([
            released('shiftUp'),
            {action: 'gearSet', state: 'value', value: 7},
            {action: 'chainringSet', state: 'value', value: 2},
            {action: 'cassetteSet', state: 'value', value: 11},
        ], {mode: 'erg'})).toEqual([]);
    });
});

describe('controlsFor workout buttons', () => {
    test('skip interval and lap use the lap control', () => {
        expect(eventsFor([pressed('skipInterval')], {
            mode: 'erg', watchStatus: 'started',
        })).toEqual(['ui:watchLap']);
        expect(eventsFor([pressed('lap')], {
            mode: 'erg', watchStatus: 'stopped',
        })).toEqual(['ui:watchLap']);
    });

    test('previous interval uses the back control', () => {
        expect(eventsFor([pressed('previousInterval')], {mode: 'erg'})).toEqual(['ui:watchBack']);
    });

    test('pause is sent only while the watch is started', () => {
        expect(eventsFor([pressed('pause')], {watchStatus: 'started'})).toEqual(['ui:watchPause']);
        expect(eventsFor([pressed('pause')], {watchStatus: 'paused'})).toEqual([]);
        expect(eventsFor([pressed('pause')], {watchStatus: 'stopped'})).toEqual([]);
    });

    test('resume continues a paused watch and starts a stopped one', () => {
        expect(eventsFor([pressed('resume')], {watchStatus: 'paused'})).toEqual(['ui:watchResume']);
        expect(eventsFor([pressed('resume')], {watchStatus: 'stopped'})).toEqual([
            'ui:watchStart',
            'ui:workoutStart',
        ]);
        expect(eventsFor([pressed('resume')], {watchStatus: 'started'})).toEqual([]);
    });

    test('change mode walks erg, resistance, then slope', () => {
        const press = [pressed('changeMode')];
        expect(eventsFor(press, {mode: 'erg'})).toEqual(['ui:mode-set:resistance']);
        expect(eventsFor(press, {mode: 'resistance'})).toEqual(['ui:mode-set:sim']);
        expect(eventsFor(press, {mode: 'sim'})).toEqual(['ui:mode-set:erg']);
    });

    test('u-turn, cruise, and a release produce nothing', () => {
        expect(eventsFor([
            pressed('uTurn'),
            {action: 'cruiseControl', state: 'pressed'},
            {action: 'cruiseControl', state: 'value', value: 200},
            released('pause'),
        ], {mode: 'erg', watchStatus: 'started'})).toEqual([]);
    });
});

describe('one bluetooth report', () => {
    test('shift up and increase difficulty from the same click raise power once', () => {
        const db = {mode: 'erg', watchStatus: 'started'};
        xf.create(db);

        let notches = 0;
        xf.reg('ui:power-target-inc', () => {
            notches += 1;
        });

        xf.dispatch('ble:openBikeControl:buttonState', [
            pressed('shiftUp'),
            pressed('increaseDifficulty'),
        ]);

        expect(notches).toBe(1);
    });
});
