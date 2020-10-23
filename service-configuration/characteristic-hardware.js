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

function HardwareCharacteristic(tjbot) {
    HardwareCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0001-0002-a6a2-da053e2a640a',
        properties: ['read'],
        value: Buffer.from(JSON.stringify(tjbot.hardware)),
        descriptors: [
            new BlenoDescriptor({
                uuid: '0102',
                value: 'TJBot Hardware',
            }),
        ],
    });
}

util.inherits(HardwareCharacteristic, BlenoCharacteristic);

module.exports = HardwareCharacteristic;
