import { xf, empty, } from '../functions.js';
import { models } from '../models/models.js';
import { WorkoutGraphViewModel, } from './workout-graph-svg.js';


// TODO:
// - Use Model as a way to store, and isolated the operations on the data,
//   and potentially share it
// - use directly the Model to that view, not just the data through sub
// - maybe no need to have list data in db, just the shared session data
class PlannedList extends HTMLElement {
    constructor() {
        super();
        this.capacity = 10;
        this.index = 0;
        this.model = models.planned;
        this.viewModel = new WorkoutGraphViewModel({item: ':planned'});
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$indicatorIntervals = document.querySelector(
            `.planned--actions .connection-icon-switch--indicator.intervals`
        );

        this.$indicatorTrainingPeaks = document.querySelector(
            `.planned--actions .connection-icon-switch--indicator.tp`
        );

        xf.sub(`db:ftp`,      this.onFTP.bind(this), this.signal);
        xf.sub('action:planned', self.onAction.bind(this), this.signal);

        // TODO: maybe debounce the resize
        // window.addEventListener('resize', this.onWindowResize.bind(this), this.signal);

        self.size = self.getSize();
        this.render();
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onAction(action) {
        // TODO: handle this directly in db
        if(action === ':data') {
            this.render();
            return;
        }
        if(action === ':intervals:wod') {
            this.model.wod('intervals');
            this.model.getAthlete('intervals');
            this.onLoading(this.$indicatorIntervals);
            return;
        }
        if(action === ':intervals:wod:success') {
            this.onSuccess(this.$indicatorIntervals);
        }
        if(action === ':intervals:wod:fail') {
            this.onFail(this.$indicatorIntervals);
        }

        if(action === ':intervals:athlete:sucess') {
            console.log(':intervals:athlete:sucess');
        }
        if(action === ':intervals:athlete:fail') {
            console.log(':intervals:athlete:fail');
        }

        if(action === ':trainingPeaks:wod') {
            this.model.wod('trainingPeaks');
            return;
        }
        if(action === ':trainingPeaks:wod:success') {
            this.onSuccess(this.$indicatorTrainingPeaks);
        }
        if(action === ':trainingPeaks:wod:fail') {
            this.onFail(this.$indicatorTrainingPeaks);
        }
    }
    getSize() {
        const self = this;
        const parent = document.querySelector('#workouts-page');
        const em = 8;
        const px = parseFloat(window.getComputedStyle(parent).fontSize);
        // .getPropertyValue('font-size')
        const height = px * em;
        const width = self.getBoundingClientRect().width ?? window.innerWidth;
        return { width, height };
    }
    onFTP(ftp) {
        this.ftp = ftp;
        this.render();
    }
    onWindowResize() {
    }
    toListItem(workout, ftp, size) {
        const self = this;

        const id = workout.id;
        const name = workout.meta.name;
        const category = workout.meta.category;
        const description = workout.meta.description;

        let duration = '';
        if(workout.meta.duration) {
            duration = `${Math.round(workout.meta.duration / 60)} min`;
        }
        if(workout.meta.distance) {
            duration = `${(workout.meta.distance / 1000).toFixed(2)} km`;
        }

        const summary = `
        <div class="workout--name">${name}</div>
        <div class="workout--type">${category}</div>
        <div class="workout--duration">${duration}</div>`;

        const graph = `
            <workout-graph-svg>
                <div class="graph--info--cont"></div>
                ${self.viewModel.toSVG(workout, ftp, size)}
            </workout-graph-svg>`;

        const details = `
        ${graph}
        <div class="workout--description">${description}</div>`;

        return listItemTemplate(id, summary, details, 'li', 'planned-list-item');
    }
    toList() {
        const self = this;
        let list = '';
        const planned = this.model.list();
        for(let workout of planned) {
            list += self.toListItem(workout, self.ftp, self.size);
        }
        return list;
    }
    toEmpty() {
        return `<div class="planned--empty">
                    <p>You have no planned workouts for today.</p>
                </div>`;
    }
    render() {
        const self = this;

        if(this.checkVisibility()) {
            self.size = self.getSize();
        };

        if(empty(models.planned.data)) {
            self.innerHTML = self.toEmpty();
        } else {
            self.innerHTML = self.toList();
        }
    }
    onLoading($el) {
        $el.classList.remove('fail');
        $el.classList.remove('success');
        $el.classList.remove('none');
        $el.classList.add('loading');
    }
    onSuccess($el) {
        $el.classList.remove('off');
        $el.classList.remove('none');
        $el.classList.remove('loading');
        $el.classList.add('success');
    }
    onFail($el) {
        $el.classList.remove('success');
        $el.classList.remove('loading');
        $el.classList.remove('none');
        $el.classList.add('fail');
    }
}

customElements.define('planned-list', PlannedList);


// List Item that is expandable, selectable and has optional actions
class PlannedListItem extends HTMLElement {
    constructor() {
        super();
        this.isExpanded = false;
        this.isSelected = false;
        this.isOptions = false;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        // NOTE: assigning to this.id will set the id attribute of the html element,
        // we don't won't that
        this.wid = this.dataset.wid;
        this.$expandable = this.querySelector('.expandable');
        this.$optional = this.querySelector('.optional');
        this.$selectable = this.querySelector('.selectable');

        xf.sub(`action:li:${self.wid}`, self.onAction.bind(self), self.signal);
        xf.sub('db:workout',  self.onWorkout.bind(self), self.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onAction(action) {
        if(action === ':select') {
            this.onSelect();
            return;
        }
        if(action === ':remove') {
            this.onRemove();
            return;
        }
        if(action === ':toggle') {
            this.onToggle();
            return;
        }
        if(action === ':options') {
            this.onOptions();
            return;
        }
    }
    onWorkout(value) {

        this.selectedWorkoutId = value.id;

        if(this.wid === this.selectedWorkoutId) {
            this.select();
        } else {
            this.deselect();
        }
    }
    onSelect() {
        if(this.selected) return;
        this.select();
        xf.dispatch(`ui:planned:select`, this.wid);
    }
    select() {
        this.$selectable.classList.add('active');
        this.selected = true;
        this.expand();
    }
    deselect() {
        this.$selectable.classList.remove('active');
        this.selected = false;
    }
    onRemove() {
        console.log(`:remove`);
        // TODO: delete
    }
    onToggle() {
        this.isExpanded ? this.collapse() : this.expand();
    }
    onOptions() {
        this.isOptions ? this.hideOptions() : this.showOptions();
    }
    expand() {
        this.$expandable.classList.add('active');
        this.isExpanded = true;
    }
    collapse() {
        this.$expandable.classList.remove('active');
        this.isExpanded = false;
    }
    showOptions() {
        this.$optional.classList.toggle('active');
        this.isOptions = true;
    }
    hideOptions() {
        this.$optional.classList.toggle('active');
        this.isOptions = false;
    }
}

customElements.define('planned-list-item', PlannedListItem);


function listItemTemplate(
    id = 0,
    summary = '',
    details = '',
    topic = 'li',
    element = "planned-list-item",
) {
    return `<${element} class="active-list-item" data-wid="${id}">
                <div class="item--cont optional">
                    <div class="summary">
                        <view-action action=":toggle" topic=":${topic}:${id}" class="summary--data">
                            ${summary}
                            <view-action class="selectable" action=":select" topic=":${topic}:${id}" stoppropagation class="item--select" id="btn${id}">
                                <svg class="radio">
                                    <use class="off" href="#icon--radio-off" />
                                    <use class="on" href="#icon--radio-on" />
                                </svg>
                            </view-action>
                            <view-action action=":options" topic=":${topic}:${id}" stoppropagation class="item--options">
                                <svg class="control--btn--icon">
                                    <use href="#icon--options" />
                                </svg>
                            </view-action>
                        </view-action>
                    </div>
                    <div class="details expandable">${details}</div>
                </div>
                <div>
                    <view-action action=":remove" topic=":${topic}:${id}" class="optional--actions">
                        <span class="remove">Delete</span>
                    </view-action>
                </div>
            </${element}>`;
}

export {
    listItemTemplate,
};

