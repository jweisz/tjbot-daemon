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

const os = require('os');
const bleno = require('bleno');
const winston = require('winston');

const TJBot = require('tjbot');
const config = require('./config');

TJBot.prototype._SERVO_ARM_BACK = 800;
TJBot.prototype._SERVO_ARM_UP = 1400;
TJBot.prototype._SERVO_ARM_DOWN = 2300;

const ConfigurationService = require('./service-configuration/service-configuration');
const CommandService = require('./service-command/service-command');

const TJBOT_SERVICE_UUID = "799d5f0d-0000-0000-a6a2-da053e2a640a";

// obtain our hardware configuration from config.js
var hardware = config.hardware;

// obtain our tjbot config from config.js
var tjConfig = config.tjConfig;

// obtain our credentials from config.js
var credentials = config.credentials;

// instantiate our TJBot!
var tj = new TJBot(hardware, tjConfig, credentials);

// instantiate bleno
var name = os.hostname();
name = name.substring(0,26); // BLE name can only be 26 bytes

// verbose logging
winston.level = 'silly';

// Once bleno starts, begin advertising our BLE address
bleno.on('stateChange', function(state) {
    winston.verbose('BLE state change: ' + state);
    if (state === 'poweredOn') {
        winston.verbose('Advertising on BLE as: ' + name);
        bleno.startAdvertising(name, [TJBOT_SERVICE_UUID], function(error) {
            if (error) {
                winston.error("Error in advertisting: ", error);
            }
        });
    } else {
        bleno.stopAdvertising();
    }
});

// Notify the console that we've accepted a connection
bleno.on('accept', function(clientAddress) {
    winston.verbose("Accepted connection from address: " + clientAddress);

    // play a sound signifying a client connected
    try {
        tj.play('./sounds/connect.wav');
    } catch (err) {
    }
});

// Notify the console that we have disconnected from a client
bleno.on('disconnect', function(clientAddress) {
    winston.verbose("Disconnected from address: " + clientAddress);

    // stop listening in case tjbot is listening
    // (and bypass the capability assert() in case this
    // tjbot doens't have a mic)
    tj._stopListening();

    // play a sound signifying a client disconnected
    try {
        tj.play('./sounds/disconnect.wav');
    } catch (err) {
    }
});

// When we begin advertising, create a new service and characteristic
bleno.on('advertisingStart', function(error) {
    if (error) {
        winston.error("Advertising start error:", error);
    } else {
        winston.verbose("Advertising started");
        bleno.setServices([
            new ConfigurationService(tj, name),
            new CommandService(tj, name)
        ]);
    }
});
