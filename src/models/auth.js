import { exists, equals, xf, once, print, } from '../functions.js';
import { DialogMsg } from './enums.js';
import { uuid } from '../storage/uuid.js';
import config from './config.js';
import strava from './strava.js';
import intervals from './intervals.js';
import trainingPeaks from './training-peaks.js';

function Auth(args = {}) {
    const api_uri = config.get().API_URI;
    const pwa_uri = config.get().PWA_URI;
    const turnstile_site_key = config.get().TURNSTILE_SITE_KEY;

    let _loggedIn = false;
    let _hasApi = true;

    let _turnstileLoaded = false;
    let _turnstileId;
    let _expired = true;

    function loadTurnstile() {
        if(!_loggedIn && _hasApi && !_turnstileLoaded) {
            console.log(`:turnstile :load`);

            const script = document.createElement('script');
            script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstile`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    };

    window.onloadTurnstile = function() {
        console.log(`:turnstile :onload`);
        _turnstileLoaded = true;
        renderTurnstile();
    };

    function renderTurnstile() {
        if('turnstile' in window) {
            console.log(`:turnstile :render ${_turnstileId}`);

            _turnstileId = window.turnstile.render('#cf-turnstile-container', {
                sitekey: turnstile_site_key,
            });

            _expired = false;
        }
    }

    function resetTurnstile() {
        if('turnstile' in window) {
            console.log(`:turnstile :reset ${_turnstileId}`);
            window.turnstile.reset(_turnstileId);
            _expired = false;
        }
    }
    function isTurnstileExpired() {
        if('turnstile' in window) {
            console.log(`:turnstile :reset ${_turnstileId}`);
            _expired = window.turnstile.isExpired(_turnstileId);
            return _expired;
        }
        return true;
    }

    function removeTurnstile() {
        if('turnstile' in window) {
            console.log(`:turnstile :remove ${_turnstileId}`);
            window.turnstile.remove(_turnstileId);
            _expired = true;
        }
    }


    function isBrowser() {
        return (
            ('bluetooth' in navigator) && ('wakeLock' in navigator)
        );
    }

    // {data: {FormData}} -> Void
    async function register(args = {}) {
        const url = `${api_uri}/api/register`;
        const data = args.data;

        if(data.email.trim() === '' ||
            data.password.trim() === '' ||
            data.password_confirmation.trim() === '' ||
            !isBrowser()
            ) {
            console.log(`:register :blocked :is-browser ${isBrowser()}`);
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify(data),
            });

            const status = response.status;
            const json = await response.json();

            if(json.error) {
                console.log(':api :register :error');
                xf.dispatch('action:auth', ':error');
                return;
            }
            if(json?.result?.success) {
                console.log(':api :register :success');
                xf.dispatch('action:auth', ':password:verify-sent');
                return;
            }

            console.log(`register: :none`);
        } catch(error) {
            console.log(error);
        }
    }

    // {data: {FormData}} -> Void
    async function login(args = {}) {
        const url = `${api_uri}/api/login`;
        const data = args.data;

        if(data.email.trim() === '' ||
           data.password.trim() === '' ||
           !isBrowser()) {
            console.log(`:login :blocked :is-browser ${isBrowser()}`);
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                credentials: 'include',
                body: JSON.stringify(data),
            });

            const json = await response.json();

            if(json.error) {
                if(equals(json.error.message, 'EMAIL_NOT_VERIFIED')) {
                    console.log(`:api :login :unverified`);
                    xf.dispatch('action:auth', ':password:login-unverified');
                    return;
                }
                console.log(`:api :login :error`);
                xf.dispatch('action:auth', ':error');
                return;
            }

            if(json?.result?.success) {
                console.log(`:api :login :success`);
                xf.dispatch('action:auth', ':password:profile');
                status();
                return;
            }

            console.log(`:api :login :none`);
        } catch(error) {
            console.log(error);
        }
    }

    async function deleteAccount() {
        const url = `${api_uri}/api/account/delete`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                credentials: 'include',
                body: JSON.stringify({delete: true}),
            });

            if(!response.ok) {
                console.log(`:api :delete-account :fail :with ${response.status}`);
                xf.dispatch('action:auth', ':error');
                return;
            }

            const result = await response.json();
            if(!result?.result?.success) {
                console.log(`:api :delete-account :fail`);
                xf.dispatch('action:auth', ':error');
                return;
            }

            console.log(`:api :delete-account :success`);
            xf.dispatch('account', {identifier: ''});
            xf.dispatch('action:auth', ':password:logout');

            _loggedIn = false;

            if(_turnstileLoaded) {
                renderTurnstile();
            } else {
                loadTurnstile();
            }

            status();
        } catch(error) {
            console.log(error);
            xf.dispatch('action:auth', ':error');
        }
    }

    async function logout() {
        const url = `${api_uri}/api/logout`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                credentials: 'include',
                body: JSON.stringify({logout: true}),
            });

            // 403 means the cookie was already rejected, so the person is logged out.
            if(!response.ok && !equals(response.status, 403)) {
                console.log(`:api :logout :fail :with ${response.status}`);
                xf.dispatch('action:auth', ':error');
                return;
            }

            if(response.ok) {
                const result = await response.json();
                if(!equals(result?.result?.logout, true)) {
                    console.log(`:api :logout :fail`);
                    xf.dispatch('action:auth', ':error');
                    return;
                }
            }

            console.log(`:api :logout :success`);
            xf.dispatch('account', {identifier: ''});
            xf.dispatch('action:auth', ':password:logout');

            _loggedIn = false;

            if(_turnstileLoaded) {
                renderTurnstile();
            } else {
                loadTurnstile();
            }

            status();
        } catch(error) {
            console.log(error);
            xf.dispatch('action:auth', ':error');
        }
    }

    // The confirmation secret arrives from the address bar. It is not written to the console.
    async function verifyEmail(rawToken) {
        const url = `${api_uri}/api/verify-email`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify({token: rawToken}),
            });

            if(response.ok) {
                const json = await response.json();
                if(equals(json?.result?.success, true)) {
                    console.log(`:api :verify :success`);
                    xf.dispatch('action:auth', ':password:verify-ok');
                    return;
                }
            }

            console.log(`:api :verify :fail`);
            xf.dispatch('action:auth', ':password:verify-fail');
        } catch(_error) {
            console.log(`:api :verify :fail`);
            xf.dispatch('action:auth', ':password:verify-fail');
        }
    }

    // {data: {FormData}} -> Void
    async function forgot(args = {}) {
        const url = `${api_uri}/api/forgot-password`;
        const data = args.data;

        if(data.email.trim() === '' || !isBrowser()) {
            console.log(`:forgot :blocked :is-browser ${isBrowser()}`);
            return;
        }

        try {
            xf.dispatch('action:auth', ':forgot:loading');
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                credentials: 'include',
                body: JSON.stringify(data),
            });

            if(response.ok) {
                console.log(`:api :forgot :success`);
                xf.dispatch('action:auth', ':forgot:success');
            } else {
                console.log(`:api :forgot :fail :with ${response.status}`);
                xf.dispatch('action:auth', ':forgot:fail');
            }
        } catch(error) {
            console.log(`:api :forgot :fail`);
            console.log(error);
            xf.dispatch('action:auth', ':forgot:fail');
        }
    }

    // {data: {FormData}} -> Void
    async function reset(args = {}) {
        const params = (new URL(document.location)).searchParams;
        const token = params.get('token') ?? '';

        const url = `${api_uri}/api/reset-password`;

        const data = args.data;
        data.token = token;

        if(data.password.trim() === '' ||
           data.password_confirmation.trim() === '' ||
           !isBrowser()) {
            console.log(`:reset :blocked :is-browser ${isBrowser()}`);
            return;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                body: JSON.stringify(data),
            });

            if(response.ok) {
                console.log(`:api :reset :success`);
                window.history.pushState({}, document.title, window.location.pathname);
                xf.dispatch('action:auth', ':password:login');
            } else {
                console.error(`:api :reset :fail`);
                xf.dispatch('action:auth', ':error');
            }
        } catch(e) {
            console.error(`:api :reset :error `, e);
        }
    }

    async function status() {
        const url = `${api_uri}/api/rpc`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json',},
                credentials: 'include',
                body: JSON.stringify({
                    id: uuid(),
                    method: 'status_handler',
                    params: {data: {}},
                }),
            });

            const status = response.status;
            const body = await response.json();

            if(response.ok) {
                console.log(`:api :profile`);
                _loggedIn = true;

                if(_turnstileLoaded) {
                    removeTurnstile();
                }

                console.log(`:status`, body.result);

                config.setServices(body.result.services);
                strava.update();
                intervals.update();
                trainingPeaks.update();

                xf.dispatch('account', {identifier: body?.result?.identifier ?? ''});
                xf.dispatch('action:auth', ':password:profile');
                xf.dispatch('services', body?.result);
                return body.result;
            }
            if(status === 403) {
                _loggedIn = false;

                if(_turnstileLoaded) {
                }

                xf.dispatch('account', {identifier: ''});
                xf.dispatch('action:status', ':logout');
                xf.dispatch('action:auth', ':password:login');
                return {strava: false, intervals: false, trainingPeaks: false};
            }
            if(status === 500 || status === 405) {
                console.log(`:api :no-api`);

                _loggedIn = false;
                _hasApi = false;

                if(_turnstileLoaded) {
                    removeTurnstile();
                }

                xf.dispatch('action:auth', ':no-api');
                return {strava: false, intervals: false, trainingPeaks: false};
            }

            return {strava: false, intervals: false, trainingPeaks: false};
        } catch(error) {
            console.log(`:api :no-api`);
            console.log(error);

            if(_turnstileLoaded) {
                removeTurnstile();
            }

            xf.dispatch('action:auth', ':no-api');
            return {strava: false, intervals: false, trainingPeaks: false};
        }
    }

    return Object.freeze({
        register,
        login,
        verifyEmail,
        logout,
        deleteAccount,
        forgot,
        reset,
        status,

        loadTurnstile,
        resetTurnstile,
        isTurnstileExpired,
        removeTurnstile,
    });
}

const auth = Auth();

export default auth;

