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
const BlenoPrimaryService = bleno.PrimaryService;

const CommandCharacteristic = require('./characteristic-command');
const RequestCharacteristic = require('./characteristic-request');
const ResponseCharacteristic = require('./characteristic-response');
const ListenCharacteristic = require('./characteristic-listen');

function CommandService(tjbot, name) {
    var commandCharacteristic = new CommandCharacteristic(tjbot, this);
    var requestCharacteristic = new RequestCharacteristic(tjbot, this, name);
    var responseCharacteristic = new ResponseCharacteristic(tjbot, this);
    var listenCharacteristic = new ListenCharacteristic(tjbot);

    CommandService.super_.call(this, {
        uuid: '799d5f0d-0002-0000-a6a2-da053e2a640a',
        characteristics: [
            commandCharacteristic,
            requestCharacteristic,
            responseCharacteristic,
            listenCharacteristic
        ]
    });

    this.responseCharacteristic = responseCharacteristic;
    this.listenCharacteristic = listenCharacteristic;
}

// deliver responses to the responseCharacteristic
CommandService.prototype.writeResponseObject = function(obj) {
    this.responseCharacteristic.writeResponseObject(obj);
}

// deliver text from listen() to the listenCharacteristic
CommandService.prototype.receivedListenText = function(text) {
    this.listenCharacteristic.receivedListenText(text);
}

util.inherits(CommandService, BlenoPrimaryService);

module.exports = CommandService;
