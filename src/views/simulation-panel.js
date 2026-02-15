import { xf } from '../functions.js';
import { SimulationController } from '../../test/simulation/controller.js';

class SimulationPanel extends HTMLElement {
    constructor() {
        super();
        this.simulation = new SimulationController();
    }

    connectedCallback() {
        this.render();
        this.querySelector('#sim-10x').onclick = () => this.start(10);
        this.querySelector('#sim-100x').onclick = () => this.start(100);
        this.querySelector('#sim-stop').onclick = () => this.stop();
    }

    start(speed) {
        // Find the 'Test Ride' or any workout
        xf.dispatch('ui:workoutStart', {});
        
        // Generate a 30 minute ride matching the simulation controller's default
        const data = this.simulation.generateTestRide(); 
        
        this.simulation.loadScenario(data);
        this.simulation.start(speed);
    }

    stop() {
        this.simulation.stop();
        xf.dispatch('ui:watchStop');
    }

    render() {
        this.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 10px;
                    border: 1px solid var(--border-color);
                    margin-top: 10px;
                }
                button {
                    background: var(--bg-color);
                    color: var(--fg-color);
                    border: 1px solid var(--border-color);
                    padding: 5px 10px;
                    cursor: pointer;
                    margin-right: 5px;
                }
            </style>
            <div>Simulation Control</div>
            <button id="sim-10x">Run 10x</button>
            <button id="sim-100x">Run 100x</button>
            <button id="sim-stop">Stop</button>
        `;
    }
}

customElements.define('simulation-panel', SimulationPanel);
