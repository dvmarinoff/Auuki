const cacheName = 'Flux-v008';
const resources = [
    './',
    'index.html',
    'privacy.html',
    'css/flux.css',

    'images/connections/garmin-connect.png',
    'images/logo/logo-192px.png',
    'images/logo/logo-512px.png',
    'images/logo/logo-1024px.png',
    'favicon-16.png',
    'favicon-32.png',
    'favicon-64.png',
    'favicon-180.png',
    'index.js',

    'activity/enums.js',

    'ant/ant.js',
    'ant/channel.js',
    'ant/common.js',
    'ant/constants.js',
    'ant/controllable.js',
    'ant/device.js',
    'ant/fec-channel.js',
    'ant/fec.js',
    'ant/hrm-channel.js',
    'ant/hrm.js',
    'ant/message.js',
    'ant/polyfill.js',
    'ant/search-channel.js',
    'ant/types.js',
    'ant/web-serial.js',
    'ant/web-usb.js',

    'ble/bas/bas.js',
    'ble/bas/battery-level.js',

    'ble/cps/control-point.js',
    'ble/cps/cps.js',
    'ble/cps/cycling-power-feature.js',
    'ble/cps/cycling-power-measurement.js',

    'ble/cscs/feature.js',
    'ble/cscs/measurement.js',
    'ble/cscs/cscs.js',

    'ble/ct/core-body-temperature.js',
    'ble/ct/ct.js',

    'ble/dis/dis.js',

    'ble/fec/fec.js',
    'ble/fec/message.js',
    'ble/fec/messages.js',

    'ble/ftms/control-point.js',
    'ble/ftms/fitness-machine-feature.js',
    'ble/ftms/fitness-machine-status.js',
    'ble/ftms/ftms.js',
    'ble/ftms/indoor-bike-data.js',
    'ble/ftms/supported-ranges.js',

    'ble/hrs/heartRateMeasurement.js',
    'ble/hrs/hrs.js',

    'ble/moxy/moxy.js',
    'ble/moxy/smo2.js',

    'ble/obc/controls.js',
    'ble/obc/obc.js',
    'ble/obc/training-controls.js',
    'ble/obc/ui-controls.js',
    'ble/obc/virtual-gear-shifting.js',

    'ble/rcs/race-controller-measurement.js',
    'ble/rcs/rcs.js',

    'ble/wcps/control.js',
    'ble/wcps/wcps.js',

    'ble/characteristic.js',
    'ble/common.js',
    'ble/connectable.js',
    'ble/devices.js',
    'ble/enums.js',
    'ble/reactive-connectable.js',
    'ble/reactive-connectable.js',
    'ble/service.js',
    'ble/userData.js',
    'ble/web-ble.js',

    // 'css/flux.css',

    'fit/common.js',
    'fit/crc.js',
    'fit/data-record.js',
    'fit/definition-record.js',
    'fit/field-definition.js',
    'fit/file-header.js',
    'fit/fit.js',
    'fit/fitjs.js',
    'fit/local-activity.js',
    'fit/local-course.js',
    'fit/record-header.js',
    'fit/profiles/base-types.js',
    'fit/profiles/global-field-definitions.js',
    'fit/profiles/global-message-definitions.js',
    'fit/profiles/global-type-definitions.js',
    'fit/profiles/product-message-definitions.js',
    'fit/profiles/profiles.js',

    'models/api.js',
    'models/auth.js',
    'models/config.js',
    'models/enums.js',
    'models/intervals.js',
    'models/models.js',
    'models/strava.js',
    'models/training-peaks.js',

    'storage/idb.js',
    'storage/local-storage.js',
    'storage/uuid.js',

    'views/active-list-item.js',
    'views/activity-list.js',
    'views/ant-device-scan.js',
    'views/auth-forms.js',
    'views/connection-switch.js',
    'views/data-views.js',
    'views/editor.js',
    'views/effect-views.js',
    'views/graph.js',
    'views/keyboard.js',
    'views/moxy-graph.js',
    'views/planned-list.js',
    'views/tabs.js',
    'views/views.js',
    'views/watch.js',
    'views/workout-graph-svg.js',
    'views/workout-graph.js',
    'views/workout-list.js',

    'workouts/workouts.js',
    'workouts/zwo.js',

    'course.js',
    'db.js',
    'file.js',
    'functions.js',
    'lock.js',
    'physics.js',
    'sound.js',
    'timer.js',
    'utils.js',
    'watch.js',

    'manifest.webmanifest',
];

self.addEventListener('install', e => {
    console.log('SW: Install.');

    e.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(resources)));
});

self.addEventListener('activate', e => {
    console.log('SW: Activate.');

    e.waitUntil(
        caches.keys().then((keyList) => {
                Promise.all(keyList.map((key) => {
                    console.log(key);
                    if (key === cacheName) { return; }
                    console.log(`deleting cache ${key}.`);
                    caches.delete(key);
                }));
            }));
});

self.addEventListener('fetch', e => {
    console.log(`SW: fetch: `, e.request.url);

    // Cache falling back to the Network
    e.respondWith(
        caches.match(e.request)
            .then(cachedResource => {
                if(cachedResource) {
                    return cachedResource;
                }
                return fetch(e.request);
            }));

    // Network falling back to the Cache
    // e.respondWith(
    //     fetch(e.request).catch(function() {
    //         return caches.match(e.request);
    //     }));
});
