import { uiControls } from '../../src/ble/obc/ui-controls.js';

global.console = {
    log: jest.fn(),
    error: console.error,
    warn: console.warn,
};

describe('UIControls', () => {

    test('select pressed and back released', () => {
        const res = uiControls.decode([
            {id: 0x14, state: 0x01},
            {id: 0x15, state: 0x00},
        ]);

        expect(res).toEqual([
            {id: 0x14, action: 'select', kind: 'digital', state: 'pressed'},
            {id: 0x15, action: 'back', kind: 'digital', state: 'released'},
        ]);
    });

    test('a dial byte on a digital button is ignored', () => {
        const res = uiControls.decode([
            {id: 0x10, state: 0x02},
        ]);

        expect(res).toEqual([]);
    });

    test('training control id is ignored', () => {
        const res = uiControls.decode([
            {id: 0x30, state: 0x01},
        ]);

        expect(res).toEqual([]);
    });

    describe('brake', () => {
        test('released', () => {
            expect(uiControls.decode([{id: 0x1A, state: 0x00}])).toEqual([
                {id: 0x1A, action: 'brake', kind: 'brake', state: 'released'},
            ]);
        });

        test('digital full brake is 100%', () => {
            expect(uiControls.decode([{id: 0x1A, state: 0x01}])).toEqual([
                {id: 0x1A, action: 'brake', kind: 'brake', state: 'pressed', value: 100},
            ]);
        });

        test('0x65 is 100% on the percent scale', () => {
            expect(uiControls.decode([{id: 0x1A, state: 0x65}])).toEqual([
                {id: 0x1A, action: 'brake', kind: 'brake', state: 'value', value: 100},
            ]);
        });

        test('0xFF is clamped to 200%', () => {
            expect(uiControls.decode([{id: 0x1A, state: 0xFF}])).toEqual([
                {id: 0x1A, action: 'brake', kind: 'brake', state: 'value', value: 200},
            ]);
        });
    });

    describe('steeringAngle', () => {
        test('straight ahead', () => {
            expect(uiControls.decode([{id: 0x1B, state: 0x80}])).toEqual([
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'value', value: 0},
            ]);
        });

        test('10 degrees right', () => {
            expect(uiControls.decode([{id: 0x1B, state: 0x94}])).toEqual([
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'value', value: 10},
            ]);
        });

        test('4.5 degrees left', () => {
            expect(uiControls.decode([{id: 0x1B, state: 0x77}])).toEqual([
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'value', value: -4.5},
            ]);
        });

        test('unavailable', () => {
            expect(uiControls.decode([{id: 0x1B, state: 0x00}])).toEqual([
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'unavailable'},
            ]);
        });

        test('noop values', () => {
            expect(uiControls.decode([
                {id: 0x1B, state: 0x01},
                {id: 0x1B, state: 0xFF},
            ])).toEqual([
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'noop'},
                {id: 0x1B, action: 'steeringAngle', kind: 'angle', state: 'noop'},
            ]);
        });
    });

    describe('camera', () => {
        test('pressed cycles the view', () => {
            expect(uiControls.decode([{id: 0x40, state: 0x01}])).toEqual([
                {id: 0x40, action: 'camera', kind: 'camera', state: 'pressed'},
            ]);
        });

        test('an app-specific view byte is passed through', () => {
            expect(uiControls.decode([{id: 0x40, state: 0x05}])).toEqual([
                {id: 0x40, action: 'camera', kind: 'camera', state: 'value', value: 0x05},
            ]);
        });
    });
});
