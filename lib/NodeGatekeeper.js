'use strict';

exports = module.exports = function NodeGateKeeper() {
    var _ = require('lodash');
    var Validator = require('validator').Validator;
    var sanitize = require('validator').sanitize;
    var errorUtil = require('./ErrorUtil');

    var validator = new Validator();
    validator.error = function (error) {
        if (error === 'api.error.invalid.params') {
            error = {message: error, data: []};
        }
        validator.errors.push(error);
    };
    validator.getErrors = function () {
        var temp = validator.errors[0];
        validator.errors.length = 0;
        return temp;
    };

    validator.errors = [];

    return {

        initialize: function (connection, permissionsFunction) {
            this.permissionsFunction = permissionsFunction;
            this.Feature = require('./NodeGateKeeperFeature')(connection);
            this.Permission = require('./NodeGateKeeperPermission')(connection);
            return function (req, res, next) {
                next();
            };
        },

        permissions: function (done) {
            this.Permission.find({}, done);
        },

        addPermission: function (permission, done) {
            if (!isValidPermission(permission)) {
                done(validator.getErrors());
            } else {
                var gate = this;
                permission.name = sanitizeValue(permission.name);
                gate.Permission.create(permission, function (err, result) {
                    if (err) {
                        done(errorUtil(err), null);
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
                done(validator.getErrors());
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
                done(validator.getErrors());
            } else {
                var gate = this;
                feature.flag = sanitizeValue(feature.flag);
                feature.description = sanitizeValue(feature.description);
                gate.Permission.find({}, function (err, permissions) {
                    gate.Feature.createFeature(feature, permissions, function (err, result) {
                        done(errorUtil(err), result);
                    });
                });
            }
        },

        removeFeature: function (feature, done) {
            if (!isValidFeature(feature)) {
                done(validator.getErrors());
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
                done(validator.getErrors());
            } else if (!_.every(feature.permissions, isValidPermission)) {
                done({message: 'api.error.invalid.params', data: [
                    {field: 'permission', value: feature.permissions}
                ]});
            } else {
                var gate = this;
                _.each(feature.permissions, constrainPermissionPercentages);
                gate.Feature.findOneAndUpdate({flag: feature.flag}, feature, function (err, result) {
                    if (!err && !result) {
                        err = {message: 'api.error.invalid.params', data: [
                            {field: 'feature', value: feature}
                        ]};
                    }
                    done(err, result);
                });
            }
        },

        isEnabled: function (options, done) {
            this.Feature.isEnabled({flag: options.flag}, options.permissions, done);
        },

        /**
         * Connect Middleware.
         * @param flag Gatekeeper flag to check against.
         * @param validatePermissions optional whether to validate against the
         * users permission levels. Defaults to true.
         * @returns Connect Middleware Function
         */
        isEnabledFeature: function (flag, validatePermissions) {
            validatePermissions = _.isUndefined(validatePermissions) ? true : false;
            if (validatePermissions) {
                return validateUserPermissions(this, flag);
            } else {
                return validateWithoutUserPermissions(this, flag);
            }
        }
    };

    //-------------------------------------------------------------------------
    //
    // Private Methods
    //
    //-------------------------------------------------------------------------

    function validateUserPermissions(gate, flag) {
        return function (req, res, next) {
            gate.permissionsFunction(req, res, function (err, result) {
                if (err) {
                    next(err, false);
                    return;
                }
                gate.isEnabled({flag: flag, permissions: result}, function (err, result) {
                    if (err) {
                        next(err, false);
                    } else if (!result) {
                        next({message: 'api.error.forbidden'}, result);
                    } else {
                        next(null, result);
                    }
                });
            });
        };
    }

    function validateWithoutUserPermissions(gate, flag) {
        return function (req, res, next) {
            gate.Feature.isEnabledWithoutPermission({flag: flag}, function (err, result) {
                if (err) {
                    next(err, false);
                } else if (!result) {
                    next({message: 'api.error.forbidden'}, result);
                } else {
                    next(null, result);
                }
            });
        };
    }

    function sanitizeValue(value) {
        return sanitize(value).xss().toLowerCase();
    }

    function validateParams(value) {
        validator.check(value, 'api.error.invalid.params').notEmpty();
        validator.check(value, 'api.error.invalid.params').is('^[0-9a-zA-Z \'-]+$');
    }

    function isValidPermission(permission) {
        var valid = !(_.isUndefined(permission) || _.isNull(permission) ||
            _.isUndefined(permission.name) || _.isNull(permission.name));
        if (valid) {
            validateParams(permission.name);
        } else {
            validator.errors.push({message: 'api.error.invalid.params', data: [
                {field: 'permission', value: permission}
            ]});
        }
        return (validator.errors.length === 0);
    }

    function isValidFeature(feature) {
        var valid = !(_.isUndefined(feature) || _.isNull(feature) ||
            _.isUndefined(feature.flag) || _.isNull(feature.flag));

        if (valid) {
            validateParams(feature.flag);
        } else {
            validator.errors.push({message: 'api.error.invalid.params', data: [
                {field: 'feature', value: feature}
            ]});
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
};