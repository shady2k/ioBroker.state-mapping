![Logo](admin/state-mapping.png)
ioBroker state mapping adapter
==============

[![NPM version](http://img.shields.io/npm/v/iobroker.state-mapping.svg)](https://www.npmjs.com/package/iobroker.state-mapping)
[![Downloads](https://img.shields.io/npm/dm/iobroker.state-mapping.svg)](https://www.npmjs.com/package/iobroker.state-mapping)

[![NPM](https://nodei.co/npm/iobroker.state-mapping.png?downloads=true)](https://nodei.co/npm/iobroker.state-mapping/)

# Copy state from/to another state

This adapter allows you to copy updated value from one state to another.

# Getting started
In instance settings there are two pages.

## Mapping rules
If you want to convert values, you need to create rules.
<img src="admin/sc1.png"  width="600"><br/>
Click, Add rule. Each rule may have multiple mappings, use blue plus in Operations column to add additional mapping. Set rule name, value will be converted from old state to new state. For example, your device sends ON or OFF to mqtt topic, and you need to convert this to boolean true/false and copy to other state.<br/>
Min - if value is lower than it, new value will be ignored<br/>
Max - if value is grater than it, new value will be ignored<br/>
Deviation - if value differ from old value more than it, new value will be ignored<br/>
Old state - state before mapping<br/>
New state - state after mapping, it will be passed to destination object<br/>

## Active rules
On Active rules page you can see all objects with rules, add new object, edit and delete it.<br/>

# Configure your objects
Click settings on your object and check enable. In rule field you can enter name of mapping rule, that you created before. If value is number, you can set correction. For example, if you set -1, your value will be decrease by 1 each state update. Correction will be applied only for input object, but if only one output object without input it will be applied to output.
If you want just copy value to your state, set source object name in "Input" field.
If you need copy value from your object to another state, use "Output" field. Set destination state in this field.
And if you want two-way copy, set object name to "Input and output field".
Ignore Ack lets you ignore acknowledged flag in the input object state. It will be copied with Acknowledged = false. Be careful, if input and output objects relative to each other, this may caused loop, see logs for loop detected warning.
It is not recommended to set all three fields at some time. Use "Input"/"Output" fields or only "Input and output" field.
