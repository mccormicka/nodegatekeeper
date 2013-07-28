'use strict';

function NodeGateKeeper() {
    var _ = require('lodash');
    var Validator = require('validator').Validator;
    var sanitize = require('validator').sanitize;

    var validator = new Validator();
    validator.error = function (error) {
        validator.errors.push(error);
    };
    validator.getErrors = function () {
        var temp = validator.errors;
        validator.errors = [];
        return temp.toString();
    };

    validator.errors = [];

    return {

        initialize: function (Mongoose, connection, permissionsFunction) {
            this.permissionsFunction = permissionsFunction;
            this.Feature = require('./lib/NodeGateKeeperFeature')(Mongoose, connection);
            this.Permission = require('./lib/NodeGateKeeperPermission')(Mongoose, connection);
            return function(req, res, next){
                next();
            };
        },

        permissions: function (done) {
            this.Permission.find({}, done);
        },

        addPermission: function (permission, done) {
            if (!isValidPermission(permission)) {
                done(new Error(validator.getErrors()), null);
            } else {
                var gate = this;
                permission.name = sanitizeValue(permission.name);
                gate.Permission.create(permission, function (err, result) {
                    if (err) {
                        done(err, null);
                    } else {
                        gate.Feature.addPermissions([permission], function (err) {
                            done(err, result);
                        });
                    }
                });
            }
        },

        removePermission: function (permission, done) {
            if (!isValidPermission(permission)) {
                done(new Error(validator.getErrors()), null);
            } else {
                var gate = this;
                gate.Feature.removePermissions([permission], function (err) {
                    if (err) {
                        done(err, null);
                    } else {
                        gate.Permission.remove({name: permission.name}, function (err, result) {
                            done(err, result);
                        });
                    }
                });
            }
        },

        //-------------------------------------------------------------------------
        //
        // Features
        //
        //-------------------------------------------------------------------------

        features: function (done) {
            this.Feature.find({}, done);
        },

        addFeature: function (feature, done) {
            if (!isValidFeature(feature) || !_.every(feature.permissions, isValidPermission)) {
                done(new Error(validator.getErrors()), null);
            } else {
                var gate = this;
                feature.flag = sanitizeValue(feature.flag);
                feature.description = sanitizeValue(feature.description);
                gate.Permission.find({}, function (err, permissions) {
                    gate.Feature.createFeature(feature, permissions, function (err, result) {
                        done(err, result);
                    });
                });
            }
        },

        removeFeature: function (feature, done) {
            if (!isValidFeature(feature)) {
                done(new Error(validator.getErrors()), null);
            } else {
                var gate = this;
                feature.flag = sanitizeValue(feature.flag);
                gate.Feature.remove({flag: feature.flag}, function (err, result) {
                    done(err, result);
                });
            }
        },

        updateFeature: function (feature, done) {
            if (!isValidFeature(feature)) {
                done(new Error(validator.getErrors()), null);
            } else if (!_.every(feature.permissions, isValidPermission)) {
                done(new Error('error.permissions.update'));
            } else {
                var gate = this;
                _.each(feature.permissions, constrainPermissionPercentages);
                gate.Feature.update({flag: feature.flag}, feature, function (err, result) {
                    done(err, result);
                });
            }
        },

        isEnabled: function (options, done) {
            this.Feature.isEnabled({flag: options.flag}, options.permissions, done);
        },

        isEnabledFeatureRoute: function (flag) {
            var gate = this;
            return function (req, res, next) {
                gate.permissionsFunction(req, res, function(err, result){
                    if(err){
                        next(err);
                        return;
                    }
                    gate.isEnabled({flag: flag, permissions: result}, function (err, result) {
                        if (err) {
                            next(err);
                        } else if (!result) {
                            next(new Error('gatekeeper.authorization.error'));
                        } else {
                            next();
                        }
                    });
                });

            };
        }
    };

    //-------------------------------------------------------------------------
    //
    // Private Methods
    //
    //-------------------------------------------------------------------------

    function sanitizeValue(value) {
        return sanitize(value).xss();
    }

    function validateParams(value) {
        validator.check(value, 'invalid.parameters').notEmpty();
        validator.check(value, 'invalid.parameters').is('^[0-9a-zA-Z \'-]+$');
    }

    function isValidPermission(permission) {
        var valid = !(_.isUndefined(permission) || _.isNull(permission) ||
            _.isUndefined(permission.name) || _.isNull(permission.name));
        if (valid) {
            validateParams(permission.name);
        } else {
            validator.errors.push('invalid.permission');
        }
        return (validator.errors.length === 0);
    }

    function isValidFeature(feature) {
        var valid = !(_.isUndefined(feature) || _.isNull(feature) ||
            _.isUndefined(feature.flag) || _.isNull(feature.flag));

        if (valid) {
            validateParams(feature.flag);
        } else {
            validator.errors.push('invalid.feature');
        }
        return validator.errors.length === 0;
    }

    function constrainPermissionPercentages(permission) {
        if (permission.percent > 100) {
            permission.percent = 1;
        } else if (permission.percent > 1) {
            permission.percent = permission.percent / 100;
        } else if (permission.percent < 0) {
            permission.percent = 0;
        }
        return permission;
    }
}

exports = module.exports = new NodeGateKeeper();
