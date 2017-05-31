const util = require('util');
const winston = require('winston');

const bleno = require('bleno');
const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

function ListenCharacteristic(tjbot) {
    ListenCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0002-0004-a6a2-da053e2a640a',
        properties: ['notify'],
        descriptors: [
            new BlenoDescriptor({
                uuid: '0204',
                value: 'TJBot Listen channel for receiving STT data stream'
            })
        ]
    });

    this.tjbot = tjbot;
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
}

util.inherits(ListenCharacteristic, BlenoCharacteristic);

ListenCharacteristic.prototype.onSubscribe = function(maxValueSize, updateValueCallback) {
    winston.verbose("Device subscribed to ListenCharacteristic");
    this.updateValueCallback = updateValueCallback;
    this.maxValueSize = maxValueSize;
}

ListenCharacteristic.prototype.onUnsubscribe = function() {
    winston.verbose("Device unsubscribed from ListenCharacteristic");
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
}

ListenCharacteristic.prototype.receivedListenText = function(text) {
    if (this.updateValueCallback != undefined) {
        // trim to this.maxValueSize
        // in the future, we may want to deliver this as null-terminated packets...
        var msg = text;

        if (this.maxValueSize != undefined && this.maxValueSize > 0) {
            msg = text.substr(0, this.maxValueSize);
        }

        winston.silly(" > updating value of ListenCharacteristic to:", msg);
        this.updateValueCallback(Buffer.from(msg));
    } else {
        winston.error("Received STT response but device is not subscribed to ListenCharacteristic, turning off listen()");
        this.tjbot.stopListening();
    }
}

module.exports = ListenCharacteristic;
