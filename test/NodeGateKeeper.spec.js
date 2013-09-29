describe('GateKeeper tests', function () {
    'use strict';

    var mockgoose = require('mockgoose');
    var mongoose = require('mongoose');
    mockgoose(mongoose);
    var connection = mongoose.createConnection('mongodb://localhost:3001/NodeGatekeeperTests');

    var TestClass = require('../index');
    TestClass.initialize(connection, function (req, res, next) {
        next(null, [
            {name: 'admin'}
        ]);
    });
    var Feature = TestClass.Feature;
    var Permission = TestClass.Permission;

    var ObjectId = require('mongoose').Types.ObjectId;
    var _ = require('lodash');

    var gate;
    beforeEach(function (done) {
        mockgoose.reset();
        gate = TestClass;
        Permission.create({name: 'admin'}, {name: 'before-permission'}, function (err, admin, beforePermission) {
            Feature.create({flag: 'before-feature', permissions: [
                    {
                        name: beforePermission.name,
                        _id: beforePermission._id
                    },
                    {
                        name: admin.name,
                        _id: admin._id
                    }
                ], enabled: true},
                {flag: 'percent', enabled: true}, function (err) {
                    done(err);
                });
        });
    });

    afterEach(function (done) {
        mockgoose.reset();
        done();
    });

    it('test GateKeeper can be required', function () {
        expect(TestClass).toBeTruthy();
    });

    describe('Features', function () {

        describe('Should', function () {

            it('Return all Features', function (done) {
                gate.features(function (err, results) {
                    expect(err).toBeNull();
                    expect(results.length).toBe(2);
                    Feature.create({flag: 'another-feature', permissions: [
                        {
                            name: 'after-permission',
                            _id: new ObjectId()
                        }
                    ]}, function (err, result) {
                        expect(err).toBeNull();
                        expect(result.flag).toBe('another-feature');
                        gate.features(function (err, results) {
                            expect(err).toBeNull();
                            expect(results.length).toBe(3);
                            done(err);
                        });
                    });
                });
            });

            xit('Return features for only a certain permission level', function () {
                expect(false).toBeTruthy();
            });

            it('Add a feature without any permissions should have all permissions disabled', function (done) {
                gate.addFeature({flag: 'test-feature'}, function (err, result) {
                    expect(err).toBeUndefined();
                    expect(result).toBeDefined();
                    if (result) {
                        expect(result.permissions.length).toBe(2);
                    }
                    done(err);
                });
            });

            it('add a feature with a unique flag', function (done) {
                gate.addFeature({flag: 'one'}, function (err, result) {
                    expect(result.flag).toBe('one');
                    gate.addFeature({flag: 'one'}, function (err, result) {
                        expect(err).toBeTruthy();
                        expect(result).toBeNull();
                        done();
                    });
                });
            });

            it('make sure flags are case insensitive', function (done) {
                gate.addFeature({flag: 'One'}, function (err, result) {
                    expect(result.flag).toBe('one');
                    gate.addFeature({flag: 'one'}, function (err, result) {
                        expect(err).toBeTruthy();
                        expect(result).toBeNull();
                        done();
                    });
                });
            });

            it('Remove a feature', function (done) {
                gate.removeFeature({flag: 'before-feature'}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result).toBeDefined();
                    if (result) {
                        expect(result.flag).toBe('before-feature');
                        Feature.findOne({flag: 'before-permission'}, function (err, result) {
                            expect(err).toBeNull();
                            expect(result).toBeUndefined();
                            done(err);
                        });
                    } else {
                        done(err);
                    }
                });
            });

            it('Remove an unknown feature', function (done) {
                gate.removeFeature({flag: 'what'}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result.length).toBe(0);
                    done(err);
                });
            });

            it('Return the updated feature if one is found', function (done) {
                gate.updateFeature({'description': 'Really long', 'flag': 'before-feature', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result).not.toBeNull();
                    if (result) {
                        expect(result.description).toBe('Really long');
                    }
                    done(err);
                });
            });

            it('Not return an updated feature if one is not found', function (done) {
                gate.updateFeature({'description': 'Really long', 'flag': 'before-feature-fake', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true}
                ]}, function (err) {
                    expect(err).not.toBeNull();
                    if (err) {
                        expect(err.message).toBe('gatekeeper.error.invalid.params');
                        expect(err.data[0].value.flag).toBe('before-feature-fake');
                        done();
                    } else {
                        done('Updated feature test failure');
                    }
                });
            });

            it('Update a features permissions', function (done) {
                gate.updateFeature({'description': 'Really long', 'flag': 'before-feature', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result.flag).toBe('before-feature');
                    if (result) {
                        Feature.findOne({flag: 'before-feature'}, function (err, result) {
                            expect(err).toBeNull();
                            expect(result).toBeDefined();
                            if (result) {
                                expect(result.permissions[0].name).toBe('admin');
                                expect(result.permissions[0].percent).toBe(0.1);
                                done(err);
                            } else {
                                done('Error updating permission');
                            }
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });

            it('Add a feature with a feature object', function (done) {

                gate.addFeature({flag: 'one', permissions: [
                    {name: 'guest'},
                    {name: 'temp'}
                ]}, function (err, result) {
                    expect(err).toBeUndefined();
                    expect(result).toBeTruthy();
                    if (result) {
                        var permissions = result.permissions;
                        expect(permissions.length).toBe(4);
                        expect(permissions[0].name).toBe('guest');
                        expect(permissions[1].name).toBe('temp');
                    }
                    done(err);
                });
            });

            xit('Return features only for the set permission levels', function () {
                expect(false).toBeTruthy();
            });

        });

        describe('Should NOT', function () {

            it('Add a duplicate feature', function (done) {
                gate.addFeature({flag: 'before-feature'}, function (err, result) {
                    expect(err).toBeDefined();
                    expect(result).toBeNull();
                    if (err) {
                        expect(err).toBeDefined();
                        expect(err.message).toBe('gatekeeper.error.conflict');
                        expect(err.data).toBe('duplicate');
                    }
                    done();
                });
            });

            it('Add a feature with a permission String', function (done) {
                gate.addFeature({flag: 'one', permissions: [
                    'guest',
                    'temp'
                ]}, function (err, result) {
                    expect(err).toBeTruthy();
                    expect(result).toBeUndefined();
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                    done();
                });
            });

            it('Add a feature with a feature object and String', function (done) {
                gate.addFeature({flag: 'one', permissions: [
                    {name: 'guest'},
                    'temp'
                ]}, function (err, result) {
                    expect(err).toBeTruthy();
                    expect(result).toBeUndefined();
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                    done();
                });
            });
        });

        describe('isEnabled', function () {

            it('Return isEnabled false if any permissions are disabled and no permissions passed', function (done) {
                gate.isEnabled({flag: 'before-feature'}, function (err, result) {
                    expect(result).toBe(false);
                    done(err);
                });
            });

            it('Return isEnabled false if any permissions are disabled and no permissions passed', function (done) {
                gate.updateFeature({'flag': 'before-feature', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true},
                    {'name': 'before-permission', 'percent': 10, 'enabled': false}
                ]}, function (err, result) {
                    expect(err).toBeNull();
                    if (result) {
                        gate.isEnabled({flag: 'before-feature'}, function (err, result) {
                            expect(result).toBe(false);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });

            it('Return isEnabled true if all permissions are enabled and no permissions passed', function (done) {
                gate.updateFeature({'flag': 'before-feature', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true},
                    {'name': 'before-permission', 'percent': 10, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();

                    if (result) {
                        gate.isEnabled({flag: 'before-feature'}, function (err, result) {
                            expect(result).toBe(true);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });

            it('Return isEnabled true for enabled feature with permission', function (done) {
                gate.updateFeature({'flag': 'before-feature', 'permissions': [
                    {'name': 'admin', 'percent': 10, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();

                    if (result) {
                        gate.isEnabled({flag: 'before-feature', permissions: [
                            {name: 'Admin'}
                        ]}, function (err, result) {
                            expect(result).toBe(true);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });

            });

            it('Return isEnabled false for an unknown permission', function (done) {
                gate.isEnabled({flag: 'before-feature', permissions: [
                    {name: 'blah'}
                ]}, function (err, result) {
                    expect(result).toBe(false);
                    done(err);
                });
            });

            it('Return isEnabled false if one of the permissions is unknown', function (done) {
                gate.isEnabled({flag: 'before-feature', permissions: [
                    {name: 'Admin'},
                    {name: 'blah'}
                ]}, function (err, result) {
                    expect(result).toBe(false);
                    done(err);
                });
            });
        });

        describe('isEnabledFeature middleware', function () {

            describe('Permissions Required', function () {

                it('Return isEnabled false if any permissions are disabled and no permissions passed', function (done) {
                    var callback = gate.isEnabledFeature('before-feature');
                    callback({}, {}, function (err, result) {
                        expect(err).toEqual({ message: 'gatekeeper.error.forbidden' });
                        expect(result).toBe(false);
                        done();
                    });
                });

                it('Return isEnabled false if any permissions are disabled and no permissions passed', function (done) {
                    gate.updateFeature({'flag': 'before-feature', 'permissions': [
                        {'name': 'admin', 'percent': 10, 'enabled': true},
                        {'name': 'before-permission', 'percent': 10, 'enabled': false}
                    ]}, function (err, result) {
                        expect(err).toBeNull();
                        if (result) {
                            gate.permissionsFunction = function (req, res, next) {
                                next();
                            };
                            var callback = gate.isEnabledFeature('before-feature');
                            callback({}, {}, function (err, result) {
                                expect(err).toEqual({ message: 'gatekeeper.error.forbidden' });
                                expect(result).toBe(false);
                                done();
                            });
                        } else {
                            done('Error updating feature');
                        }
                    });
                });

                it('Return isEnabled true if all permissions are enabled and no permissions passed', function (done) {
                    gate.updateFeature({'flag': 'before-feature', 'permissions': [
                        {'name': 'admin', 'percent': 10, 'enabled': true},
                        {'name': 'before-permission', 'percent': 10, 'enabled': true}
                    ]}, function (err, result) {
                        expect(err).toBeNull();
                        if (result) {
                            gate.permissionsFunction = function (req, res, next) {
                                next();
                            };
                            var callback = gate.isEnabledFeature('before-feature');
                            callback({}, {}, function (err, result) {
                                expect(result).toBe(true);
                                expect(err).toBeNull();
                                done();
                            });
                        } else {
                            done('Error updating feature');
                        }
                    });
                });

                it('Return isEnabled true for enabled feature with permission', function (done) {
                    gate.updateFeature({'flag': 'before-feature', 'permissions': [
                        {'name': 'admin', 'percent': 10, 'enabled': true}
                    ]}, function (err, result) {
                        expect(err).toBeNull();
                        if (result) {
                            var callback = gate.isEnabledFeature('before-feature');
                            callback({}, {}, function (err, result) {
                                expect(result).toBe(true);
                                expect(err).toBeNull();
                                done();
                            });
                        } else {
                            done('Error updating feature');
                        }
                    });
                });

                it('Return isEnabled false for an unknown permission', function (done) {
                    gate.permissionsFunction = function (req, res, next) {
                        next(null, [
                            {name: 'blah'}
                        ]);
                    };
                    var callback = gate.isEnabledFeature('before-feature');
                    callback({}, {}, function (err, result) {
                        expect(err).toEqual({ message: 'gatekeeper.error.forbidden' });
                        expect(result).toBe(false);
                        done();
                    });
                });

                it('Return isEnabled false if one of the permissions is unknown', function (done) {
                    gate.permissionsFunction = function (req, res, next) {
                        next(null, [
                            {name: 'admin'},
                            {name: 'blah'}
                        ]);
                    };
                    var callback = gate.isEnabledFeature('before-feature');
                    callback({}, {}, function (err, result) {
                        expect(err).toEqual({ message: 'gatekeeper.error.forbidden' });
                        expect(result).toBe(false);
                        done();
                    });
                });

            });

            describe('NO permissions required', function () {

                it('Return isEnabled true if feature is enabled', function (done) {
                    gate.permissionsFunction = function (req, res, next) {
                        next();//Send no permissions with the request
                    };
                    var callback = gate.isEnabledFeature('before-feature', false);
                    callback({}, {}, function (err, result) {
                        expect(result).toBe(true);
                        expect(err).toBeNull();
                        done();
                    });
                });

                it('Return isEnabled false if feature is disabled', function (done) {
                    gate.permissionsFunction = function (req, res, next) {
                        next();//Send no permissions with the request
                    };
                    var callback = gate.isEnabledFeature('before-feature', false);
                    callback({}, {}, function (err, result) {
                        expect(result).toBe(true);
                        expect(err).toBeNull();
                        done();
                    });
                });
            });

        });

        describe('Enabled Percentage', function () {

            it('Be enabled at 50% permission ', function (done) {
                gate.updateFeature({'flag': 'percent', 'permissions': [
                    {'name': 'percent', 'percent': 0.5, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();
                    if (result) {
                        percentageChange(gate, [
                            {name: 'percent'}
                        ], function (results) {
                            var enabled = _.filter(results, function (value) {
                                return value;
                            });
                            var disabled = _.filter(results, function (value) {
                                return !value;
                            });
                            expect(enabled.length).toBe(5);
                            expect(disabled.length).toBe(5);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });

            it('isEnabled should be false if percent is set but enabled is false', function (done) {
                gate.updateFeature({'flag': 'percent', 'permissions': [
                    {'name': 'percent', 'percent': 0.5, 'enabled': false}
                ]}, function (err) {
                    expect(err).toBeNull();
                    gate.isEnabled({flag: 'percent', permissions: [
                        {name: 'percent'}
                    ]}, function (err, result) {
                        expect(result).toBe(false);
                        done();
                    });
                });
            });

            it('Be enabled at least once with a 25% permission', function (done) {

                gate.updateFeature({'flag': 'percent', 'permissions': [
                    {'name': 'percent', 'percent': 0.25, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();

                    if (result) {
                        percentageChange(gate, [
                            {name: 'percent'}
                        ], function (results) {
                            var enabled = _.filter(results, function (value) {
                                return value;
                            });
                            var disabled = _.filter(results, function (value) {
                                return !value;
                            });
                            expect(enabled.length).toBe(3);
                            expect(disabled.length).toBe(7);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });

            it('Be enabled at least once with a 1% permission', function (done) {

                gate.updateFeature({'flag': 'percent', 'permissions': [
                    {'name': 'percent', 'percent': 0.01, 'enabled': true}
                ]}, function (err, result) {
                    expect(err).toBeNull();

                    if (result) {
                        percentageChange(gate, [
                            {name: 'percent'}
                        ], function (results) {
                            var enabled = _.filter(results, function (value) {
                                return value;
                            });
                            var disabled = _.filter(results, function (value) {
                                return !value;
                            });
                            expect(enabled.length).toBe(1);
                            expect(disabled.length).toBe(9);
                            done(err);
                        });
                    } else {
                        done('Error updating feature');
                    }
                });
            });
        });

        it('NOT Be enabled with a 0% permission level', function (done) {
            gate.updateFeature({'flag': 'percent', 'permissions': [
                {'name': 'percent', 'percent': 0, 'enabled': true}
            ]}, function (err, result) {
                expect(err).toBeNull();

                if (result) {
                    percentageChange(gate, [
                        {name: 'percent'}
                    ], function (results) {
                        var enabled = _.filter(results, function (value) {
                            return value;
                        });
                        var disabled = _.filter(results, function (value) {
                            return !value;
                        });
                        expect(enabled.length).toBe(0);
                        expect(disabled.length).toBe(10);
                        done(err);
                    });
                } else {
                    done('Error updating feature');
                }
            });
        });
    });

    function percentageChange(gate, permissions, done) {
        var results = [];
        gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
            results.push(result);
            gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                results.push(result);
                gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                    results.push(result);
                    gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                        results.push(result);
                        gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                            results.push(result);
                            gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                                results.push(result);
                                gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                                    results.push(result);
                                    gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                                        results.push(result);
                                        gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                                            results.push(result);
                                            gate.isEnabled({flag: 'percent', permissions: permissions}, function (err, result) {
                                                results.push(result);
                                                done(results);
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }
});