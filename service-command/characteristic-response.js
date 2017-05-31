const util = require('util');
const winston = require('winston');

const bleno = require('bleno');
const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

const utils = require('../utils');

function ResponseCharacteristic(tjbot) {
    ResponseCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0002-0003-a6a2-da053e2a640a',
        properties: ['notify'],
        descriptors: [
            new BlenoDescriptor({
                uuid: '0203',
                value: 'TJBot Response channel for receiving data from a request'
            })
        ]
    });

    this.tjbot = tjbot;
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
}

util.inherits(ResponseCharacteristic, BlenoCharacteristic);

ResponseCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
    winston.verbose("Device subscribed to ResponseCharacteristic");
    this.updateValueCallback = updateValueCallback;
    this.maxValueSize = maxValueSize;
}

ResponseCharacteristic.prototype.onUnsubscribe = function() {
    winston.verbose("Device unsubscribed from ResponseCharacteristic");
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
}

ResponseCharacteristic.prototype.writeResponseObject = function(obj) {
    var objJson = JSON.stringify(obj);
    var data = Buffer.from(objJson);

    winston.verbose("Writing response object to ResponseCharacteristic: ", obj);
    if (this.updateValueCallback != undefined) {
        utils.chunkedWrite(this.updateValueCallback, data, this.maxValueSize);
    } else {
        winston.error("Unable to write response object, device did not subscribe to ResponseCharacteristic");
    }
}

module.exports = ResponseCharacteristic;
