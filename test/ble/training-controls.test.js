import { trainingControls } from '../../src/ble/obc/training-controls.js';
import { decodeButtonState } from '../../src/ble/obc/obc.js';

global.console = {
    log: jest.fn(),
    error: console.error,
    warn: console.warn,
};

describe('TrainingControls', () => {

    test('increase pressed and decrease released stay separate', () => {
        const res = trainingControls.decode([
            {id: 0x30, state: 0x01},
            {id: 0x31, state: 0x00},
        ]);

        expect(res).toEqual([
            {id: 0x30, action: 'increaseDifficulty', kind: 'digital', state: 'pressed'},
            {id: 0x31, action: 'decreaseDifficulty', kind: 'digital', state: 'released'},
        ]);
    });

    test('pause, resume, lap, and skip', () => {
        const res = trainingControls.decode([
            {id: 0x33, state: 0x01},
            {id: 0x34, state: 0x01},
            {id: 0x35, state: 0x01},
            {id: 0x32, state: 0x01},
            {id: 0x36, state: 0x01},
        ]);

        expect(res).toEqual([
            {id: 0x33, action: 'pause', kind: 'digital', state: 'pressed'},
            {id: 0x34, action: 'resume', kind: 'digital', state: 'pressed'},
            {id: 0x35, action: 'lap', kind: 'digital', state: 'pressed'},
            {id: 0x32, action: 'skipInterval', kind: 'digital', state: 'pressed'},
            {id: 0x36, action: 'previousInterval', kind: 'digital', state: 'pressed'},
        ]);
    });

    test('a dial byte on a digital workout button is ignored', () => {
        expect(trainingControls.decode([{id: 0x30, state: 0x02}])).toEqual([]);
    });

    test('a gear button is ignored', () => {
        expect(trainingControls.decode([{id: 0x01, state: 0x01}])).toEqual([]);
    });

    describe('cruiseControl', () => {
        test('released', () => {
            expect(trainingControls.decode([{id: 0x3C, state: 0x00}])).toEqual([
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'released'},
            ]);
        });

        test('pressed toggles at the current power', () => {
            expect(trainingControls.decode([{id: 0x3C, state: 0x01}])).toEqual([
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'pressed'},
            ]);
        });

        test('reserved bytes are a no-op', () => {
            expect(trainingControls.decode([
                {id: 0x3C, state: 0x02},
                {id: 0x3C, state: 0x09},
            ])).toEqual([
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'noop'},
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'noop'},
            ]);
        });

        test('0x64 is 500 W and 0xFF is 1275 W', () => {
            expect(trainingControls.decode([
                {id: 0x3C, state: 0x0A},
                {id: 0x3C, state: 0x64},
                {id: 0x3C, state: 0xFF},
            ])).toEqual([
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'value', value: 50},
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'value', value: 500},
                {id: 0x3C, action: 'cruiseControl', kind: 'cruise', state: 'value', value: 1275},
            ]);
        });
    });
});

describe('decodeButtonState training controls', () => {

    test('a shift and a difficulty press share one notification', () => {
        const data = new DataView(new Uint8Array([
            0x01, 0x01, 0x01, 0x30, 0x01,
        ]).buffer);

        expect(decodeButtonState(data)).toEqual({
            virtualGearShifting: [
                {id: 0x01, action: 'shiftUp', kind: 'digital', state: 'pressed'},
            ],
            trainingControls: [
                {id: 0x30, action: 'increaseDifficulty', kind: 'digital', state: 'pressed'},
            ],
        });
    });
});
