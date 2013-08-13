'use strict';

var NodeGateKeeper = require('./lib/NodeGatekeeper');
var gatekeeper = new NodeGateKeeper();

/**
 * Initialize the gatekeeper middleware
 */
module.exports.initialize = gatekeeper.initialize;

module.exports.permissions = gatekeeper.permissions;
module.exports.addPermission = gatekeeper.addPermission;
module.exports.removePermission = gatekeeper.removePermission;
module.exports.features = gatekeeper.features;
module.exports.addFeature = gatekeeper.addFeature;
module.exports.removeFeature = gatekeeper.removeFeature;
module.exports.updateFeature = gatekeeper.updateFeature;
module.exports.isEnabled = gatekeeper.isEnabled;
module.exports.isEnabledFeature = gatekeeper.isEnabledFeature;

