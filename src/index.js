import { xf } from './functions.js';
import './db.js';
import './views/views.js';
import './views/workout-creator.js';
import './ble/devices.js';
import './watch.js';
import './course.js';
import './lock.js';
import { userManager } from './models/user.js';
import { setGlobalContext } from './storage/local-storage.js';

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

    // Initialize User Management
    let users = userManager.getUsers();
    if (users.length === 0) {
        console.warn('No users found. Creating Default User.');
        userManager.createUser('Default User');
        users = userManager.getUsers();
    }
    
    // Select last active user, or the first one available
    let activeUser = userManager.getLastUser();
    if (!activeUser && users.length > 0) {
        activeUser = users[0];
    }
    
    if (activeUser) {
        userManager.selectUser(activeUser.id);
        console.log(`Current User: ${activeUser.name} (${activeUser.id})`);
    }

    // Set storage context for LocalStorageItem
    setGlobalContext(() => userManager.getStoragePrefix());


    // Check for test mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestMode = urlParams.get('test') === 'true';

    if (isTestMode) {
        console.warn('RUNNING IN TEST MODE');
        import('./views/simulation-panel.js').then(() => {
            // Find the header to inject the panel after
            const header = document.querySelector('.connections-header');
            if (header) {
                const panel = document.createElement('simulation-panel');
                header.insertAdjacentElement('afterend', panel);
            }
        });
    }

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

