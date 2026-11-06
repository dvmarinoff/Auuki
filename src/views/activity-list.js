import { xf, formatDate, escapeHtml, } from '../functions.js';
import { models } from '../models/models.js';
import { formatTime, } from '../utils.js';

class ActivityList extends HTMLElement {
    constructor() {
        super();
        this.capacity = 3;
        this.index = 0;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.sub('activity:add', self.onAdd.bind(this), this.signal);
        xf.sub('db:activity', self.onRestore.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
        this.unsubs();
    }
    onAdd(activity) {
        const self = this;
        self.insertAdjacentHTML("afterbegin", self.template(this.index, activity));
        xf.dispatch(`action:activity:${this.id(activity)}`, ':toggleExpand');

        if(this.childElementCount > 3) {
            self.removeChild(self.lastElementChild);
        }

        this.index++;
    }
    onRestore(activities) {
        const self = this;
        activities.forEach((a) => {
            self.insertAdjacentHTML("beforeend", self.template(this.index, a));
        });
    }
    id(data) {
        return data.id;
    }
    name(data) {
        return data.name;
    }
    date(data) {
        return formatDate({
            date: new Date(data.timestamp),
            separator: '/',
            year: false,
        });
    }
    duration(data) {
        return `${Math.ceil(data.duration / 60)} min`;
    }
    uploadStatus(data) {
        return data.status;
    }
    template(i, data) {
        const status = this.uploadStatus(data);
        const id = escapeHtml(this.id(data));
        const name = escapeHtml(this.name(data));
        const intervalsStatus = escapeHtml(status.intervals ?? 'none');
        const stravaStatus = escapeHtml(status.strava ?? 'none');
        const trainingPeaksStatus = escapeHtml(status.trainingPeaks ?? 'none');

        return `
            <activity-item id="i${i}--activity--item" class="some" data-id="${id}">
                    <div class="activity--cont list--row--outer">
                        <div class="list--row--inner activity--info">
                            <div class="activity--info--short">
                                <view-action
                                    class="info"
                                    action=":toggleExpand"
                                    topic=":activity:${id}">
                                    <div id="i${i}--activity--date" class="activity--name">
                                        ${name}
                                    </div>
                                    <div class="activity--date">
                                        ${this.date(data)}
                                    </div>
                                    <div id="i${i}--activity--duration" class="activity--duration">
                                        ${this.duration(data)}
                                    </div>
                                </view-action>
                                <view-action
                                    class=""
                                    action=":options"
                                    topic=":activity:${id}">
                                    <svg class="control--btn--icon" width="24" height="24">
                                        <use href="#icon--options" />
                                    </svg>
                                </view-action>
                            </div>
                            <div class="activity--info--full">
                                <div class="activity--image">
                                </div>
                                <div class="activity--actions">
                                    <div></div>
                                    <view-action
                                        class="activity--action action--intervals"
                                        action=":intervals:upload"
                                        topic=":activity:${id}">
                                        <svg class="activity--icon intervals--icon" width="24" height="24">
                                            <use href="#icon--intervals" />
                                        </svg>
                                        <div class="connection-icon-switch--indicator ${intervalsStatus} intervals"></div>
                                    </view-action>

                                    <view-action
                                        class="activity--action"
                                        action=":strava:upload"
                                        topic=":activity:${id}">
                                        <svg class="activity--icon strava--icon" width="24" height="24">
                                            <use href="#icon--strava" />
                                        </svg>
                                        <div class="connection-icon-switch--indicator ${stravaStatus} strava"></div>
                                    </view-action>
                                    <!--
                                    <view-action
                                        class="activity--action"
                                        action=":trainingPeaks:upload"
                                        topic=":activity:${id}">
                                        <div class="tp-logo--icon">TP</div>
                                        <div class="connection-icon-switch--indicator ${trainingPeaksStatus} tp"></div>
                                    -->
                                    </view-action>
                                    <view-action
                                        class="activity--action action--download"
                                        action=":download"
                                        topic=":activity:${id}">
                                        <svg class="activity--icon">
                                            <use href="#icon--save-btn" />
                                        </svg>
                                    </view-action>
                                    <view-action
                                        class="activity--action action--image"
                                        action=":image"
                                        topic=":activity:${id}">
                                        <svg class="activity--icon">
                                            <use href="#icon--image" />
                                        </svg>
                                    </view-action>
                                </div> <!-- end activity--actions -->
                            </div> <!-- end activity--info--full -->
                        </div> <!-- end activity--info -->
                    </div> <!-- end activity--cont -->
                    <view-action
                        class="activity--options"
                        action=":remove"
                        topic=":activity:${id}">
                        <span class="activity--remove">Delete</span>
                    </view-action>
            </activity-item>
        `;
    }
}

customElements.define('activity-list', ActivityList);

class ActivityItem extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$indicatorStrava = this.querySelector(`.connection-icon-switch--indicator.strava`);
        this.$indicatorIntervals = this.querySelector(`.connection-icon-switch--indicator.intervals`);

        this.$indicatorTP = this.querySelector(`.connection-icon-switch--indicator.tp`);
        this.id = this.dataset.id;

        xf.sub(`action:activity:${self.id}`, this.onAction.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onAction(action) {
        console.log(action, this.id);

        if(action === ':options') {
            this.classList.toggle('options');
            return;
        }
        if(action === ':toggleExpand') {
            this.classList.toggle('expand');
            return;
        }
        if(action === ':remove') {
            // TODO: refactor to a functional state driven approach
            models.activity.remove(this.id);
            this.remove();
            return;
        }

        if(action === ':download') {
            models.activity.download(this.id);
            return;
        }
        if(action === ':strava:upload') {
            models.activity.upload('strava', this.id);
            this.onLoading(this.$indicatorStrava);
            return;
        }
        if(action === ':intervals:upload') {
            models.activity.upload('intervals', this.id);
            this.onLoading(this.$indicatorIntervals);
            return;
        }
        if(action === ':trainingPeaks:upload') {
            models.activity.upload('trainingPeaks', this.id);
            this.onLoading(this.$indicatorTP);
            return;
        }

        if(action === ':strava:upload:success') {
            this.onSuccess(this.$indicatorStrava);
        }
        if(action === ':strava:upload:fail') {
            this.onFail(this.$indicatorStrava);
        }
        if(action === ':intervals:upload:success') {
            this.onSuccess(this.$indicatorIntervals);
        }
        if(action === ':intervals:upload:fail') {
            this.onFail(this.$indicatorIntervals);
        }
        if(action === ':trainingPeaks:upload:success') {
            this.onSuccess(this.$indicatorTP);
        }
        if(action === ':trainingPeaks:upload:fail') {
            this.onFail(this.$indicatorTP);
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

customElements.define('activity-item', ActivityItem);
