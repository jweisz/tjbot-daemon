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

    var command = {};
    try {
        command = JSON.parse(data.toString());
    } catch (err) {
        winston.error("could not decode JSON from data: ", data.toString());
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
        default:
            callback(this.RESULT_UNLIKELY_ERROR);
            return;
    }

    callback(this.RESULT_SUCCESS);
};

module.exports = CommandCharacteristic;
