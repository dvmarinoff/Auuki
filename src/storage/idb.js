//
// IDB
//

import { exists, existance, empty, } from '../functions.js';
import { uuid } from './uuid.js';

function promisify(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = function(event) {
            return resolve(request.result);
        };
        request.onerror = function(event) {
            return reject(request.error);
        };
    });
}

function IDB(args = {}) {
    let db;

    function setDB(idb) {
        db = idb;
    }

    async function start(database = '', version = 1, stores = []) {
        if(!exists(database)) {
            throw new Error(`:idb idb.start() needs database name!`);
        };
        if(empty(database)) {
            throw new Error(`:idb idb.start() called with empty name!`);
        };
        if(db) {
            console.log(':idb closing existing connection...');
            db.close();
            db = null;
        }
        await open(database, version, stores);
    }

    function open(name, version, storeNames) {
        console.log(`:idb :open :db '${name}' :store-name '${storeNames}' ...`);
        let openReq = window.indexedDB.open(name, version);

        return new Promise((resolve, reject) => {
            openReq.onupgradeneeded = function(e) {
                setDB(openReq.result);
                console.log(`:idb :version ${db.version} :old ${e.oldVersion}`);

                switch(e.oldVersion) {
                // switch(db.version) {
                case 0: createStores(storeNames);
                case 1: update(storeNames);
                case 2: update(storeNames);
                case 3: latest(storeNames);
                }
            };
            openReq.onerror = function() {
                console.error(`:idb :error :open :db '${name}'`, openReq.error);
                return reject(openReq.error);
            };
            openReq.onsuccess = function() {
                setDB(openReq.result);
                console.log(`:idb :version ${db.version}`);
                return resolve(openReq.result);
            };
        });
    }

    function deleteStore(name) {
        let deleteReq = db.deleteObjectStore(name);

        return promisify(deleteReq).then(res => {
            console.log(`:idb :delete-store '${name}'`);
            return res;
        }).catch(err => {
            console.error(`:idb :error :delete-store '${name}'`, err);
            return {};
        });
    }

    function createStore(name, keyPath = 'id') {
        if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, {keyPath: keyPath});
            console.log(`:idb :create-store '${name}'`);
        } else {
            console.warn(`:idb :error :createStore 'trying to create store with existing name: ${name}'`);
        }
    }

    function createStores(storeNames, keyPaths = []) {
        storeNames.forEach((storeName, i) => {
            createStore(storeName, existance(keyPaths[i], 'id'));
        });
    }

    async function update(storeNames) {
        console.log(`:idb :update :stores ${storeNames}`);
        // create IndexedDB > db > session, workouts
        await createStores(storeNames);
    }

    function latest(storeNames) {
        console.log(`:idb :latest :stores ${storeNames}`);
    }

    function transaction(storeName, method, param = undefined, type = 'readonly') {
        if(!db.objectStoreNames.contains(storeName)) return undefined;

        let transaction = db.transaction(storeName, type);
        let store = transaction.objectStore(storeName);
        let req;

        if(param === undefined) {
            req = store[method]();
        } else {
            req = store[method](param);
        }

        return promisify(req).then(res => {
            console.log(`:idb :${method} :store '${storeName}' :success`);
            return res;
        }).catch(err => {
            console.error(`:idb :error :${method} :store '${storeName}'`, err);
            return [];
        });
    }

    function add(storeName, item) {
        return transaction(storeName, 'add', item, 'readwrite');
    }

    function put(storeName, item) {
        return transaction(storeName, 'put', item, 'readwrite');
    }

    function get(storeName, key) {
        return transaction(storeName, 'get', key, 'readonly');
    }

    function getAll(storeName) {
        return transaction(storeName, 'getAll', undefined, 'readonly');
    }

    function remove(storeName, id) {
        return transaction(storeName, 'delete', id, 'readwrite');
    }

    function clear(storeName) {
        return transaction(storeName, 'clear', undefined, 'readwrite');
    }

    function setId(item, id = undefined) {
        if(!exists(item.id)) {
            if(!exists(id)) {
                id = uuid();
            };
            item.id = id;
            console.log(`:idb :setId`, id);
        }
        return item;
    }

    return Object.freeze({
        start,
        open,
        createStore,
        deleteStore,
        add,
        put,
        get,
        getAll,
        remove,
        clear,
        setId,
    });
}

const idb = IDB();

export { idb };
