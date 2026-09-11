import { exists, equals } from '../functions.js';
import { toCourse } from '../fit/local-course.js';

const parser = new DOMParser();

const EARTH_RADIUS = 6371000;

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function haversine(lat1, lon1, lat2, lon2) {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) ** 2;
    return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function gpxName(doc, fileName) {
    const name = doc.querySelector('trk > name');
    if(exists(name)) {
        return name.textContent.trim();
    }
    return fileName.replace(/\.gpx/gi, '').replace(/_|-/gi, ' ');
}

function hasAltitude(trackpoints) {
    for(let i = 0; i < trackpoints.length; i++) {
        if(exists(trackpoints[i].querySelector('ele'))) {
            return true;
        }
    }
    return false;
}

function parse(gpxString, fileName) {
    const doc = parser.parseFromString(gpxString, 'text/xml');
    const trackpoints = doc.querySelectorAll('trkpt');

    const name = gpxName(doc, fileName);
    const altitude = hasAltitude(trackpoints);
    const description = altitude ? '' : 'No altitude data, slope set to 0.';

    if(!altitude) {
        console.warn(`GPX file "${fileName}" has no altitude data, slope will be set to 0`);
    }

    let distanceTotal = 0;
    let x = 0;

    const raw = [];
    for(let i = 0; i < trackpoints.length; i++) {
        const tp = trackpoints[i];
        const lat = parseFloat(tp.getAttribute('lat'));
        const lon = parseFloat(tp.getAttribute('lon'));
        const eleTag = tp.querySelector('ele');
        const ele = exists(eleTag) ? parseFloat(eleTag.textContent) : 0;

        if(i === 0) {
            raw.push({ lat, lon, ele, distance: 0 });
            continue;
        }

        const prev = raw[i - 1];
        const r = haversine(prev.lat, prev.lon, lat, lon);
        distanceTotal += r;

        raw.push({ lat, lon, ele, distance: distanceTotal });
    }

    const points = raw.reduce((acc, m, i) => {
        const altitude     = m.ele;
        const altitudeNext = raw[i + 1]?.ele ?? m.ele;

        const distance     = m.distance;
        const distanceNext = raw[i + 1]?.distance ?? m.distance;

        const rise = altitudeNext - altitude;
        const r    = distanceNext - distance;
        const run  = equals(r, 0) ? 0 : Math.sqrt(Math.abs(r ** 2 - rise ** 2));
        const slope = equals(run, 0) ? 0 : 100 * (rise / run);

        acc.push({
            x,
            y: altitude,
            r,
            slope,
            distance,
            position_lat: m.lat,
            position_long: m.lon,
        });
        x += run;
        return acc;
    }, []);

    return toCourse(points, distanceTotal, name, description);
}

const gpx = {
    parse,
};

export { gpx };
