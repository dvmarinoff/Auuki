import { xf, once, } from '../functions.js';
import { OAuthService, DialogMsg, stateParam, } from './enums.js';
import config from './config.js';

function Strava(args = {}) {
    const serviceName = OAuthService.strava;
    const api_uri = config.get().API_URI;
    const pwa_uri = config.get().PWA_URI;
    let strava_client_id = config.get().STRAVA_CLIENT_ID;

    const update = function() {
        strava_client_id = config.get().STRAVA_CLIENT_ID;
    };

    // Step D
    async function connect() {
        const scope = 'activity:write';
        const state = stateParam.encode(serviceName);
        stateParam.store(state);

        const url =
              'https://www.strava.com/oauth/authorize' +
              '?' +
              new URLSearchParams({
                  client_id: strava_client_id,
                  redirect_uri: pwa_uri,
                  response_type: 'code',
                  state,
                  scope,
              }).toString();
        window.location.replace(url);
    }

    async function disconnect() {
        try {
            const apiResponse = await fetch(
                api_uri+`/api/strava/deauthorize`,
                {method: 'POST', credentials: 'include',},
            );

            if(apiResponse.ok) {
                xf.dispatch(`services`, {strava: false});
            } else {
                console.log(`:strava :deauthorize :error `, apiResponse.status);
            }
        } catch (e) {
            console.log(`:strava :deauthorize :error `, e);
        }
    }

    // Step 3
    async function paramsHandler(args = {}) {
        const state = args.state ?? '';
        const code = args.code ?? '';
        const scope = args.scope ?? '';

        const url = `${api_uri}/api/strava/oauth/code` +
              '?' +
              new URLSearchParams({
                  state: state,
                  code: code,
                  scope: scope,
              })
              .toString();

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
            });

            const result = await response.text();
            console.log(`:oauth :strava :connnect`);
            xf.dispatch(`services`, {strava: true});
            console.log(result);
            clearParams();
        } catch (e) {
            console.log(`:strava :oauth :code :error `, e);
        }
    }

    function clearParams() {
        window.history.pushState({}, document.title, window.location.pathname);
    }

    async function uploadWorkout(record) {
        const blob = record.blob;
        const workoutName = record.summary?.name ?? 'Powered by Auuki workout';
        const url = `${api_uri}/api/strava/upload`;

        const formData = new FormData();
        formData.append('name', workoutName);
        formData.append('file', blob);

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if(response.ok) {
                return ':success';
            } else {
                if(response.status === 403) {
                    console.log(`:api :no-auth`);
                    xf.dispatch('action:auth', ':password:login');

                    xf.dispatch('ui:modal:error:open', DialogMsg.noAuth);
                }
                return ':fail';
            }
        } catch(e) {
            console.log(`:strava :upload :error `, e);
            return ':fail';
        }
    }

    return Object.freeze({
        connect,
        disconnect,
        paramsHandler,
        uploadWorkout,
        update,
    });
}

const strava = Strava();

export default strava;

