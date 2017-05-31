/**
 * Copyright 2017 IBM Corp. All Rights Reserved.
 */

const winston = require('winston');

function chunkedWrite(writeFunc, data, chunkSize) {
    winston.verbose("Writing BLE data (" + data.length + " bytes in chunks of size " + chunkSize + " bytes)");

    var chunkIdx = 1;
    for (start = 0; start < data.length; start = start + chunkSize) {
        var end = start + chunkSize;
        if (end >= data.length) {
            end = data.length;
        }
        winston.verbose(" > sending chunk # " + chunkIdx + " (start: " + start + ", end: " + end + ")");
        var dataSlice = data.slice(start, end);
        writeFunc(dataSlice);
        chunkIdx = chunkIdx + 1;
    }

    // conclude with null byte terminator to signal the client that the write is finished
    var nullByte = new Buffer('\0');
    winston.verbose(" > sending null byte to indicate write is complete");
    writeFunc(nullByte);
}

module.exports = { chunkedWrite: chunkedWrite };
