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

function CommandCharacteristic(tjbot, commandService) {
    CommandCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0002-0001-a6a2-da053e2a640a',
        properties: ['write'],
        descriptors: [
            new BlenoDescriptor({
                uuid: '0201',
                value: 'TJBot Command channel for sending commands with no response'
            })
        ]
    });

    this.tjbot = tjbot;
    this.commandService = commandService;
}

util.inherits(CommandCharacteristic, BlenoCharacteristic);

CommandCharacteristic.prototype.onWriteRequest = function(data, offset, withoutResponse, callback) {
    winston.silly("Received command data", data, offset);

    // do a buffered read
    if (this._readBuffer == undefined) {
        this._readBuffer = ""
    }

    // append to the buffer
    this._readBuffer = this._readBuffer.concat(data);

    // see if we have a complete packet
    var nullIndex = this._readBuffer.indexOf('\0');
    if (nullIndex >= 0) {
        // peel off the packet
        var packet = this._readBuffer.substring(0, nullIndex);
        winston.silly("Received full command packet: ", packet);

        // remove it from the buffer
        this._readBuffer = this._readBuffer.substring(nullIndex + 1);

        // and process it
        this.processPacket(packet, callback);
    } else {
        // send an ACK to get the next packet
        callback(this.RESULT_SUCCESS);
    }
}

CommandCharacteristic.prototype.processPacket = function(packet, callback) {
    var command = {};
    try {
        command = JSON.parse(packet.toString());
    } catch (err) {
        winston.error("could not decode JSON from packet: ", packet.toString());
    }

    winston.verbose("Received command", command);

    if (!command.hasOwnProperty('cmd')) {
        callback(this.RESULT_UNLIKELY_ERROR);
        return;
    }

    var args = {};
    if (command.hasOwnProperty('args')) {
        args = command['args'];
    }

    switch (command['cmd']) {
        case "sleep":
            if (args['msec'] != undefined) {
                var msec = args['msec'];
                this.tjbot.sleep(msec);
            } else {
                callback(this.RESULT_UNLIKELY_ERROR);
                return;
            }
            break;
        case "listen":
            // make sure we have the CommandService to write the responses to
            if (this.commandService == undefined) {
                callback(this.RESULT_UNLIKELY_ERROR);
                return;
            }

            // start listening, and every time we get back data, write it to the
            // CommandService
            var self = this;
            this.tjbot.listen(function(text) {
                // trim the extra space at the end
                var trimmed = text.trim();
                self.commandService.receivedListenText(trimmed);
            });
            break;
        case "pauseListening":
            this.tjbot.pauseListening();
            break;
        case "resumeListening":
            this.tjbot.resumeListening();
            break;
        case "stopListening":
            this.tjbot.stopListening();
            break;
        case "shine":
            if (args['color'] != undefined) {
                var color = args['color'];
                this.tjbot.shine(color);
            } else {
                callback(this.RESULT_UNLIKELY_ERROR);
                return;
            }
            break;
        case "pulse":
            if (args['color'] != undefined && args['duration'] != undefined) {
                var color = args['color'];
                var duration = args['duration'];

                // tjbot doesn't support pulse outside the range of [0.5, 3.0], so
                // just clamp it
                if (duration < 0.5) {
                    duration = 0.5;
                } else if (duration > 3.0) {
                    duration = 3.0;
                }

                try {
                    this.tjbot.pulse(color, duration);
                } catch (err) {
                    winson.error("error while pulsing: ", err);
                }
            } else {
                callback(this.RESULT_UNLIKELY_ERROR);
                return;
            }
            break;
        case "armBack":
            this.tjbot.armBack();
            break;
        case "raiseArm":
            this.tjbot.raiseArm();
            break;
        case "lowerArm":
            this.tjbot.lowerArm();
            break;
        case "wave":
            this.tjbot.wave();
            break;
        case "wifi_list":
		    console.log('WiFi SSID List detected by TJBot');
            break;
        default:
            callback(this.RESULT_UNLIKELY_ERROR);
            return;
    }

    callback(this.RESULT_SUCCESS);
};

module.exports = CommandCharacteristic;
