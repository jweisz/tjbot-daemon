/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
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

const utilities = require('../utilities');

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
        utilities.chunkedWrite(this.updateValueCallback, data, this.maxValueSize);
    } else {
        winston.error("Unable to write response object, device did not subscribe to ResponseCharacteristic");
    }
}

module.exports = ResponseCharacteristic;
