import { xf, exists } from '../functions.js';
import { ControlMode, } from '../ble/enums.js';

function Keyboard() {

    const isKeyUp    = (code, key) => code === 'ArrowUp' || key === 'ArrowUp';
    const isKeyDown  = (code, key) => code === 'ArrowDown' || key === 'ArrowDown';
    const isKeyE     = (code, key) => code === 'KeyE' || key.toLowerCase() === 'e';
    const isKeyR     = (code, key) => code === 'KeyR' || key.toLowerCase() === 'r';
    const isKeyS     = (code, key) => code === 'KeyS' || key.toLowerCase() === 's';
    const isKeyL     = (code, key) => code === 'KeyL' || key.toLowerCase() === 'l';
    const isKeySpace = (code, key) => code === 'Space' || key === ' ';

    window.addEventListener('keydown', onKeydown.bind(this));

    function onKeydown(e) {
        let keyCode = e.keyCode;
        let code = e.code || '';
        let key = e.key || '';

        if(e.isComposing ||
            keyCode === 229 ||
            e.ctrlKey ||
            e.shiftKey ||
            e.altKey ||
            exists(e.target.form)) {
            return;
        }

        if(isKeyUp(code, key)) {
            e.preventDefault();
            xf.dispatch('key:up');
        }
        if(isKeyDown(code, key)) {
            e.preventDefault();
            xf.dispatch('key:down');
        }
        if(isKeyS(code, key)) {
            xf.dispatch('key:s');
        }
        if(isKeyR(code, key)) {
            xf.dispatch('key:r');
        }
        if(isKeyE(code, key)) {
            xf.dispatch('key:e');
        }
        if(isKeyL(code, key)) {
            xf.dispatch('key:l');
        }
        if(isKeySpace(code, key)) {
            e.preventDefault();
            xf.dispatch('key:space');
        }
    }
}


function KeyboardControls() {
    let mode = ControlMode.erg;
    xf.sub('db:mode', x => mode = x);

    let watchStatus = 'stopped';
    xf.sub('db:watchStatus', x => watchStatus = x);

    // Modes Inc/Dec
    xf.sub('key:up', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-inc');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-inc');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-inc');
        }
    });
    xf.sub('key:down', e => {
        if(mode === ControlMode.erg) {
            xf.dispatch('ui:power-target-dec');
        }
        if(mode === ControlMode.resistance) {
            xf.dispatch('ui:resistance-target-dec');
        }
        if(mode === ControlMode.sim) {
            xf.dispatch('ui:slope-target-dec');
        }
    });

    // Modes
    xf.sub('key:e', e => {
        xf.dispatch('ui:mode-set', ControlMode.erg);
    });
    xf.sub('key:r', e => {
        xf.dispatch('ui:mode-set', ControlMode.resistance);
    });
    xf.sub('key:s', e => {
        xf.dispatch('ui:mode-set', ControlMode.sim);
    });

    // Watch
    xf.sub('key:space', e => {
        if(watchStatus === 'paused' || watchStatus === 'stopped') {
            xf.dispatch('ui:watchStart');
            xf.dispatch('ui:workoutStart');
        } else {
            xf.dispatch('ui:watchPause');
        }
    });
    xf.sub('key:l', e => {
        xf.dispatch('ui:watchLap');
    });
}

Keyboard();
KeyboardControls();

export { Keyboard, KeyboardControls };
