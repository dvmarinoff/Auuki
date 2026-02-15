import { xf, existance } from '../functions.js';
import { models } from '../models/models.js';

class IntensityControl extends HTMLElement {
    constructor() {
        super();
        this.state = 100;
        this.step = 5;
    }
    connectedCallback() {
        this.innerHTML = `
            <div class="intensity-control">
                <button class="btn-dec">-</button>
                <span class="value">100%</span>
                <button class="btn-inc">+</button>
            </div>
            <style>
                .intensity-control {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    background: rgba(0,0,0,0.2);
                    border-radius: 4px;
                    padding: 0.25rem;
                    color: inherit;
                }
                .intensity-control button {
                    background: rgba(255,255,255,0.1);
                    color: inherit;
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 4px;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                }
                .intensity-control button:hover {
                    background: rgba(255,255,255,0.2);
                }
                .intensity-control .value {
                    font-weight: bold;
                    min-width: 3.5ch;
                    text-align: center;
                    font-size: 0.9em;
                }
            </style>
        `;

        this.$value = this.querySelector('.value');
        this.$btnDec = this.querySelector('.btn-dec');
        this.$btnInc = this.querySelector('.btn-inc');

        this.$btnDec.addEventListener('click', () => this.change(-this.step));
        this.$btnInc.addEventListener('click', () => this.change(this.step));

        // Subscribe to intensity updates
        this.abortController = new AbortController();
        const signal = { signal: this.abortController.signal };
        
        xf.sub('db:intensity', this.onUpdate.bind(this), signal);
    }

    disconnectedCallback() {
        this.abortController.abort();
    }

    onUpdate(value) {
        this.state = existance(value, 100);
        this.render();
    }

    change(delta) {
        let newValue = this.state + delta;
        // Clamp between min/max defined in model
        const min = models.intensity.min;
        const max = models.intensity.max;
        
        if (newValue < min) newValue = min;
        if (newValue > max) newValue = max;

        // Dispatch UI event which will update DB and then flow back to us via onUpdate
        xf.dispatch('ui:intensity-set', newValue);
    }

    render() {
        this.$value.textContent = `${this.state}%`;
    }
}

customElements.define('intensity-control', IntensityControl);
