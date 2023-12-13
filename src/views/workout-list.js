import { xf, exists, empty, equals, debounce } from '../functions.js';
import { models } from '../models/models.js';
import { intervalsToGraph, courseToGraph, renderInfo } from './workout-graph.js';

const radioOff = `
        <svg class="radio radio-off" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0V0z" fill="none"/>
            <path class="path" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12
                    2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
        </svg>`;

const radioOn = `
        <svg class="radio radio-on" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24">
            <path d="M0 0h24v24H0V0z" fill="none"/>
            <path class="path" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0
                    18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            <circle class="circle" cx="12" cy="12" r="5"/>
        </svg>`;

const removeBtn = `
        <svg class="workout--remove control--btn--icon" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
            <path d="m376-300 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Zm-96 180q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520Zm-400 0v520-520Z"/>
        </svg>
`;

function workoutTemplate(workout) {
    let duration = '';
    if(workout.meta.duration) {
        duration = `${Math.round(workout.meta.duration / 60)} min`;
    }
    if(workout.meta.distance) {
        duration = `${(workout.meta.distance / 1000).toFixed(2)} km`;
    }
    return `<li is="workout-item" class='workout cf' id="${workout.id}" metric="ftp">
                <div class="workout--info">
                    <div class="workout--short-info">
                        <div class="workout--name">${workout.meta.name}</div>
                        <div class="workout--type">${workout.meta.category}</div>
                        <div class="workout--duration">${duration}</div>
                        <div class="workout--select" id="btn${workout.id}">${workout.selected ? radioOn : radioOff}</div>
                    </div>
                    <div class="workout--full-info">
                        <div class="workout-list--graph-cont">${workout.graph}</div>
                        <div class="workout--description">${workout.meta.description}</div>
                    </div>
                </div>
                <div class="workout--actions">
                    <span class="workout--remove">Delete</span>
                </div>
            </li>`;
}

class WorkoutList extends HTMLUListElement {
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



class WorkoutListItem extends HTMLLIElement {
    constructor() {
        super();
        this.state = '';
        this.postInit();
        this.isExpanded = false;
        this.isSelected = false;
    }
    postInit() { return; }
    connectedCallback() {
        const self = this;
        this.infoCont = this.querySelector('.workout--info');
        this.summary = this.querySelector('.workout--short-info');
        this.description = this.querySelector('.workout--full-info');
        this.selectBtn = this.querySelector('.workout--select');
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
        this.dom.info = this.querySelector('#graph--info--cont');
        this.dom.cont = this.querySelector('.workout-list--graph-cont');
        this.viewPort = this.getViewPort();

        this.infoCont.addEventListener('pointerdown', this.onSwipeStart.bind(this), this.signal);
        this.infoCont.addEventListener('pointermove', this.onSwipe.bind(this), this.signal);
        this.infoCont.addEventListener('pointerup', this.onSwipeEnd.bind(this), this.signal);

        xf.sub('db:workout', this.onWorkout.bind(this), this.signal);
        this.summary.addEventListener('pointerup', this.toggleExpand.bind(this), this.signal);
        this.selectBtn.addEventListener('pointerup', this.onRadio.bind(this), this.signal);

        this.removeBtn.addEventListener('pointerup', this.onRemove.bind(this), this.signal);

        this.addEventListener('mouseover', this.onHover.bind(this), this.signal);
        this.addEventListener('mouseout', this.onMouseOut.bind(this), this.signal);
        window.addEventListener('resize', this.debounced.onWindowResize.bind(this), this.signal);

        this.swiping = false;
        this.swiped = false;
        this.swipeX = 0;
    }
    unify(e) { return e.changedTouches ? e.changedTouches[0] : e; };
    onSwipeStart(e) {
        this.swiping = true;
        this.swipeX = this.unify(e).clientX;
    }
    onSwipe(e) {
        e.preventDefault();

        if(this.swiping) {
            let dx = this.unify(e).clientX - this.swipeX;
            this.infoCont.style.setProperty('left', dx);
        }
    }
    onSwipeEnd(e) {
        this.swiping = false;
        let dx = this.unify(e).clientX - this.swipeX;
        let sign = Math.sign(dx);
        if(sign < 0) {
            this.infoCont.style.setProperty('left', '-8em');
            this.swiped = true;
        } else {
            this.infoCont.style.setProperty('left', '0');
            this.swiped = false;
        }
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    toggleExpand(e) {
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

customElements.define('workout-list', WorkoutList, {extends: 'ul'});
customElements.define('workout-item', WorkoutListItem, {extends: 'li'});

