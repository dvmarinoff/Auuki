import { xf } from '../../src/functions.js';
import { fit } from '../../src/fit/fit.js';

class SimulationController {
    constructor() {
        this.status = 'stopped';
        this.speedMultiplier = 1;
        this.data = []; // Array of time-ordered data points
        this.currentIndex = 0;
        this.timer = null;
    }

    // Load data from a FIT file or JSON
    async loadScenario(data) {
        if (Array.isArray(data)) {
            // Already JSON/Array format
            this.data = data;
        } else if (data instanceof ArrayBuffer) {
            // Assume FIT file and decode
            // This is a simplified example; actual implementation would use fit.FITjs.decode
            // and map the records to a flat array
            console.log("Decoding FIT file for simulation...");
            // const records = ... decode logic ...
            // this.data = records;
        }
    }

    start(speedMultiplier = 10) { // Default 10x speed
        this.speedMultiplier = speedMultiplier;
        this.status = 'running';
        
        console.log(`Starting simulation at ${this.speedMultiplier}x speed`);

        // Override the standard loop with our high-speed loop
        this.loop();
    }

    stop() {
        this.status = 'stopped';
        if (this.timer) clearTimeout(this.timer);
    }

    loop() {
        if (this.status !== 'running') return;
        if (this.currentIndex >= this.data.length) {
            this.stop();
            console.log("Simulation complete");
            return;
        }

        const point = this.data[this.currentIndex];
        
        // Inject Data into App
        if (point.power !== undefined) xf.dispatch('power', point.power);
        if (point.cadence !== undefined) xf.dispatch('cadence', point.cadence);
        if (point.heartRate !== undefined) xf.dispatch('heartRate', point.heartRate);
        
        // Advance the watch
        xf.dispatch('test:tick', point.time); 

        this.currentIndex++;

        // Schedule next tick
        // 1000ms (real second) / speedMultiplier
        this.timer = setTimeout(() => this.loop(), 1000 / this.speedMultiplier);
    }

    // Generator for "Perfect" ride data matching a generic workout
    generatePerfectRide(durationSeconds, steadyPower) {
        return this.generateIntervalRide([{duration: durationSeconds, power: steadyPower}]);
    }

    // Generate ride data from segments used for testing
    generateIntervalRide(segments) {
        const data = [];
        let currentTime = 0;
        
        segments.forEach(segment => {
            for(let i = 0; i < segment.duration; i++) {
                // Determine zone based on power (simple)
                let hr = 100 + (segment.power * 0.25);
                
                data.push({
                    time: currentTime,
                    power: segment.power,
                    cadence: 90 + (segment.power > 200 ? 10 : 0), // Higher cadence for higher power
                    heartRate: hr
                });
                currentTime++;
            }
        });
        return data;
    }

    // Standard 30 Minute Test Ride
    generateTestRide() {
        return this.generateIntervalRide([
            { duration: 300, power: 100 }, // Warmup 5m
            { duration: 300, power: 150 }, // Ramp 5m
            { duration: 300, power: 250 }, // Interval 1 5m
            { duration: 300, power: 120 }, // Recovery 1 5m
            { duration: 300, power: 275 }, // Interval 2 5m
            { duration: 300, power: 100 }, // Cooldown 5m
        ]);
    }
}

export { SimulationController };
