import { equals, xf, empty, } from '../functions.js';
import { models } from '../models/models.js';

// TODO: This needs refactoring to something more general with
// declarative configuration. Something that will work for all tabs and switches.
class AuthForms extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.el = {
            // each subset is exclusive or with css class .active
            //
            // tabs
            // passkey, password
            // forms
            // passkey -> login, register -> profile
            // password -> login, register, forgot, reset -> profile
            // error
            // switch: {
            //     $passkey: document.querySelector('#passkey--tab--switch'),
            //     $password: document.querySelector('#password--tab--switch'),
            // },
            // tab: {
            //     $passkey:  document.querySelector('#passkey--forms'),
            //     $password: document.querySelector('#password--forms'),
            // },
            password: {
                $register: self.querySelector('#register--form'),
                $login: self.querySelector('#login--form'),
                $forgot: self.querySelector('#forgot--form'),
                $reset: self.querySelector('#reset--form'),
                $profile: document.querySelector('#profile'),
            },
            // passkey: {
            //     $register: self.querySelector('#passkey--register--form'),
            //     $login: self.querySelector('#passkey--login--form'),
            //     $profile: document.querySelector('#profile'),
            // },
            $logout: document.querySelector('#account--logout--button'),
            $deleteAccount: document.querySelector('#account--delete--button'),
            $deleteDialog: document.querySelector('#dialog--delete-account'),
            $deleteForm: document.querySelector('#account--delete--form'),
            $deletePassword: document.querySelector('#account--delete--password'),
            $deleteMsg: document.querySelector('#account--delete--msg'),
            $deleteCancel: document.querySelector('#account--delete--cancel'),
            $error: document.querySelector('#auth-error--section'),
            $pwds: document.querySelectorAll('input[type="password"]'),
        };

        this.subForm('password', '$login', 'login');
        this.subForm('password', '$register', 'register');
        this.subForm('password', '$forgot', 'forgot');
        this.subForm('password', '$reset', 'reset');

        this.el.$logout.addEventListener('pointerup', (e) => {
            models.api.auth.logout();
        });

        this.el.$deleteAccount.addEventListener('pointerup', () => {
            this.openDeleteDialog();
        });
        this.el.$deleteForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = this.el.$deletePassword.value;
            if(equals(password, '')) {
                this.el.$deleteMsg.textContent = 'Enter your current password.';
                return;
            }
            this.el.$deleteMsg.textContent = '';
            models.api.auth.deleteAccount(password);
        });
        this.el.$deleteCancel.addEventListener('pointerup', () => {
            this.closeDeleteDialog();
        });
        this.el.$deleteDialog.addEventListener('close', () => {
            this.clearDeleteSecret();
        });

        this.$forgotMsg = document.querySelector('#forgot--msg');
        this.$registerMsg = document.querySelector('#register--msg');
        this.$loginMsg = document.querySelector('#login--msg');

        xf.sub('action:auth', self.onAction.bind(this));
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    subForm(group, form, method) {
        const $form = this.el[group][form];

        $form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData($form);
            const cfTurnstileResponse = window.turnstile.getResponse();
            if(cfTurnstileResponse === undefined) { return; }
            formData.append('cf-turnstile-response', cfTurnstileResponse);
            const data = Object.fromEntries(formData);

            await models.api.auth[method]({data,});
            $form.reset();

            // TODO:
            // refresh turnstile
            if(method === 'register' ||
               method === 'forgot' ||
               method === 'reset') {
                models.api.auth.resetTurnstile();
            }

        }, this.signal);
    }
    onAction(action) {
        const self = this;
        console.log(action);

        // TODO: figure out a condition
        // models.api.auth.loadTurnstile();

        if(action === ':password') {
            this.switch('$password', this.el.tab);
            this.switch('$password', this.el.switch);
            return;
        }
        // if(action === ':passkey') {
        //     // TODO: fix when webauthn is ready
        //     // this.switch('$passkey', this.el.tab);
        //     // this.switch('$passkey', this.el.switch);
        //     return;
        // }
        if(action === ':password:login') {
            this.switch('$login', this.el.password);
            return;
        }
        if(action === ':password:register') {
            this.switch('$register', this.el.password);
            return;
        }
        if(action === ':password:forgot') {
            this.switch('$forgot', this.el.password);
            return;
        }
        if(action === ':password:reset') {
            this.switch('$reset', this.el.password);
            return;
        }
        if(equals(action, ':password:profile')) {
            this.switch('$profile', this.el.password);
            this.clearLoginNotice();
            return;
        }
        if(equals(action, ':password:logout')) {
            this.switch('$login', this.el.password);
            this.clearLoginNotice();
            return;
        }
        // if(action === ':passkey:login') {
        //     this.switch('$login', this.el.passkey);
        //     return;
        // }
        // if(action === ':passkey:register') {
        //     this.switch('$register', this.el.passkey);
        //     return;
        // }
        if(action === ':forgot:loading') {
            console.log(`:view :action:auth :forgot:loading`);
            this.$forgotMsg.textContent = "Sending reset request ...";
            this.$forgotMsg.classList.remove('success');
            this.$forgotMsg.classList.remove('error');
            this.$forgotMsg.classList.add('loading');
        }
        if(action === ':forgot:success') {
            console.log(`:view :action:auth :forgot:success`);
            this.$forgotMsg.textContent = "An email with a password reset link has been sent to your email!";
            this.$forgotMsg.classList.remove('loading');
            this.$forgotMsg.classList.remove('error');
            this.$forgotMsg.classList.add('success');
        }
        if(action === ':forgot:fail') {
            console.log(`:view :action:auth :forgot:fail`);
            this.$forgotMsg.textContent = "Something went wrong while sending a password reset email!";
            this.$forgotMsg.classList.remove('loading');
            this.$forgotMsg.classList.remove('success');
            this.$forgotMsg.classList.add('error');
        }
        if(equals(action, ':password:verify-sent')) {
            this.el.$error.classList.remove('active');
            this.$registerMsg.textContent = 'Check your inbox and open the link promptly, then log in.';
            this.$registerMsg.classList.remove('fail');
            this.$registerMsg.classList.add('success');
            return;
        }
        if(equals(action, ':password:login-unverified')) {
            this.switch('$login', this.el.password);
            this.$loginMsg.textContent = 'Confirm your email, then log in.';
            this.$loginMsg.classList.remove('success');
            this.$loginMsg.classList.add('fail');
            return;
        }
        if(equals(action, ':password:verify-ok')) {
            this.switch('$login', this.el.password);
            this.$loginMsg.textContent = 'Email confirmed. You can log in now.';
            this.$loginMsg.classList.remove('fail');
            this.$loginMsg.classList.add('success');
            return;
        }
        if(equals(action, ':password:verify-fail')) {
            this.switch('$login', this.el.password);
            this.$loginMsg.textContent = 'This confirmation link is invalid, expired, or already used.';
            this.$loginMsg.classList.remove('success');
            this.$loginMsg.classList.add('fail');
            return;
        }
        if(equals(action, ':password:policy')) {
            this.showActiveFormNote('Use 8 to 64 characters.');
            return;
        }
        if(equals(action, ':email:invalid')) {
            this.showActiveFormNote('Enter a valid email address.');
            return;
        }
        if(equals(action, ':too-many-attempts')) {
            this.showActiveFormNote('Too many attempts. Wait a few minutes and try again.');
            return;
        }
        if(equals(action, ':password:delete-mismatch')) {
            this.clearDeletePassword();
            this.el.$deleteMsg.textContent = 'That password does not match.';
            return;
        }
        if(equals(action, ':password:delete-limited')) {
            this.clearDeletePassword();
            this.el.$deleteMsg.textContent = 'Too many attempts. Wait a few minutes and try again.';
            return;
        }
        if(equals(action, ':password:deleted')) {
            this.closeDeleteDialog();
            return;
        }
        if(action === ':error') {
            this.closeDeleteDialog();
            this.$loginMsg.textContent = '';
            this.$registerMsg.textContent = '';
            this.error('Wrong credentials or Authentication error');
            return;
        }
        if(action === ':no-api') {
            this.switch('', this.el.tab);
            this.switch('', this.el.password);
            this.switch('', this.el.passkey);
            this.error('No internet connection or the API service is currently offline.');
            return;
        }
    }
    switch(target, elements) {
        this.el.$error.classList.remove('active');

        // prevent potential content flash
        // by first removing and only after that adding .active
        // if there is no target element this is not an error,
        // it means all content should be 'non-active'
        for(let prop in elements) {
            if(!(target === prop)) {
                elements[prop].classList.remove('active');
            }
        }
        if(target) {
            elements[target].classList.add('active');
        }
    }
    showActiveFormNote(text) {
        const forms = this.el.password;
        if(forms.$register.classList.contains('active')) {
            this.$registerMsg.textContent = text;
            this.$registerMsg.classList.remove('success');
            this.$registerMsg.classList.add('fail');
            return;
        }
        if(forms.$forgot.classList.contains('active')) {
            this.$forgotMsg.textContent = text;
            this.$forgotMsg.classList.remove('success');
            this.$forgotMsg.classList.remove('loading');
            this.$forgotMsg.classList.add('error');
            return;
        }
        if(forms.$login.classList.contains('active')) {
            this.$loginMsg.textContent = text;
            this.$loginMsg.classList.remove('success');
            this.$loginMsg.classList.add('fail');
            return;
        }
        this.error(text);
    }
    clearLoginNotice() {
        this.$loginMsg.textContent = '';
        this.$loginMsg.classList.remove('success');
        this.$loginMsg.classList.remove('fail');
    }
    openDeleteDialog() {
        this.clearDeleteSecret();
        const dialog = this.el.$deleteDialog;
        if(!dialog.open) {
            dialog.showModal();
        }
    }
    closeDeleteDialog() {
        this.clearDeleteSecret();
        const dialog = this.el.$deleteDialog;
        if(dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
    }
    clearDeletePassword() {
        this.el.$deletePassword.value = '';
    }
    clearDeleteSecret() {
        this.clearDeletePassword();
        this.el.$deleteMsg.textContent = '';
    }
    error(msg = '') {
        if(msg !== '') {
            this.el.$error.textContent = msg;
        }
        this.el.$error.classList.add('active');
        this.el.$pwds.forEach(($el) => $el.value = '');
    }
}

customElements.define('auth-forms', AuthForms);

