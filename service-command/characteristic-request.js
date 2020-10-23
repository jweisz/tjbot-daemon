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
const mkdirp = require('mkdirp');
const { spawn } = require('child_process');
const bleno = require('bleno');

const BlenoCharacteristic = bleno.Characteristic;
const BlenoDescriptor = bleno.Descriptor;

function RequestCharacteristic(tjbot, commandService, name) {
    RequestCharacteristic.super_.call(this, {
        uuid: '799d5f0d-0002-0002-a6a2-da053e2a640a',
        properties: ['write'],
        descriptors: [
            new BlenoDescriptor({
                uuid: '0202',
                value: 'TJBot Request channel for making requests with responses',
            }),
        ],
    });

    this.tjbot = tjbot;
    this.commandService = commandService;
    this.hostname = name.toLowerCase();
    this.port = 9080;
    this.photoDir = '/tmp/tjbot-photo/';

    winston.verbose(`Creating photo directory (if needed) at ${this.photoDir}`);
    mkdirp.sync(this.photoDir);

    winston.verbose(`Starting web service for ${this.photoDir}`);
    this.httpServer = spawn('node_modules/http-server/bin/http-server', [this.photoDir, '-p', this.port, '-d', 'false']);
    this.httpServer.on('error', (err) => {
        winston.error('error spawning http-server process');
        throw err;
    })

    // terminate the child process when we end
    const self = this;
    process.on('SIGINT', () => {
        winston.verbose('Stopping web service');
        self.httpServer.kill('SIGHUP');
        process.nextTick(() => {
            process.exit(0);
        });
    });
}

util.inherits(RequestCharacteristic, BlenoCharacteristic);

RequestCharacteristic.prototype.onWriteRequest = function onWriteRequest(data, offset, withoutResponse, callback) {
    winston.silly('Received request data', data, offset);

    // do a buffered read
    if (this._readBuffer === undefined) {
        this._readBuffer = '';
    }

    // append to the buffer
    this._readBuffer = this._readBuffer.concat(data);

    // see if we have a complete packet
    const nullIndex = this._readBuffer.indexOf('\0');
    if (nullIndex >= 0) {
        // peel off the packet
        const packet = this._readBuffer.substring(0, nullIndex);
        winston.silly('Received full request packet: ', packet);

        // remove it from the buffer
        this._readBuffer = this._readBuffer.substring(nullIndex + 1);

        // and process it
        this.processPacket(packet, callback);
    } else {
        // send an ACK to get the next packet
        callback(this.RESULT_SUCCESS);
    }
};

RequestCharacteristic.prototype.processPacket = async function processPacket(packet, callback) {
    let request = {};
    try {
        request = JSON.parse(packet.toString());
    } catch (err) {
        winston.error('could not decode JSON from packet: ', packet.toString());
    }

    winston.verbose('Received request', request);

    if (!Object.prototype.hasOwnProperty.call(request, 'cmd')) {
        const err = new Error("Expected 'cmd' in request");
        this.commandService.writeResponseObject(err);
        callback(this.RESULT_UNLIKELY_ERROR);
        return;
    }

    let args = {};
    if (Object.prototype.hasOwnProperty.call(request, 'args')) {
        args = request.args;
    }

    // capture 'this' context
    const self = this;

    // capture whether an error occurs in invoking a tjbot method
    let error;

    switch (request.cmd) {
    case 'analyzeTone':
        if (args.text !== undefined) {
            const { text } = args;
            try {
                const tone = await self.tjbot.analyzeTone(text);
                self.commandService.writeResponseObject(tone);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'text' in args");
        }
        break;
    case 'converse':
        if (args.assistantId !== undefined && args.message !== undefined) {
            const { assistantId, message } = args;
            try {
                self.tjbot.configuration.converse.assistantId = assistantId;
                const response = self.tjbot.converse(message);
                self.commandService.writeResponseObject(response);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'workspaceId' and 'message' in args");
        }
        break;
    case 'see':
        {
            const filePath = `${self.photoDir}photo.jpg`;
            try {
                await self.tjbot.takePhoto(filePath);
                winston.debug('sending image to Watson Visual Recognition');
                const objects = await self.tjbot.recognizeObjectsInPhoto(filePath);
                const imageURL = `http://${self.hostname}.local:${self.port}/photo.jpg`;
                const response = { objects, imageURL };
                self.commandService.writeResponseObject(response);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        }
        break;
    case 'read':
        {
            const filePath = `${self.photoDir}photo.jpg`;
            try {
                await self.tjbot.takePhoto(filePath);
                winston.debug('sending image to Watson Visual Recognition');
                const objects = self.tjbot.recognizeTextInPhoto(filePath);
                const imageURL = `http://${self.hostname}.local:${self.port}/photo.jpg`;
                const response = { objects, imageURL };
                self.commandService.writeResponseObject(response);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        }
        break;
    case 'shineColors':
        try {
            const result = self.tjbot.shineColors();
            self.commandService.writeResponseObject(result);
        } catch (err) {
            winston.error('TJBot threw an error:', err);
            error = err;
        }
        break;
    case 'randomColor':
        try {
            const result = self.tjbot.randomColor();
            self.commandService.writeResponseObject(result);
        } catch (err) {
            winston.error('TJBot threw an error:', err);
            error = err;
        }
        break;
    case 'speak':
        if (args.message !== undefined) {
            const { message } = args;
            try {
                await self.tjbot.speak(message);
                self.commandService.writeResponseObject({ message });
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'message' in args");
        }
        break;
    case 'play':
        if (args.soundFile !== undefined) {
            const { soundFile } = args;
            try {
                await self.tjbot.play(soundFile);
                self.commandService.writeResponseObject(soundFile);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'soundFile' in args");
        }
        break;
    case 'translate':
        if (args.text !== undefined && args.sourceLanguage !== undefined && args.targetLanguage !== undefined) {
            const { text, sourceLanguage, targetLanguage } = args;
            try {
                const translation = await self.tjbot.translate(text, sourceLanguage, targetLanguage);
                self.commandService.writeResponseObject(translation);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'text', 'sourceLanguage', and 'targetLanguage' in args");
        }
        break;
    case 'identifyLanguage':
        if (args.text !== undefined) {
            const { text } = args;
            try {
                const languages = await self.tjbot.identifyLanguage(text);
                const langObj = {};
                langObj.languages = [];
                const length = (languages.languages.length <= 5) ? languages.languages.length : 5;

                for (let i = 0; i < length; i += 1) {
                    langObj.languages.push(languages.languages[i]);
                }

                self.commandService.writeResponseObject(langObj);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'text' in args");
        }
        break;
    case 'isTranslatable':
        if (args.sourceLanguage !== undefined && args.targetLanguage !== undefined) {
            const { sourceLanguage, targetLanguage } = args;
            try {
                const result = await self.tjbot.isTranslatable(sourceLanguage, targetLanguage);
                self.commandService.writeResponseObject(result);
            } catch (err) {
                winston.error('TJBot threw an error:', err);
                error = err;
            }
        } else {
            error = new Error("Expected 'sourceLanguage' and 'targetLanguage' in args");
        }
        break;
    default:
        error = new Error(`Unknown command received: ${request.cmd}`);
        break;
    }

    // something bad happened, so just return an empty object as the response
    if (error !== undefined) {
        this.commandService.writeResponseObject({ error: error.toString() });
    }

    // always use RESULT_SUCCESS because otherwise the client doesn't see an ACK
    // that their writeData() was successful
    callback(this.RESULT_SUCCESS);
};

module.exports = RequestCharacteristic;
