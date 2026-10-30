import { xf, isArray, equals } from '../../functions.js';
import { ControlMode } from '../enums.js';

function OpenBikeControl() {

    const upForMode = {
        [ControlMode.erg]: 'ui:power-target-inc',
        [ControlMode.resistance]: 'ui:resistance-target-inc',
        [ControlMode.sim]: 'ui:slope-target-inc',
    };

    const downForMode = {
        [ControlMode.erg]: 'ui:power-target-dec',
        [ControlMode.resistance]: 'ui:resistance-target-dec',
        [ControlMode.sim]: 'ui:slope-target-dec',
    };

    const nextMode = {
        [ControlMode.erg]: ControlMode.resistance,
        [ControlMode.resistance]: ControlMode.sim,
        [ControlMode.sim]: ControlMode.erg,
    };

    function pushArrow(actions, seen, direction, mode) {
        if(seen[direction]) return;
        seen[direction] = true;

        const table = equals(direction, 'up') ? upForMode : downForMode;
        const event = table[mode];
        if(event) actions.push({event});
    }

    // [Message], {mode, watchStatus} -> [{event, data?}]
    function controlsFor(messages = [], context = {}) {
        const list = isArray(messages) ? messages : [];
        const mode = context.mode;
        const watchStatus = context.watchStatus;
        const actions = [];
        const seen = {up: false, down: false};

        for(let i = 0; i < list.length; i++) {
            const message = list[i];
            if(!message || !equals(message.state, 'pressed')) continue;

            if(equals(message.action, 'shiftUp') || equals(message.action, 'increaseDifficulty')) {
                pushArrow(actions, seen, 'up', mode);
                continue;
            }
            if(equals(message.action, 'shiftDown') || equals(message.action, 'decreaseDifficulty')) {
                pushArrow(actions, seen, 'down', mode);
                continue;
            }
            if(equals(message.action, 'skipInterval') || equals(message.action, 'lap')) {
                actions.push({event: 'ui:watchLap'});
                continue;
            }
            if(equals(message.action, 'previousInterval')) {
                actions.push({event: 'ui:watchBack'});
                continue;
            }
            if(equals(message.action, 'pause')) {
                if(equals(watchStatus, 'started')) actions.push({event: 'ui:watchPause'});
                continue;
            }
            if(equals(message.action, 'resume')) {
                if(equals(watchStatus, 'paused')) {
                    actions.push({event: 'ui:watchResume'});
                } else if(equals(watchStatus, 'stopped')) {
                    actions.push({event: 'ui:watchStart'});
                    actions.push({event: 'ui:workoutStart'});
                }
                continue;
            }
            if(equals(message.action, 'changeMode')) {
                actions.push({event: 'ui:mode-set', data: nextMode[mode] || ControlMode.erg});
            }
        }

        return actions;
    }

    function dispatchActions(actions) {
        for(let i = 0; i < actions.length; i++) {
            const action = actions[i];
            if('data' in action) {
                xf.dispatch(action.event, action.data);
            } else {
                xf.dispatch(action.event);
            }
        }
    }

    xf.reg('ble:openBikeControl:buttonState', (messages, db) => {
        dispatchActions(controlsFor(messages, {
            mode: db ? db.mode : '',
            watchStatus: db ? db.watchStatus : '',
        }));
    });

    return Object.freeze({
        controlsFor,
    });
}

const openBikeControl = OpenBikeControl();

export {
    OpenBikeControl,
    openBikeControl,
};
