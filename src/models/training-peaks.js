import { xf, exists, } from '../functions.js';
import { isoDate, } from '../utils.js';
import { OAuthService, DialogMsg, stateParam, } from './enums.js';
import config from './config.js';

function TrainingPeaks(args = {}) {
    const serviceName = OAuthService.trainingPeaks;
    const api_uri = config.get().API_URI;
    const pwa_uri = config.get().PWA_URI;
    let training_peaks_client_id = config.get().TRAINING_PEAKS_CLIENT_ID;

    const update = function() {
        training_peaks_client_id = config.get().TRAINING_PEAKS_CLIENT_ID;
    };

    // Step D
    async function connect() {
        const scope = 'file:write workouts:wod';
        const state = stateParam.encode(serviceName);
        stateParam.store(state);

        const url =
              'https://oauth.sandbox.trainingpeaks.com/OAuth/Authorize' +
              '?' +
              new URLSearchParams({
                  response_type: 'code',
                  client_id: training_peaks_client_id,
                  scope,
                  redirect_uri: pwa_uri,
                  state,
              }).toString();
        window.location.replace(url);
    }

    async function disconnect() {
        try {
            const apiResponse = await fetch(
                api_uri+`/api/trainingpeaks/deauthorize`,
                {method: 'POST', credentials: 'include',},
            );

            if(apiResponse.ok) {
                xf.dispatch(`services`, {trainingPeaks: false});
            } else {
                console.log(`:trainingPeaks :deauthorize :error `, apiResponse.status);
            }
        } catch (e) {
            console.log(`:trainingPeaks :deauthorize :error `, e);
        }
    }

    // Step 3
    async function paramsHandler(args = {}) {
        const state = args.state ?? '';
        const code = args.code ?? '';
        const scope = args.scope ?? '';

        const url = `${api_uri}/api/trainingpeaks/oauth/code` +
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

            if(response.ok) {
                console.log(`:oauth :trainingPeaks :connnect`);
                xf.dispatch(`services`, {trainingPeaks: true});
            } else {
                console.log(`:trainingPeaks :oauth :code :error `, response.status);
            }
            clearParams();
        } catch (e) {
            console.log(`:trainingPeaks :oauth :code :error `, e);
        }
    }

    function clearParams() {
        window.history.pushState({}, document.title, window.location.pathname);
    }

    async function uploadWorkout(record) {
        const blob = record.blob;
        const workoutName = record.summary?.name ?? 'Powered by Auuki workout';
        const url = `${api_uri}/api/trainingpeaks/upload`;

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
            console.log(`:trainingPeaks :upload :error `, e);
            return ':fail';
        }
    }

    async function wod(oldest = isoDate(), newest = isoDate()) {
        const url = `${api_uri}/api/trainingpeaks/wod` +
              '?' +
              new URLSearchParams({
                  oldest,
                  newest,
              }).toString();

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
            });

            if(response.ok) {
                const data = await response.json();
                xf.dispatch('action:planned', ':trainingPeaks:wod:success');
                return data.filter((item) => exists(item.workout_file_base64));
            } else {
                xf.dispatch('action:planned', ':trainingPeaks:wod:fail');
                if(response.status === 403) {
                    console.log(`:api :no-auth`);
                    xf.dispatch('action:auth', ':password:login');
                    xf.dispatch('ui:modal:error:open', DialogMsg.noAuth);
                }
                return [];
            }
        } catch(error) {
            xf.dispatch('action:planned', ':trainingPeaks:wod:fail');
            console.log(`:trainingPeaks :wod :error `, error);
            return [];
        }
    }

    return Object.freeze({
        connect,
        disconnect,
        paramsHandler,
        uploadWorkout,
        update,
        wod,
    });
}

const trainingPeaks = TrainingPeaks();

export default trainingPeaks;

