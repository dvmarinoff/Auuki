//
// Heart Rate Spec
// Heart Rate Measurement characteristic
//

const heartRateFormat = (flags) => ((flags >> 0) & 1) === 1;
const inContact       = (flags) => ((flags >> 1) & 1) === 1;
const sensorContact   = (flags) => ((flags >> 2) & 1) === 1;
const energyExpanded  = (flags) => ((flags >> 3) & 1) === 1;
const rrInterval      = (flags) => ((flags >> 4) & 1) === 1;

function readHeartRate(dataview) {
    const flags = dataview.getUint8(0, true);
    const datatype = heartRateFormat(flags) ? 'Uint16' : 'Uint8';
    return dataview['get' + datatype](1, true);
}

function readRRInterval(dataview) {
    let i = 0;
    const flags = dataview.getUint8(0, true);
    const datatype = 'Uint16';
    i = heartRateFormat(flags) ? 3 : 2;
    i = i+inContact(flags);
    if (rrInterval(flags)) {
        let rrIntervals = [];
        for(i; i < dataview.buffer.byteLength; i=i+2){
            let value = dataview.getUint16(i, true);
            rrIntervals.push(value);
        }
        return rrIntervals;
    } else {
        return undefined
    }
}

function HeartRateMeasurement(args = {}) {

    function decode(dataview) {
        const decoded = {
            heartRate: readHeartRate(dataview),
            rrInterval: readRRInterval(dataview)
        };
        return decoded;
    }

    return Object.freeze({
        decode,
    });
}

const heartRateMeasurement = HeartRateMeasurement();

export {
    HeartRateMeasurement,
    heartRateMeasurement
};

