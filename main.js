/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const utils = require('@iobroker/adapter-core'); // Get common adapter utils
const adapterName = require('./package.json').name.split('.').pop();

let dict_in = {};
let dict_out = {};
let dict_rules = {};
let lp = {};
let dict_lastValue = {};

let adapter;
function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
        name: adapterName,
        unload: function (callback) {
            try {
                adapter.log.info('State Mapping adapter stopped...');
                for (let id in objects_arr) {
                    if(objects_arr.hasOwnProperty(id)) {
                        deleteObject(id);
                    }
                }
                callback();
            } catch (e) {
                callback();
            }
        },
        objectChange: function (id, obj) {
            if(obj && obj.common && obj.common.custom && obj.common.custom[adapter.namespace] && obj.common.custom[adapter.namespace].enabled) {
                adapter.log.debug('Object change detected for: ' + id);
                deleteObject(id);
                addToObjects(id, obj);
            } else {
                deleteObject(id);
            }
            //adapter.log.debug('in: ' + JSON.stringify(dict_in));
            //adapter.log.debug('out: ' + JSON.stringify(dict_out));
        },
        stateChange: function (id, state) {
            if(dict_in.hasOwnProperty(id)) {
                if(state.from != 'system.adapter.' + adapter.namespace) {
                    adapter.log.debug('in: ' + JSON.stringify(state));
                    t_setState(dict_in[id].id, state.val, state.ack, dict_in[id].rule, dict_in[id].correction);
                }
            }
            if(dict_out.hasOwnProperty(id)) {
                if(!state.ack) {
                    adapter.log.debug('out: ' + JSON.stringify(state));
                    t_setState(dict_out[id].id, state.val, state.ack, dict_out[id].rule, dict_out[id].correction);
                }
            }
        },
        ready: () => main()
    });

    adapter = new utils.Adapter(options);

	return adapter;
};

function deleteByValue(obj, val) {
    for(let f in obj) {
        if(obj.hasOwnProperty(f) && obj[f].id == val) {
            delete obj[f];
        }
    }
}

function deleteObject(id) {
    if(dict_in.hasOwnProperty(id)) {
        delete dict_in[id];
    }
    deleteByValue(dict_in, id);
    if(dict_out.hasOwnProperty(id)) {
        delete dict_out[id];
    }
    deleteByValue(dict_out, id);
    if(lp.hasOwnProperty(id)) {
        delete dict_out[id];
    }
    if(dict_lastValue.hasOwnProperty(id)) {
        delete dict_lastValue[id];
    }
}

function addToObjects(id, obj) {
    adapter.log.info('Register State Mapping for id: ' + id);
    
    let custom = null;
    if(obj && obj.value && obj.value.custom && obj.value.custom[adapter.namespace]) {
        custom = obj.value.custom[adapter.namespace];
    } else if(obj && obj.common && obj.common.custom && obj.common.custom[adapter.namespace]) {
        custom = obj.common.custom[adapter.namespace];
    } else {
        return;
    }

    let rule = 'none';
    if(custom.rule && custom.rule != '') {
        if(dict_rules.hasOwnProperty(custom.rule)) {
            rule = custom.rule;
        } else {
            adapter.log.warn('Rule "' + custom.rule + '" does not found!');
        }
    }

    let correction = 0;
    if(custom.correction) {
        let floatVal = parseFloat(custom.correction);
        if (isNaN(floatVal)) {
            correction = 0;
        } else {
            correction = floatVal;
        }
    }

    if(custom.input || custom.output) {
        if(custom.input) {
            if(!dict_in.hasOwnProperty(custom.input)) {
                dict_in[custom.input] = { 'id': id, 'rule': rule, 'correction': correction };
            }
        } 

        if(custom.output && custom.input) {
            if(!dict_out.hasOwnProperty(id)) {
                dict_out[id] = { 'id': custom.output, 'rule': rule, 'correction': 0 };
            }
        } else if(custom.output) {
            if(!dict_out.hasOwnProperty(id)) {
                dict_out[id] = { 'id': custom.output, 'rule': rule, 'correction': correction };
            }
        }
    } else {
        if(custom.io) {
            if(!dict_in.hasOwnProperty(custom.io)) {
                dict_in[custom.io] = { 'id': id, 'rule': rule, 'correction': correction };
            }
            if(!dict_out.hasOwnProperty(custom.io)) {
                dict_out[id] = { 'id': custom.io, 'rule': rule, 'correction': 0 };
            }
        }
    }
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] == value);
}

function isNumber(n) { return !isNaN(parseFloat(n)) && !isNaN(n - 0) }

function t_setState(v_id, v_value, v_ack, v_rule, v_correction) {
    v_value = String(v_value);
    let now = new Date().getTime();
    if(lp.hasOwnProperty(v_id)) {
        if((now - lp[v_id].ts) < 2000) {
            if(lp[v_id].cnt > 2) {
                adapter.log.warn('Probably loop while update: ' + v_id);
                return;
            } else {
                lp[v_id].cnt = lp[v_id].cnt + 1;
            }
        } else {
            lp[v_id].ts = now;
            lp[v_id].cnt = 0;
        }
    } else {
        lp[v_id] = { 'ts': now, 'cnt': 0 };
    }

    if(v_correction && isNumber(v_correction) && v_correction != 0) {
        let floatVal = parseFloat(v_value);
        if (isNumber(floatVal)) {
            let new_value = floatVal + Number(v_correction);
            new_value = Math.round(new_value * 100) / 100;
            adapter.log.debug('Replace value for ' + v_id + ' from: ' + v_value + ' to: ' + new_value);
            v_value = new_value;
        } else {
            adapter.log.warn('Can\'t parse for "' + v_id + '" with value "' + v_value + '"!');
        }
    }

    if(dict_rules.hasOwnProperty(v_rule)) {
        let rule = dict_rules[v_rule];

        if(rule.hasOwnProperty('mapping')) {
            let mapping = rule.mapping;
            let key = getKeyByValue(mapping, v_value);
            if(mapping.hasOwnProperty(v_value)) {
                adapter.log.debug('Replace value for ' + v_id + ' from: ' + v_value + ' to: ' + mapping[v_value]);
                v_value = mapping[v_value];
            } else if(key) {
                adapter.log.debug('Replace value for ' + v_id + ' from: ' + v_value + ' to: ' + key);
                v_value = key;
            } else {
                adapter.log.debug('Mapping for "' + v_id + '" with value "' + v_value + '" and rule "' + v_rule + '" not found!');
            }
        }

        if(isNumber(v_value)) {
            if(rule.hasOwnProperty('min') && rule.min && isNumber(rule.min)) {
                let vmin = parseFloat(rule.min);
                let val = parseFloat(v_value);
                if(isNumber(vmin) && isNumber(val)) {
                    if(val < vmin) {
                        adapter.log.warn('Value for ' + v_id + ': ' + v_value + ' is lower than: ' + vmin);
                        return;
                    }
                }
            }
            if(rule.hasOwnProperty('max') && rule.max && isNumber(rule.max)) {
                let vmax = parseFloat(rule.max);
                let val = parseFloat(v_value);
                if(isNumber(vmax) && isNumber(val)) {
                    if(val > vmax) {
                        adapter.log.warn('Value for ' + v_id + ': ' + v_value + ' is grater than: ' + vmax);
                        return;
                    }
                }
            }
            if(rule.hasOwnProperty('deviation') && rule.deviation && isNumber(rule.deviation) && rule.deviation != 0) {
                let deviation = parseFloat(rule.deviation);
                let val = parseFloat(v_value);
                if(!dict_lastValue.hasOwnProperty(v_id)) {
                    dict_lastValue[v_id] = v_value;
                }
                let last_value = dict_lastValue[v_id];
                dict_lastValue[v_id] = v_value;

                if(Math.abs(val - last_value) >= deviation) {
                    adapter.log.warn('Difference for ' + v_id + ' between: ' + v_value + ' (new) and '+ last_value+' (old) is grater than: ' + deviation);
                    return;
                }
            }
        }
    }

    if(v_value == 'true') v_value = true;
    if(v_value == 'false') v_value = false;

    adapter.log.debug('Update ' + v_id + ' to: ' + v_value + ', ack = ' + v_ack);
    adapter.setForeignState(v_id, {val: v_value, ack: v_ack}, function(err) {
        if(err) {
            adapter.log.warn('Problem with update: ' + v_id);
            adapter.log.warn(err);
        }
    });
}

function main() {
    adapter.log.info('State Mapping adapter started!');
    adapter.objects.getObjectView('statemapping', 'state', {}, function (err, doc) {
        if(doc && doc.rows) {
            for(let i = 0, l = doc.rows.length; i < l; i++) {
                let obj = doc.rows[i];
                if(obj && obj.id && obj.value && obj.value.custom && obj.value.custom[adapter.namespace] && obj.value.custom[adapter.namespace].enabled) {
                    addToObjects(obj.id, obj);
                }
            }
        }
        adapter.log.debug('in: ' + JSON.stringify(dict_in));
        adapter.log.debug('out: ' + JSON.stringify(dict_out));
    });

    if(adapter.config.rules) {
        try {
            dict_rules = JSON.parse(adapter.config.rules);
        } catch(err) {
            if(err) {
                adapter.log.warn('Error parsing rules, please check syntax');
                adapter.log.warn(err);
            }
        }
    }

    adapter.subscribeForeignObjects('*');
    adapter.subscribeForeignStates('*');
}

// If started as allInOne/compact mode => return function to create instance
if(module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
