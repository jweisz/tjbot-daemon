/**
 * Copyright 2017-2020 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
                value: 'TJBot Listen channel for receiving STT data stream',
            }),
        ],
    });

    this.tjbot = tjbot;
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
}

util.inherits(ListenCharacteristic, BlenoCharacteristic);

ListenCharacteristic.prototype.onSubscribe = function onSubscribe(maxValueSize, updateValueCallback) {
    winston.verbose('Device subscribed to ListenCharacteristic');
    this.updateValueCallback = updateValueCallback;
    this.maxValueSize = maxValueSize;
};

ListenCharacteristic.prototype.onUnsubscribe = function onUnsubscribe() {
    winston.verbose('Device unsubscribed from ListenCharacteristic');
    this.updateValueCallback = undefined;
    this.maxValueSize = 0;
};

ListenCharacteristic.prototype.receivedListenText = function receivedListenText(text) {
    if (this.updateValueCallback !== undefined) {
        // trim to this.maxValueSize
        // in the future, we may want to deliver this as null-terminated packets...
        let msg = text;

        if (this.maxValueSize !== undefined && this.maxValueSize > 0) {
            msg = text.substr(0, this.maxValueSize);
        }

        winston.silly(' > updating value of ListenCharacteristic to:', msg);
        this.updateValueCallback(Buffer.from(msg));
    } else {
        winston.error('Received STT response but device is not subscribed to ListenCharacteristic, turning off listen()');
        this.tjbot.stopListening();
    }
};

module.exports = ListenCharacteristic;
