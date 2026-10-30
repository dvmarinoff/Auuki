/**
 * @jest-environment jsdom
 */

import { models } from '../../src/models/models.js';

const shiftUp = {action: 'shiftUp', state: 'pressed'};
const shiftUpReleased = {action: 'shiftUp', state: 'released'};
const shiftDown = {action: 'shiftDown', state: 'pressed'};
const shiftDownReleased = {action: 'shiftDown', state: 'released'};

function apply(gear, messages) {
    return models.virtualGear.apply(gear, messages);
}

describe('virtualGear', () => {
    test('starts at 0, which means no gear yet', () => {
        expect(models.virtualGear.default).toBe(0);
    });

    test('the first shift up becomes 1, and the next becomes 2', () => {
        expect(apply(0, [shiftUp])).toBe(1);
        expect(apply(1, [shiftUp])).toBe(2);
    });

    test('shift down stops at 1, and stays at 0 when no gear is known', () => {
        expect(apply(1, [shiftDown])).toBe(1);
        expect(apply(0, [shiftDown])).toBe(0);
        expect(apply(4, [shiftDown])).toBe(3);
    });

    test('a press and its release in one list move the gear once', () => {
        expect(apply(3, [shiftUp, shiftUpReleased])).toBe(4);
        expect(apply(3, [shiftDown, shiftDownReleased])).toBe(2);
    });

    test('gearSet writes that gear and keeps it between 1 and 254', () => {
        expect(apply(1, [{action: 'gearSet', state: 'value', value: 7}])).toBe(7);
        expect(apply(1, [{action: 'gearSet', state: 'value', value: 0}])).toBe(1);
        expect(apply(1, [{action: 'gearSet', state: 'value', value: 255}])).toBe(254);
    });

    test('shift up stops at 254', () => {
        expect(apply(253, [shiftUp])).toBe(254);
        expect(apply(254, [shiftUp])).toBe(254);
    });

    test('noop, release, chainring, and cassette leave the number alone', () => {
        const gear = 6;
        expect(apply(gear, [{action: 'gearSet', state: 'noop'}])).toBe(gear);
        expect(apply(gear, [{action: 'gearSet', state: 'released'}])).toBe(gear);
        expect(apply(gear, [{action: 'chainringSet', state: 'value', value: 2}])).toBe(gear);
        expect(apply(gear, [{action: 'cassetteSet', state: 'value', value: 11}])).toBe(gear);
        expect(apply(gear, [shiftUpReleased, shiftDownReleased])).toBe(gear);
    });

    test('several messages in one report apply from first to last', () => {
        expect(apply(0, [shiftUp, shiftUp, shiftDown])).toBe(1);
        expect(apply(1, [
            {action: 'gearSet', state: 'value', value: 7},
            shiftDown,
        ])).toBe(6);
    });

    test('a workout button in the same list does not change the gear', () => {
        expect(apply(2, [
            {action: 'increaseDifficulty', state: 'pressed'},
            shiftUp,
        ])).toBe(3);
    });

    test('an empty list keeps the current gear', () => {
        expect(apply(4, [])).toBe(4);
        expect(apply(0)).toBe(0);
    });
});
