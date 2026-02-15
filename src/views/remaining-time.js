import { xf } from "../functions.js";
import { formatTime } from "../utils.js";

class RemainingTime extends HTMLElement {
    constructor() {
        super();
        this.totalDuration = 0;
        this.elapsed = 0;
    }

    connectedCallback() {
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        
        xf.sub("db:elapsed", this.onElapsed.bind(this), signal);
        xf.sub("db:workout", this.onWorkout.bind(this), signal);
        
        this.render();
    }

    disconnectedCallback() {
        if(this.abortController) {
            this.abortController.abort();
        }
    }

    onWorkout(workout) {
        if (workout && workout.meta && workout.meta.duration) {
            this.totalDuration = workout.meta.duration;
            this.render();
        }
    }

    onElapsed(elapsed) {
        this.elapsed = elapsed;
        this.render();
    }

    render() {
        let display = "--:--";
        if (this.totalDuration > 0) {
            let remaining = this.totalDuration - this.elapsed;
            if (remaining < 0) remaining = 0;
            display = formatTime({ value: remaining, format: "mm:ss" });     
        }

        this.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; border-left: 1px solid var(--border-color); padding-left: 15px; margin-left:15px; user-select:none;">
                <div style="font-size: 0.6em; color: var(--gray); text-transform: uppercase; letter-spacing:1px;">Remaining</div>
                <div style="font-size: 1.1em; font-weight: bold; color: var(--white); font-family: monospace;">${display}</div>
            </div>
        `;
    }
}

customElements.define("remaining-time", RemainingTime);

