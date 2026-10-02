import { decodeFtmsMeasurement, FTMS_CHARACTERISTICS } from '@deancochran/ftms';

function IndoorBikeData() {
    function decode(view) {
        const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
        const reading = decodeFtmsMeasurement(FTMS_CHARACTERISTICS.INDOOR_BIKE_DATA, bytes, {
            // Preserve the two-byte layout already used by Auuki.
            resistanceFormat: 'signed16Tenths',
        });
        if (reading.status !== 'known') {
            throw new Error('FTMS decoder does not support Indoor Bike Data');
        }
        const { metrics: measurement, raw } = reading;

        const data = {
            speed: measurement.speedKph,
            AverageSpeed: measurement.averageSpeedKph,
            cadence: measurement.cadenceRpm,
            AverageCadence: measurement.averageCadenceRpm,
            distance: measurement.distanceMeters,
            power: measurement.powerWatts,
            AveragePower: measurement.averagePowerWatts,
            TotalEnergy: measurement.energyKcal,
            EnergyPerHour: measurement.energyPerHourKcal,
            EnergyPerMinute: measurement.energyPerMinuteKcal,
            heartRate: measurement.heartRateBpm,
            ElapsedTime: measurement.elapsedTimeSeconds,
            RemainingTime: measurement.remainingTimeSeconds,
            // Legacy Auuki fields expose wire integers, not physical units.
            ResistanceLevel: raw.resistance === null ? null : raw.resistance & 0xffff,
            MetabolicEquivalent: raw.metabolicEquivalentTenths,
        };

        // Missing or unavailable fields must not overwrite previous readings.
        for (const name of Object.keys(data)) {
            if (data[name] === null) delete data[name];
        }
        return data;
    }

    return Object.freeze({ decode });
}

const indoorBikeData = IndoorBikeData();

export { IndoorBikeData, indoorBikeData };
