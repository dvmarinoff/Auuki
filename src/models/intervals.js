import { xf, print, } from '../functions.js';
import { isoDate, } from '../utils.js';
import { OAuthService, DialogMsg, stateParam, } from './enums.js';

function Intervals(args = {}) {
    const config = args.config;
    const api_uri = config.API_URI;
    const pwa_uri = config.PWA_URI;
    const intervals_client_id = config.INTERVALS_CLIENT_ID;
    const serviceName = OAuthService.intervals;

    // Step D
    async function connect() {
        const scope = 'ACTIVITY:WRITE,CALENDAR:READ';
        const state = stateParam.encode(serviceName);
        stateParam.store(state);

        const url =
              'https://intervals.icu/oauth/authorize' +
              '?' +
              new URLSearchParams({
                  client_id: intervals_client_id,
                  redirect_uri: pwa_uri,
                  scope,
                  state,
              }).toString();
        window.location.replace(url);
    }

    async function disconnect() {
        // TODO:
        const url = "https://intervals.icu/oauth/deauthorize";
    }

    // Step 3
    async function paramsHandler(args = {}) {
        const state = args.state ?? '';
        const code = args.code ?? '';
        const scope = args.scope ?? '';

        const url = `${api_uri}/api/intervals/oauth/code` +
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
            print.log(result);
            clearParams();
        } catch (e) {
            console.log(``, e);
        }
    }

    function clearParams() {
        window.history.pushState({}, document.title, window.location.pathname);
    }

    async function uploadWorkout(blob) {
        const url = `${api_uri}/api/intervals/upload`;

        const formData = new FormData();
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
        } catch(error) {
            console.log(error);
            return ':fail';
        }
    }

    async function wod() {
        const oldest = isoDate();
        const newest = isoDate();

        const url = `${api_uri}/api/intervals/events` +
              '?' +
              new URLSearchParams({
                  oldest,
                  newest,
              })
              .toString();

        try {
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
            });

            if(response.ok) {
                const data = await response.json();
                console.log(data);
                return data;
            } else {
                if(response.status === 403) {
                    console.log(`:api :no-auth`);
                    xf.dispatch('action:auth', ':password:login');
                    xf.dispatch('ui:modal:error:open', DialogMsg.noAuth);
                }
                return [];
            }
        } catch(error) {
            console.log(error);
            return [];
        }
    }

    async function wodMock() {
        const body = [{
            id: 47549572,
            start_date_local: `${isoDate()}T00:00:00`,
            category: "WORKOUT",
            name: "Intervals.icu Threshold",
            indoor: true,
            workout_filename: "Intervals_icu_Threshold.zwo",
            workout_file_base64: "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8d29ya291dF9maWxlPgogICAgPGF1dGhvcj5EaW1pdGFyIE1hcmlub3Y8L2F1dGhvcj4KICAgIDxuYW1lPkludGVydmFscy5pY3UgVGhyZXNob2xkPC9uYW1lPgogICAgPGRlc2NyaXB0aW9uPjwvZGVzY3JpcHRpb24+CiAgICA8c3BvcnRUeXBlPmJpa2U8L3Nwb3J0VHlwZT4KICAgIDx0YWdzLz4KICAgIDx3b3Jrb3V0PgogICAgICAgIDxXYXJtdXAgUG93ZXJIaWdoPSIwLjYyNyIgUG93ZXJMb3c9IjAuMzg5IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC42MjciIER1cmF0aW9uPSI2MCIvPgogICAgICAgIDxTdGVhZHlTdGF0ZSBzaG93X2F2Zz0iMSIgUG93ZXI9IjAuOTc4IiBEdXJhdGlvbj0iMzAiLz4KICAgICAgICA8U3RlYWR5U3RhdGUgc2hvd19hdmc9IjEiIFBvd2VyPSIwLjUiIER1cmF0aW9uPSIzMCIvPgogICAgICAgIDxTdGVhZHlTdGF0ZSBzaG93X2F2Zz0iMSIgUG93ZXI9IjAuOTc4IiBEdXJhdGlvbj0iMzAiLz4KICAgICAgICA8U3RlYWR5U3RhdGUgc2hvd19hdmc9IjEiIFBvd2VyPSIwLjUiIER1cmF0aW9uPSIzMCIvPgogICAgICAgIDxTdGVhZHlTdGF0ZSBzaG93X2F2Zz0iMSIgUG93ZXI9IjAuNTU5IiBEdXJhdGlvbj0iMTIwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMS4wIiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC41IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMS4wIiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC41IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMS4wIiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC41IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMS4wIiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC41IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMS4wIiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPFN0ZWFkeVN0YXRlIHNob3dfYXZnPSIxIiBQb3dlcj0iMC41IiBEdXJhdGlvbj0iMzAwIi8+CiAgICAgICAgPENvb2xkb3duIFBvd2VySGlnaD0iMC4zODkiIFBvd2VyTG93PSIwLjUiIER1cmF0aW9uPSIzMDAiLz4KICAgIDwvd29ya291dD4KPC93b3Jrb3V0X2ZpbGU+Cg==" }
        ];

        return body;
    }

    return Object.freeze({
        connect,
        disconnect,
        paramsHandler,
        uploadWorkout,
        wod,

        wodMock,
    });
}

export default Intervals;

