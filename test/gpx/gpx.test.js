/**
 * @jest-environment jsdom
 */

import { gpx } from '../../src/gpx/gpx.js';

describe('Gpx', () => {

    test('Gpx.parse - with altitude data', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Test Route</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.531000"><ele>450</ele></trkpt>
              <trkpt lat="47.367000" lon="8.532000"><ele>420</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'test.gpx');

        expect(result.meta.name).toBe('Test Route');
        expect(result.meta.category).toBe('Course');
        expect(result.meta.author).toBe('n/a');
        expect(result.meta.distance).toBeGreaterThan(0);
        expect(result.points.length).toBe(3);
        expect(result.pointsSimplified.length).toBeGreaterThanOrEqual(2);
    });

    test('Gpx.parse - without altitude data', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Flat Route</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"></trkpt>
              <trkpt lat="47.366000" lon="8.531000"></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'flat.gpx');

        expect(result.meta.name).toBe('Flat Route');
        expect(result.meta.category).toBe('Course');
        expect(result.points.length).toBe(2);
        expect(result.points[0].slope).toBe(0);
        expect(result.points[1].slope).toBe(0);
        expect(result.meta.description).toBe('No altitude data, slope set to 0.');
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test('Gpx.parse - uses filename as fallback name', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.531000"><ele>450</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'my_ride.gpx');

        expect(result.meta.name).toBe('my ride');
    });

    test('Gpx.parse - single point', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Short</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'short.gpx');

        expect(result.meta.name).toBe('Short');
        expect(result.points.length).toBe(1);
        expect(result.meta.distance).toBe(0);
    });
});

describe('Gpx - slope calculation', () => {

    test('positive slope (uphill)', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Uphill</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.530000"><ele>500</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'uphill.gpx');

        expect(result.points[0].slope).toBeGreaterThan(0);
        expect(result.points[0].y).toBe(400);
        expect(result.points[1].y).toBe(500);
    });

    test('negative slope (downhill)', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Downhill</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>500</ele></trkpt>
              <trkpt lat="47.366000" lon="8.530000"><ele>400</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'downhill.gpx');

        expect(result.points[0].slope).toBeLessThan(0);
    });

    test('zero slope (flat)', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Flat</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.530000"><ele>400</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'flat.gpx');

        expect(result.points[0].slope).toBe(0);
    });
});

describe('Gpx - point properties', () => {

    test('each point has all required properties', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Properties Test</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.531000"><ele>450</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'props.gpx');

        result.points.forEach(point => {
            expect(point).toHaveProperty('x');
            expect(point).toHaveProperty('y');
            expect(point).toHaveProperty('r');
            expect(point).toHaveProperty('slope');
            expect(point).toHaveProperty('distance');
            expect(point).toHaveProperty('position_lat');
            expect(point).toHaveProperty('position_long');
        });
    });

    test('distance accumulates across points', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Distance</name>
            <trkseg>
              <trkpt lat="47.365000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.366000" lon="8.530000"><ele>400</ele></trkpt>
              <trkpt lat="47.367000" lon="8.530000"><ele>400</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'dist.gpx');

        expect(result.points[0].distance).toBe(0);
        expect(result.points[1].distance).toBeGreaterThan(0);
        expect(result.points[2].distance).toBeGreaterThan(result.points[1].distance);
        expect(result.meta.distance).toBe(result.points[2].distance);
    });

    test('position coordinates are preserved', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Coords</name>
            <trkseg>
              <trkpt lat="47.365123" lon="8.530456"><ele>400</ele></trkpt>
              <trkpt lat="47.366789" lon="8.531012"><ele>450</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'coords.gpx');

        expect(result.points[0].position_lat).toBeCloseTo(47.365123, 5);
        expect(result.points[0].position_long).toBeCloseTo(8.530456, 5);
        expect(result.points[1].position_lat).toBeCloseTo(47.366789, 5);
        expect(result.points[1].position_long).toBeCloseTo(8.531012, 5);
    });
});

describe('Gpx - realistic data', () => {

    test('Zurich route - approximate distance check', () => {
        const input = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx xmlns="http://www.topografix.com/GPX/1/1">
          <trk>
            <name>Zurich Ride</name>
            <trkseg>
              <trkpt lat="47.3783" lon="8.5403"><ele>408</ele></trkpt>
              <trkpt lat="47.3644" lon="8.5311"><ele>400</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

        const result = gpx.parse(input, 'zurich.gpx');

        expect(result.meta.name).toBe('Zurich Ride');
        expect(result.meta.distance).toBeGreaterThan(1000);
        expect(result.meta.distance).toBeLessThan(2000);
    });
});
