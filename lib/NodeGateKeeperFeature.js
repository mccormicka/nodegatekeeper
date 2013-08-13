'use strict';

var _ = require('lodash');

module.exports = function GateKeeperFeature(connection){
    var db = connection;
    var TYPE = 'nodegatekeeperfeature';
    var schema = connection.model('___' + TYPE + '___', {}).schema;
    schema.add({
        type: {type: String, 'default': TYPE},
        href: String,
        flag: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        permissions: [
            {
                name: String,
                enabled: {
                    type: Boolean,
                    'default': false
                },
                percent: {
                    type: Number,
                    'default': 0
                },
                total: {
                    type: Number,
                    'default': 0
                }
            }
        ]
    });

    /**
     * Expose type to outside world.
     * @type {string}
     */
    schema.statics.TYPE = TYPE;

    schema.statics.createFeature = function (feature, permissions, done) {
        var item = this;
        this.create(feature, function (err, result) {
            if (err) {
                done(err, null);
            } else {
                result.update({$push: {permissions: {$each: permissions}}}, function (err, success) {
                    if (success) {
                        item.findOne({_id: result._id}, function (err, results) {
                            done(err, results);
                        });
                    } else {
                        done(err, null);
                    }
                });
            }
        });
    };

    schema.statics.addPermissions = function (permissions, done) {
        var feature = this;
        feature.update({},
            {$push: {permissions: {$each: permissions}}},
            {multi: true},
            function (err, result) {
                done(err, result);
            });
    };

    schema.statics.removePermissions = function (permissions, done) {
        var names = permissionNames(permissions);
        var feature = this;

        feature.update({},
            { $pull: { permissions: { name: { $in: names} } } },
            { multi: true },
            function (err, result) {
                done(err, result);
            });
    };

    schema.statics.disablePermissions = function (query, permissions, done) {
        var feature = this;
        feature.findOne(query, function (err, result) {
            if (err) {
                done(err, null);
            } else if (result) {
                var names = permissionNames(result.permissions);
                if (permissions) {
                    names = permissionNames(permissions);
                }
                _.each(result.permissions, function (permission) {
                    if (_.contains(names, permission.name)) {
                        permission.enabled = false;
                    }
                });
                result.save(function (err, result) {
                    done(err, result);
                });
            } else {
                done(new Error('Unable to find feature'), result);
            }
        });
    };

    schema.statics.enablePermissions = function (query, permissions, done) {
        var feature = this;
        feature.findOne(query, function (err, result) {
            if (err) {
                done(err, null);
            } else if (result) {
                var names = permissionNames(permissions);
                _.each(result.permissions, function (permission) {
                    if (_.contains(names, permission.name)) {
                        permission.enabled = true;
                    }
                });
                result.save(function (err, result) {
                    done(err, result);
                });
            } else {
                done(new Error('Unable to find Feature'), result);
            }
        });
    };

    schema.statics.isEnabled = function (query, permissions, done) {
        var feature = this;
        feature.findOne(query, function (err, result) {
            if (err) {
                done(err, null);
            } else if (result) {
                if (permissions) {
                    var names = permissionNames(permissions);
                    var enabled = _.pluck(_.filter(result.permissions, 'enabled'), 'name');
                    var valid = _.every(names, function (value) {
                        return _.contains(enabled, value);
                    });
                    var validPermissions = _.filter(result.permissions, function (value) {
                        return _.contains(names, value.name);
                    });
                    percentValid(result, validPermissions, valid, function (valid) {
                        done(null, valid);
                    });

                } else {
                    percentValid(result, result.permissions, _.every(result.permissions, 'enabled'), function (valid) {
                        done(null, valid);
                    });
                }
            } else {
                done(null, false);
            }
        });
    };

    //-------------------------------------------------------------------------
    //
    // Private Methods
    //
    //-------------------------------------------------------------------------

    function percentValid(model, permissions, valid, done) {
        if (!valid) {
            return done(valid);
        } else {
            var count = 0;
            var percent = 0;
            _.each(permissions, function (permission) {
                count += permission.total;
                percent += permission.percent;
                permission.total++;
                if (permission.total === 10) {
                    permission.total = 0;
                }
            });
            percent = percent / permissions.length;
            if (percent < 1) {
                valid = (count < percent * ( permissions.length * 10));
            }
            model.save(function () {
                done(valid);
            });
        }
    }

    function permissionNames(permissions) {
        var names = _.map(_.pluck(permissions, 'name'), function (value) {
            return value.toLowerCase();
        });
        return names;
    }

    return db.model(TYPE, schema);
};