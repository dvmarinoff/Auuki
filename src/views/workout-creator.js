import { xf, exists, empty, toFixed } from '../functions.js';
import { models } from '../models/models.js';

class WorkoutCreator extends HTMLElement {
    constructor() {
        super();
        this.steps = [];
        this.metadata = {
            author: '',
            name: '',
            category: 'Custom',
            description: '',
            sportType: 'bike'
        };
    }

    connectedCallback() {
        this.render();
        this.querySelector('#add-step-btn').addEventListener('click', this.addStep.bind(this));
        this.querySelector('#add-group-btn').addEventListener('click', this.addGroup.bind(this));
        this.querySelector('#generate-btn').addEventListener('click', this.generateWorkout.bind(this));
        this.querySelector('#download-btn').addEventListener('click', this.downloadZwo.bind(this));
        this.querySelector('#close-btn').addEventListener('click', () => this.style.display = 'none');
        
        // Listen for open event
        xf.sub('ui:open-workout-creator', () => {
             this.style.display = 'block';
        });
    }

    addStep() {
        const type = this.querySelector('#step-type').value;
        const duration = parseInt(this.querySelector('#step-duration').value);
        const power = parseFloat(this.querySelector('#step-power').value) / 100;
        
        let step = { type, duration, power };
        
        if (type === 'IntervalsT') {
            step.repeat = parseInt(this.querySelector('#step-repeat').value);
            step.offDuration = parseInt(this.querySelector('#step-off-duration').value);
            step.offPower = parseFloat(this.querySelector('#step-off-power').value) / 100;
        }

        this.steps.push(step);
        this.updateStepList();
    }

    addGroup() {
        const repeat = parseInt(this.querySelector('#group-repeat').value);
        // Simple implementation: Group consists of N steady states defined in a mini-form or just repeated single step structure?
        // The user asked "where for example 3 steady steadystates can be defined".
        // Let's implement a mini-builder for the group or just capture current inputs as a "sequence" to repeat.
        
        // For verify simple "Multiple Steps repeated N times":
        // We'll add a "Start Group Recording" / "End Group Recording" methodology or a separate modal.
        // A simpler approach for V1: "Repeat the last N steps M times".
        
        // Let's try a dedicated "Group Builder" section in the UI.
        // Or simpler: Allow adding multiple steps to a temporary "group" list, then commit them repeated.
        
        const groupSteps = []; 
        // Logic to gather steps for the group would go here. 
        // For now, let's just duplicate the *current* step inputs N times as a simple "Repeat Single Step" 
        // or effectively "IntervalsT" but with flexible types.
        
        // If the user wants 3 distinct steady states repeated:
        // They should probably add them to the list, then select them to "Repeat". 
        // But the prompt says "define the steadystate's as building blocks... make the group be multiplied".
        
        // Revised Approach:
        // A "Group Mode" toggle. When on, added steps go to a temporary group.
        // A "Finish Group" button asks for multiplier, then unrolls them into the main list.
        
        alert("Group building logic will be implemented in the next iteration based on your preference for 'recording' steps.");
    }

    updateStepList() {
        const list = this.querySelector('#steps-list');
        list.innerHTML = this.steps.map((s, i) => {
            let desc = `${s.type} - ${s.duration}s @ ${Math.round(s.power * 100)}%`;
            if(s.type === 'IntervalsT') {
                desc += ` (x${s.repeat}, Off: ${s.offDuration}s @ ${Math.round(s.offPower * 100)}%)`;
            }
            return `<div class="step-item">
                <span>${i + 1}. ${desc}</span>
                <button onclick="this.getRootNode().host.removeStep(${i})">X</button>
            </div>`;
        }).join('');
    }

    removeStep(index) {
        this.steps.splice(index, 1);
        this.updateStepList();
    }

    generateWorkout() {
        this.metadata.name = this.querySelector('#meta-name').value;
        this.metadata.author = this.querySelector('#meta-author').value;
        this.metadata.description = this.querySelector('#meta-desc').value;

        let xml = `<workout_file>\n`;
        xml += `    <author>${this.metadata.author}</author>\n`;
        xml += `    <name>${this.metadata.name}</name>\n`;
        xml += `    <category>${this.metadata.category}</category>\n`;
        xml += `    <description>${this.metadata.description}</description>\n`;
        xml += `    <sportType>${this.metadata.sportType}</sportType>\n`;
        xml += `    <workout>\n`;
        
        this.steps.forEach(s => {
            if (s.type === 'IntervalsT') {
                xml += `        <IntervalsT Repeat="${s.repeat}" OnDuration="${s.duration}" OffDuration="${s.offDuration}" OnPower="${s.power}" OffPower="${s.offPower}"/>\n`;
            } else if (s.type === 'Warmup' || s.type === 'Cooldown') {
                 xml += `        <${s.type} Duration="${s.duration}" PowerLow="${s.power}" PowerHigh="${s.power}"/>\n`; // Simplified
            } else {
                xml += `        <${s.type} Duration="${s.duration}" Power="${s.power}"/>\n`;
            }
        });
        
        xml += `    </workout>\n</workout_file>`;
        
        this.querySelector('#output-area').value = xml;
        return xml;
    }
    
    downloadZwo() {
        const xml = this.generateWorkout();
        const blob = new Blob([xml], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.metadata.name.replace(/\s+/g, '_')}.zwo`;
        a.click();
        URL.revokeObjectURL(url);
    }

    render() {
        this.innerHTML = `
        <div class="workout-creator-mod">
            <div class="header">
                <h2>Create Custom Workout</h2>
                <button id="close-btn" class="btn">Close</button>
            </div>
            
            <div class="meta-section">
                <input type="text" id="meta-name" placeholder="Workout Name" />
                <input type="text" id="meta-author" placeholder="Author" />
                <textarea id="meta-desc" placeholder="Description"></textarea>
            </div>

            <div class="controls-section">
                <select id="step-type">
                    <option value="SteadyState">Steady State</option>
                    <option value="Warmup">Warmup</option>
                    <option value="Cooldown">Cooldown</option>
                    <option value="IntervalsT">Intervals (Repeats)</option>
                </select>
                <div class="input-row">
                    <label>Duration (s): <input type="number" id="step-duration" value="60"></label>
                    <label>Power (%): <input type="number" id="step-power" value="100"></label>
                </div>
                
                <div id="interval-controls" class="input-row" style="display:none;">
                     <label>Repeat: <input type="number" id="step-repeat" value="1"></label>
                     <label>Off Duration: <input type="number" id="step-off-duration" value="60"></label>
                     <label>Off Power (%): <input type="number" id="step-off-power" value="50"></label>
                </div>
                
                <button id="add-step-btn" class="btn">Add Block</button>
                <button id="start-group-btn" class="btn" style="background:#555">Start Group</button>
                <div id="group-controls" style="display:none; border:1px solid #666; padding:5px; margin-top:5px;">
                     <span>Recording Group...</span>
                     <label>Repeat Group: <input type="number" id="group-repeat" value="1"></label>
                     <button id="add-group-btn" class="btn">Finish & Add Group</button>
                </div>
            </div>

            <div id="steps-list" class="steps-list"></div>

            <div class="output-section">
                <button id="generate-btn" class="btn">Generate XML</button>
                <button id="download-btn" class="btn">Download .zwo</button>
                <textarea id="output-area" readonly></textarea>
            </div>
        </div>
        <style>
            .workout-creator-mod {
                position: fixed; top: 5%; left: 5%; width: 90%; height: 90%;
                background: var(--background-color-2); border: 1px solid var(--border-color);
                z-index: 1000; padding: 20px; overflow-y: auto; color: var(--foreground-color);
                display: flex; flex-direction: column; gap: 10px;
            }
            .step-item { display: flex; justify-content: space-between; padding: 5px; background: rgba(255,255,255,0.1); margin-bottom: 2px; }
            .input-row { display: flex; gap: 10px; flex-wrap: wrap; }
            input, select, textarea { padding: 5px; background: var(--input-color); border: 1px solid var(--border-color); color: var(--foreground-color); }
        </style>
        `;
        
        // Show/Hide interval controls based on type
        this.querySelector('#step-type').addEventListener('change', (e) => {
            const isInterval = e.target.value === 'IntervalsT';
            this.querySelector('#interval-controls').style.display = isInterval ? 'flex' : 'none';
        });
        
        // Group Logic
        let groupBuffer = [];
        const startGroupBtn = this.querySelector('#start-group-btn');
        const groupControls = this.querySelector('#group-controls');
        
        startGroupBtn.addEventListener('click', () => {
            groupBuffer = [];
            groupControls.style.display = 'block';
            startGroupBtn.style.display = 'none';
            this.querySelector('#add-step-btn').innerText = "Add to Group";
            
            // Override addStep locally for group mode
            const originalAddStep = this.addStep;
            this.addStep = () => {
                 const type = this.querySelector('#step-type').value;
                 const duration = parseInt(this.querySelector('#step-duration').value);
                 const power = parseFloat(this.querySelector('#step-power').value) / 100;
                 // ... interval fields logic ...
                 groupBuffer.push({ type, duration, power }); // simplified
                 // Update visual list only temporarily or different color?
                 alert(`Added to group. Current count: ${groupBuffer.length}`);
            };
        });
        
        this.addGroup = () => {
            const repeat = parseInt(this.querySelector('#group-repeat').value);
            // Unroll
            for(let i=0; i<repeat; i++) {
                groupBuffer.forEach(s => this.steps.push({...s}));
            }
            
            // Reset UI
            groupControls.style.display = 'none';
            startGroupBtn.style.display = 'inline-block';
            this.querySelector('#add-step-btn').innerText = "Add Block";
            // Restore original addStep (hacky, better to use flag)
            this.addStep = WorkoutCreator.prototype.addStep.bind(this);
            this.updateStepList();
        };
    }
}

customElements.define('workout-creator', WorkoutCreator);
export  { WorkoutCreator };
