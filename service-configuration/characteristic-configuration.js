const util = require('util');
const winston = require('winston');

const bleno = require('bleno');
const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

const utils = require('../utils');

function ConfigurationCharacteristic(name) {
    ConfigurationCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0001-0001-a6a2-da053e2a640a',
        properties: ['read'],
        value: Buffer.from(JSON.stringify({name:name})),
        descriptors: [
            new BlenoDescriptor({
                uuid: '0101',
                value: 'TJBot Configuration'
            })
        ]
    });
}

util.inherits(ConfigurationCharacteristic, BlenoCharacteristic);

module.exports = ConfigurationCharacteristic;
