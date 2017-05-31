const util = require('util');
const winston = require('winston');

const bleno = require('bleno');
const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

function HardwareCharacteristic(tjbot) {
    HardwareCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0001-0002-a6a2-da053e2a640a',
        properties: ['read'],
        value: Buffer.from(JSON.stringify(tjbot.hardware)),
        descriptors: [
            new BlenoDescriptor({
                uuid: '0102',
                value: 'TJBot Hardware'
            })
        ]
    });
}

util.inherits(HardwareCharacteristic, BlenoCharacteristic);

module.exports = HardwareCharacteristic;
