import { virtualGearShifting } from '../../src/ble/obc/virtual-gear-shifting.js';
import { decodeButtonState } from '../../src/ble/obc/obc.js';

global.console = {
    log: jest.fn(),
    error: console.error,
    warn: console.warn,
};

describe('VirtualGearShifting', () => {

    test('shift up pressed and shift down released', () => {
        const res = virtualGearShifting.decode([
            {id: 0x01, state: 0x01},
            {id: 0x02, state: 0x00},
        ]);

        expect(res).toEqual([
            {id: 0x01, action: 'shiftUp', kind: 'digital', state: 'pressed'},
            {id: 0x02, action: 'shiftDown', kind: 'digital', state: 'released'},
        ]);
    });

    test('gear set no-op, gear 1, and gear 2', () => {
        const res = virtualGearShifting.decode([
            {id: 0x03, state: 0x01},
            {id: 0x03, state: 0x02},
            {id: 0x03, state: 0x03},
        ]);

        expect(res).toEqual([
            {id: 0x03, action: 'gearSet', kind: 'gear', state: 'noop'},
            {id: 0x03, action: 'gearSet', kind: 'gear', state: 'value', value: 1},
            {id: 0x03, action: 'gearSet', kind: 'gear', state: 'value', value: 2},
        ]);
    });

    test('chainring and cassette use the same gear numbers', () => {
        const res = virtualGearShifting.decode([
            {id: 0x04, state: 0x02},
            {id: 0x05, state: 0x0C},
        ]);

        expect(res).toEqual([
            {id: 0x04, action: 'chainringSet', kind: 'gear', state: 'value', value: 1},
            {id: 0x05, action: 'cassetteSet', kind: 'gear', state: 'value', value: 11},
        ]);
    });

    test('a dial byte on a paddle is ignored', () => {
        const res = virtualGearShifting.decode([
            {id: 0x01, state: 0x02},
        ]);

        expect(res).toEqual([]);
    });

    test('training control id is ignored', () => {
        const res = virtualGearShifting.decode([
            {id: 0x30, state: 0x01},
        ]);

        expect(res).toEqual([]);
    });
});

describe('decodeButtonState', () => {

    test('one notification can carry a gear press and a select press', () => {
        const data = new DataView(new Uint8Array([
            0x01, 0x01, 0x01, 0x14, 0x01,
        ]).buffer);

        expect(decodeButtonState(data)).toEqual([
            {id: 0x01, action: 'shiftUp', kind: 'digital', state: 'pressed'},
            {id: 0x14, action: 'select', kind: 'digital', state: 'pressed'},
        ]);
    });

    test('a training control stays in the same list', () => {
        const data = new DataView(new Uint8Array([
            0x01, 0x30, 0x01,
        ]).buffer);

        expect(decodeButtonState(data)).toEqual([
            {id: 0x30, action: 'increaseDifficulty', kind: 'digital', state: 'pressed'},
        ]);
    });

    test('a message that is not a button report is ignored', () => {
        const data = new DataView(new Uint8Array([0x03, 0x01, 0x00, 0x00]).buffer);

        expect(decodeButtonState(data)).toEqual([]);
    });

    test('a trailing odd byte is ignored', () => {
        const data = new DataView(new Uint8Array([
            0x01, 0x02, 0x01, 0xFF,
        ]).buffer);

        expect(decodeButtonState(data)).toEqual([
            {id: 0x02, action: 'shiftDown', kind: 'digital', state: 'pressed'},
        ]);
    });
});
