/**
 * @jest-environment jsdom
 */

import { xf } from '../../src/functions.js';
import { models } from '../../src/models/models.js';

import { JSDOM } from 'jsdom';

describe('athleteToSettings', () => {

    test('VirtualRide', () => {
        var athlete = {
            weight: 75,
            icu_weight: 76,
            icu_weight_sync: '',
            sportSettings: [{
                types: ['VirtualRide'],
                ftp: undefined,
                indoor_ftp: 240,
                lthr: 180,
                max_hr: 193,
            }]
        };

        expect(models.api.intervals.athleteToSettings(athlete))
            .toEqual({weight: 75, ftp: 240,});
    });

    test('Ride', () => {
        var athlete = {
            weight: 75,
            icu_weight: 76,
            icu_weight_sync: '',
            sportSettings: [{
                types: ['Ride'],
                ftp: undefined,
                indoor_ftp: 240,
                lthr: 180,
                max_hr: 193,
            }]
        };

        expect(models.api.intervals.athleteToSettings(athlete))
            .toEqual({weight: 75, ftp: 240,});
    });

    test('VirtualRide, Ride', () => {
        var athlete = {
            weight: 75,
            icu_weight: 76,
            icu_weight_sync: '',
            sportSettings: [{
                types: ['Ride'],
                ftp: 250,
                indoor_ftp: undefined,
                lthr: 180,
                max_hr: 193,
            },
            {
                types: ['VirtualRide'],
                ftp: undefined,
                indoor_ftp: 240,
                lthr: 180,
                max_hr: 193,
            }]
        };

        expect(models.api.intervals.athleteToSettings(athlete))
            .toEqual({weight: 75, ftp: 240,});
    });

    test('ftp undefined', () => {
        var athlete = {
            weight: 75,
            icu_weight: 76,
            icu_weight_sync: '',
            sportSettings: [{
                types: ['VirtualRide'],
                ftp: undefined,
                indoor_ftp: undefined,
                lthr: 180,
                max_hr: 193,
            }]
        };

        expect(models.api.intervals.athleteToSettings(athlete))
            .toEqual({weight: 75, ftp: 0,});
    });

    test('ftp undefined with defaults', () => {
        var athlete = {
            weight: 75,
            icu_weight: 76,
            icu_weight_sync: '',
            sportSettings: [{
                types: ['VirtualRide'],
                ftp: undefined,
                indoor_ftp: undefined,
                lthr: 180,
                max_hr: 193,
            }]
        };

        expect(models.api.intervals.athleteToSettings(athlete, {ftp: 240}))
            .toEqual({weight: 75, ftp: 240,});
    });

    test('athlete undefined', () => {
        expect(models.api.intervals.athleteToSettings(undefined))
            .toEqual({weight: 0, ftp: 0,});
    });
});

// describe('', () => {
//     test('', () => {
//         expect(0).toBe(0);
//     });
// });

