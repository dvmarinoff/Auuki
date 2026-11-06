import { xf, exists, empty, equals, debounce, escapeHtml } from '../functions.js';
import { models } from '../models/models.js';
import { intervalsToGraph, courseToGraph, renderInfo } from './workout-graph.js';

const radioOff = `
        <svg class="radio radio-off">
            <use href="#icon--radio-off">
        </svg>`;

const radioOn = `
        <svg class="radio radio-on">
            <use href="#icon--radio-on">
        </svg>`;

const options = `
        <svg class="workout--options-btn control--btn--icon">
            <use href="#icon--options">
        </svg>`;

function workoutTemplate(workout) {
    let duration = '';
    if(workout.meta.duration) {
        duration = `${Math.round(workout.meta.duration / 60)} min`;
    }
    if(workout.meta.distance) {
        duration = `${(workout.meta.distance / 1000).toFixed(2)} km`;
    }
    const id = escapeHtml(workout.id);
    const name = escapeHtml(workout.meta.name);
    const category = escapeHtml(workout.meta.category);
    const description = escapeHtml(workout.meta.description);
    return `<workout-item class='workout cf' id="${id}" metric="ftp">
                <div class="workout--info">
                    <div class="workout--short-info">
                        <div class="workout--summary">
                            <div class="workout--name">${name}</div>
                            <div class="workout--type">${category}</div>
                            <div class="workout--duration">${duration}</div>
                            <div class="workout--select" id="btn${id}">${workout.selected ? radioOn : radioOff}
                            </div>
                            <div class="workout--options">${options}</div>
                        </div>
                    </div>
                    <div class="workout--full-info">
                        <div class="workout-list--graph-cont">${workout.graph}</div>
                        <div class="workout--description">${description}</div>
                    </div>
                </div>
                <div class="workout--actions">
                    <span class="workout--remove">Delete</span>
                </div>
            </workout-item>`;
}

class WorkoutList extends HTMLElement {
    constructor() {
        super();
        this.state = [];
        this.ftp = 0;
        this.items = [];
        this.postInit();
        this.workout = {};
    }
    postInit() { return; }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.sub(`db:workouts`, this.onWorkouts.bind(this), this.signal);
        xf.sub('db:workout',  this.onWorkout.bind(this), this.signal); // ?
        xf.sub(`db:ftp`,      this.onFTP.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    getWidth() {
        return window.innerWidth;
    }
    onWorkout(value) {
        this.workout = value;
    }
    onFTP(value) {
        if(!equals(value, this.ftp)) {
            this.ftp = value;
            if(!empty(this.state)) {
                this.render();
            }
        }
    }
    onWorkouts(value) {
        this.state = value;
        this.render();
    }
    getViewPort() {
        const self = this;

        const $el = document.querySelector('#workouts-page');
        const fontSize = parseInt(window.getComputedStyle($el).getPropertyValue('font-size'));
        const em = 8;

        const width = self.getWidth();
        const height = fontSize * em;
        const aspectRatio = width / height;


        return {
            height,
            width,
            aspectRatio,
        };
    }
    stateToHtml(state, ftp, selectedWorkout) {
        const self = this;
        const viewPort = this.getViewPort();

        return state.reduce((acc, workout, i) => {
            let graph = '';

            if(exists(workout.intervals)) {
                graph = intervalsToGraph(workout, ftp, viewPort);
            } else {
                graph = courseToGraph(workout, viewPort);
            }

            const selected = equals(workout.id, selectedWorkout.id);
            workout = Object.assign(workout, {graph: graph, selected: selected});
            return acc + workoutTemplate(workout);
        }, '');
    }
    render() {
        this.innerHTML = this.stateToHtml(this.state, this.ftp, this.workout);
    }
}



class WorkoutListItem extends HTMLElement {
    constructor() {
        super();
        this.state = '';
        this.isExpanded = false;
        this.isSelected = false;
        this.optionsActive = false;
    }
    connectedCallback() {
        const self = this;
        this.infoCont = this.querySelector('.workout--info');
        this.summary = this.querySelector('.workout--summary');
        this.description = this.querySelector('.workout--full-info');
        this.selectBtn = this.querySelector('.workout--select');
        this.optionsBtn = this.querySelector('.workout--options');
        this.removeBtn = this.querySelector('.workout--remove');
        this.indicator = this.selectBtn;
        this.id = this.getAttribute('id');

        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.debounced = {
            onWindowResize: debounce(
                self.onWindowResize.bind(this), 300, {trailing: true, leading: false},
            ),
        };

        this.dom = {};
        this.dom.info = this.querySelector('.graph--info--cont');
        this.dom.cont = this.querySelector('.workout-list--graph-cont');
        this.viewPort = this.getViewPort();

        xf.sub('db:workout', this.onWorkout.bind(this), this.signal);
        this.summary.addEventListener('pointerup', this.toggleExpand.bind(this), this.signal);
        this.optionsBtn.addEventListener('pointerup', this.toggleOptions.bind(this), this.signal);
        this.selectBtn.addEventListener('pointerup', this.onRadio.bind(this), this.signal);

        this.removeBtn.addEventListener('pointerup', this.onRemove.bind(this), this.signal);

        this.addEventListener('mouseover', this.onHover.bind(this), this.signal);
        this.addEventListener('mouseout', this.onMouseOut.bind(this), this.signal);
        window.addEventListener('resize', this.debounced.onWindowResize.bind(this), this.signal);

    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    toggleExpand(e) {
        if(e.target.classList.contains('workout--options')) {
            return;
        }
        if(this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }
    expand() {
        this.description.style.display = 'block';
        this.isExpanded = true;
    }
    collapse() {
        this.description.style.display = 'none';
        this.isExpanded = false;
    }
    toggleSelect(id) {
        if(equals(this.id, id)) {
            if(!this.isSelected) {
                this.select();
                this.expand();
            }
        } else {
            this.diselect();
        }
    }
    select() {
        this.indicator.innerHTML = radioOn;
        this.isSelected = true;
    }
    diselect() {
        this.indicator.innerHTML = radioOff;
        this.isSelected = false;
    }
    toggleOptions() {
        if(this.optionsActive) {
            this.hideOptions();
        } else {
            this.showOptions();
        }
    }
    showOptions() {
        this.infoCont.classList.remove('options-hide');
        this.infoCont.classList.add('options-show');
        this.optionsActive = true;
    }
    hideOptions() {
        this.infoCont.classList.remove('options-show');
        this.infoCont.classList.add('options-hide');
        this.optionsActive = false;
    }
    onWorkout(workout) {
        this.workout = workout;
        this.toggleSelect(workout.id);
    }
    onRadio(e) {
        e.stopPropagation();
        xf.dispatch('ui:workout:select', this.id);
    }
    onRemove(e) {
        console.log(`:ui :workout :remove :id '${this.id}'`);
        xf.dispatch('ui:workout:remove', this.id);
    }
    onUpdate(value) {
        if(!equals(value, this.state)) {
            this.state = value;
            this.render();
        }
    }
    onHover(e) {
        const self = this;
        const target = this.querySelector('.graph--bar:hover');
        if(exists(target)) {
            const power        = target.getAttribute('power');
            const cadence      = target.getAttribute('cadence');
            const slope        = target.getAttribute('slope');
            const duration     = target.getAttribute('duration');
            const distance     = target.getAttribute('distance');
            const intervalRect = target.getBoundingClientRect();
            this.viewPort      = this.getViewPort(); // move to more sensible event

            this.renderInfo({
                power,
                cadence,
                slope,
                duration,
                distance,
                intervalRect,
                contRect: self.viewPort,
                dom: self.dom,
            });
        }
    }
    onMouseOut(e) {
        this.dom.info.style.display = 'none';
    }
    getViewPort() {
        const rect = this.dom.cont.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            left: rect.left,
            aspectRatio: rect.width / rect.height,
        };
    }
    onWindowResize(e) {
        this.viewPort = this.getViewPort();
    }
    render() {}
    renderInfo(args = {}) {
        renderInfo(args);
    }
}

customElements.define('workout-list', WorkoutList);
customElements.define('workout-item', WorkoutListItem);

export {
    radioOff,
    radioOn,
    options,
    workoutTemplate,
};

