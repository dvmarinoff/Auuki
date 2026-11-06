import { exists, equals, xf, print, } from '../functions.js';
import { OAuthService, DialogMsg, stateParam, } from './enums.js';
import { uuid } from '../storage/uuid.js';
import config from './config.js';
import strava from './strava.js';
import intervals from './intervals.js';
import trainingPeaks from './training-peaks.js';
import auth from './auth.js';

function API() {
    const router = Router();

    async function start() {
        router.start();
    }

    function stop() {
    }

    return Object.freeze({
        auth,
        strava,
        intervals,
        trainingPeaks,
        start,
        stop,
    });
}

// TODO: create a proper minimalist router
function Router(args = {}) {

    async function start() {
        const secrets = takeSecretsFromAddress();
        const status = await auth.status();

        if(secrets.verify !== '') {
            xf.dispatch('ui:page-set', 'settings');
            xf.dispatch('action:nav', 'settings:profile');
            await auth.verifyEmail(secrets.verify);
            return;
        }
        if(secrets.token !== '') {
            xf.dispatch('ui:page-set', 'settings');
            xf.dispatch('action:nav', 'settings:profile');
            xf.dispatch('action:auth', ':password:reset');
            return;
        }

        const params = getParams();
        if(hasParams(params)) {
            await onQueryParams(params);
        } else {
            // TODO: remove
            // get list of planned events once per period
            if(status.intervals) {
            }
        }
        return;
    }

    function getParams() {
        return (new URL(document.location)).searchParams;
    }

    function hasParams(params) {
        if(params) {
            return params.size > 0;
        } else {
            const params = (new URL(document.location)).searchParams;
            return params.size > 0;
        }
    }

    async function onQueryParams(params) {
        // strava params
        const state  = params.get('state');
        const code   = params.get('code');
        const scope  = params.get('scope');
        const error  = params.get('error');
        // switch
        if(error) {
            console.error(`:api :param :error `, error);
            clearParams();
            return true;
        }
        if(code || scope || state) {
            if(!stateParam.consume(state)) {
                console.error(`:api :param :state`);
                clearParams();
                return true;
            }
            const { service } = stateParam.decode(state);
            console.log(`:api :onQueryParams service: ${service}`);

            if(equals(service, OAuthService.strava)) {
                await strava.paramsHandler({state, code, scope});
            }
            if(equals(service, OAuthService.intervals)) {
                await intervals.paramsHandler({state, code, scope});
            }
            if(equals(service, OAuthService.trainingPeaks)) {
                await trainingPeaks.paramsHandler({state, code, scope});
            }
            return true;
        }
        return false;
    }

    function takeSecretsFromAddress() {
        const secrets = auth.readAuthSecrets(String(document.location.href));
        if(secrets.token !== '') {
            auth.holdResetToken(secrets.token);
        }
        if(secrets.clear) {
            window.history.replaceState({}, document.title, secrets.pathname);
        }
        return secrets;
    }

    function clearParams() {
        window.history.pushState({}, document.title, window.location.pathname);
    }

    return Object.freeze({
        onQueryParams,
        clearParams,
        start,
    });
}

export default API;
