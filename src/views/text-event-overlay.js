import { xf } from '../functions.js';

class TextEventOverlay extends HTMLElement {
    connectedCallback() {
        this.dismissTimer = null;
        this.signal       = { signal: (new AbortController()).signal };

        xf.sub('watch:textEvent',   this.onTextEvent.bind(this),  this.signal);
        xf.sub('watch:stopped',     this.onClear.bind(this),      this.signal);
        xf.sub('workout:done',      this.onClear.bind(this),      this.signal);
        xf.sub('ui:watchPause',     this.onPause.bind(this),      this.signal);
    }

    onTextEvent(event) {
        const message  = event.message  ?? '';
        const duration = event.duration ?? 10;

        if(this.dismissTimer) {
            clearTimeout(this.dismissTimer);
        }

        this.textContent = message;
        this.classList.add('visible');

        this.dismissTimer = setTimeout(() => {
            this.onClear();
        }, duration * 1000);
    }

    onPause() {
        if(this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
    }

    onClear() {
        if(this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
        this.classList.remove('visible');
        this.textContent = '';
    }
}

customElements.define('text-event-overlay', TextEventOverlay);
