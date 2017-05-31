var util = require('util');

var bleno = require('bleno');
var BlenoPrimaryService = bleno.PrimaryService;

var HardwareCharacteristic = require('./characteristic-hardware');
var ConfigurationCharacteristic = require('./characteristic-configuration');
var CapabilityCharacteristic = require('./characteristic-capability');

function ConfigurationService(tjbot, name) {
    ConfigurationService.super_.call(this, {
        uuid: '799d5f0d-0001-0000-a6a2-da053e2a640a',
        characteristics: [
            new HardwareCharacteristic(tjbot),
            new ConfigurationCharacteristic(name),
            new CapabilityCharacteristic(tjbot)
        ]
    });
}

util.inherits(ConfigurationService, BlenoPrimaryService);

module.exports = ConfigurationService;
