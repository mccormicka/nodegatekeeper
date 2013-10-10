'use strict';

var log = require('nodelogger').Logger(__filename);
var _ = require('lodash');

exports = module.exports = function ErrorUtil(err) {
    if (err) {
        if (err.name === 'MongoError') {
            return handleMongoError(err);
        } else if (err.name === 'ValidationError') {
            log.error('ValidationError', err);
            return {message: 'gatekeeper.error.invalid.params', data: _.map(err.errors, function (error) {
                return {field: error.path, reason: error.type};
            })};
        } else {
            log.error('Unhandled GateKeeper error', err);
            return {message: 'gatekeeper.error.unhandled'};
        }
    }
};

exports.isGateKeeperError = function(err){
    return (err && err.message && err.message.indexOf('gatekeeper') > -1);
};


function handleMongoError(err) {
    var errorMessage;
    switch (err.code) {
    case 11000:
        errorMessage = {message: 'gatekeeper.error.conflict', data: 'duplicate'};
        break;
    default:
        log.error('MongoError', err);
        errorMessage = {message: 'gatekeeper.error.invalid.params', data:err };
        break;
    }
    return errorMessage;
}