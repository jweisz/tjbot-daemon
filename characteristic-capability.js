const util = require('util');
const winston = require('winston');

const bleno = require('bleno');
const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

function CapabilityCharacteristic(tjbot) {
    CapabilityCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0001-0003-a6a2-da053e2a640a',
        properties: ['read'],
        value: Buffer.from(JSON.stringify(tjbot.capabilities)),
        descriptors: [
            new BlenoDescriptor({
                uuid: '0103',
                value: 'TJBot Capabilities'
            })
        ]
    });
}

util.inherits(CapabilityCharacteristic, BlenoCharacteristic);

module.exports = CapabilityCharacteristic;
