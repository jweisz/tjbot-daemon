var util = require('util');
const winston = require('winston');

var bleno = require('bleno');
var BlenoPrimaryService = bleno.PrimaryService;

var CommandCharacteristic = require('./characteristic-command');
var RequestCharacteristic = require('./characteristic-request');
var ResponseCharacteristic = require('./characteristic-response');
var ListenCharacteristic = require('./characteristic-listen');

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
