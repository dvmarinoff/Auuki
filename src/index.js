import { xf } from './functions.js';
import './db.js';
import './views/views.js';
import './views/workout-creator.js';
import './ble/devices.js';
import './watch.js';
import './course.js';
import './lock.js';

function startServiceWorker() {
    if('serviceWorker' in navigator) {
        try {
            // const reg = navigator.serviceWorker.register('./sw.js');

            const reg = navigator.serviceWorker.register(
                new URL('./sw.js', import.meta.url),
                {type: 'module'}
            );

            console.log(`SW: register success.`);
            console.log('Cache Version: Flux-v003');
        } catch(err) {
            console.log(`SW: register error: `, err);
        }
    };
}

function start() {
    console.log('start app.');

    // startServiceWorker(); // stable version only
    xf.dispatch('app:start');
}

function stop() {
    xf.dispatch('app:stop');
}

start();

export {
    start,
    stop,
};


document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('#open-creator-btn');
    if(btn) {
        btn.addEventListener('click', () => {
             xf.dispatch('ui:open-workout-creator');
        });
    }
});

