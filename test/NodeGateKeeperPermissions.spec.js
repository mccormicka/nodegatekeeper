describe('GateKeeper Permissions tests', function () {
    'use strict';

    var mockgoose = require('mockgoose');
    var mongoose = require('mongoose');
    mockgoose(mongoose);
    var connection = mongoose.createConnection('mongodb://localhost:3001/NodeGatekeeperTests');

    var TestClass = require('../index');

    var permissionFunction = function (req, res, next) {
        next(null, [{name:'admin'}]);
    };

    TestClass.initialize(connection, permissionFunction);
    var Feature = TestClass.Feature;
    var Permission = TestClass.Permission;

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
            ]}, function (err) {
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

    describe('Should', function () {

        it('Return all permission levels', function (done) {
            gate.permissions(function (err, results) {
                expect(err).toBeNull();
                expect(results.length).toBe(2);
                Permission.create({name: 'perm'}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result.name).toBe('perm');
                    gate.permissions(function (err, results) {
                        expect(err).toBeNull();
                        expect(results.length).toBe(3);
                        done(err);
                    });
                });
            });
        });

        it('Create a permission', function (done) {
            gate.addPermission({name: 'testpermission'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('testpermission');
                }
                done(err);
            });
        });

        it('Create a permission with white spaces', function (done) {
            gate.addPermission({name: 'test permission'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('test permission');
                }
                done(err);
            });
        });

        it('Create a permission with \' apostrophe ', function (done) {
            gate.addPermission({name: 'test\'s'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('test\'s');
                }
                done(err);
            });
        });

        it('Create a permission with - apostrophe ', function (done) {
            gate.addPermission({name: 'test-s'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('test-s');
                }
                done(err);
            });
        });

        it('Strip out possible xss attacks', function (done) {
            gate.addPermission({name: '<a href="javascript:alert(\'xss\')">some text</a>'}, function (err, result) {
                expect(err).not.toBeNull();
                expect(err.message).toBe('gatekeeper.error.invalid.params');
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Have a default permission level set', function (done) {
            gate.addFeature({flag: 'one', description: 'testing'}, function (err, result) {
                expect(err).toBeUndefined();
                expect(result).toBeTruthy();
                if (result) {
                    var permissions = result.permissions;
                    expect(permissions.length).toBe(2);
                    expect(permissions[0].name).toBe('admin');
                }
                done(err);
            });
        });

        it('Remove a permission', function (done) {
            gate.removePermission({name: 'before-permission'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('before-permission');
                    Permission.findOne({name: 'before-permission'}, function (err, result) {
                        expect(err).toBeNull();
                        expect(result).toBeUndefined();
                        done(err);
                    });
                } else {
                    done(err);
                }
            });
        });

        it('Remove all permission references from Features if a permission is removed.', function (done) {
            Feature.findOne({flag: 'before-feature'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.permissions.length).toBe(2);
                    gate.removePermission({name: 'before-permission'}, function (err, result) {
                        expect(err).toBeNull();
                        expect(result).toBeDefined();
                        Feature.findOne({flag: 'before-feature'}, function (err, result) {
                            expect(err).toBeNull();
                            expect(result).toBeDefined();
                            if (result) {
                                expect(result.permissions.length).toBe(1);
                                expect(result.permissions[0].name).toBe('admin');
                                done(err);
                            } else {
                                done('no result found!');
                            }
                        });
                    });
                } else {
                    done('no result found!');
                }
            });
        });

        it('Add Permission level to all Features when created', function (done) {
            gate.addPermission({name: 'awesome-permission'}, function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeDefined();
                if (result) {
                    expect(result.name).toBe('awesome-permission');
                    Feature.findOne({flag: 'before-feature'}, function (err, result) {
                        expect(err).toBeNull();
                        expect(result).toBeDefined();
                        if (result) {
                            expect(result.permissions.length).toBe(3);
                            expect(result.permissions[result.permissions.length - 1].name).toContain('awesome-permission');
                            done(err);
                        } else {
                            done('result not found');
                        }
                    });
                } else {
                    done('result not created');
                }
            });
        });

        it('Be disabled by default', function (done) {
            gate.addFeature({flag: 'one'}, function (err, result) {
                expect(err).toBeUndefined();
                expect(result).toBeTruthy();
                if (result) {
                    expect(result.permissions[0].enabled).toBe(false);
                }
                done(err);
            });
        });
    });

    describe('Should NOT', function () {

        it('Remove a blank value \'\'', function (done) {
            gate.removePermission('', function (err, result) {
                expect(err).not.toBeNull();
                if (err) {
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                }
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Remove a null value', function (done) {
            gate.removePermission(null, function (err, result) {
                expect(err).not.toBeNull();
                if (err) {
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                }
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Add an undefined value', function (done) {
            gate.removePermission(undefined, function (err, result) {
                expect(err).not.toBeNull();
                if (err) {
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                }
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Remove an empty value {}', function (done) {
            gate.removePermission({}, function (err, result) {
                expect(err).not.toBeNull();
                if (err) {
                    expect(err.message).toBe('gatekeeper.error.invalid.params');
                }
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Remove an unknown Permission', function (done) {
            gate.removePermission({name: 'wahtsss appppp'}, function (err, result) {
                expect(err).toBeNull();
                expect(result.length).toBe(0);
                done(err);
            });
        });

        it('Add a duplicate Permission', function (done) {
            gate.addPermission({name: 'Duplicate'}, function (err, result) {
                expect(err).toBeNull();
                expect(result.name).toBe('duplicate');
                gate.addPermission({name: 'duplicate'}, function (err) {
                    expect(err).toBeDefined();
                    console.log(err);
                    expect(err.message).toBe('gatekeeper.error.conflict');
                    expect(err.data).toBe('duplicate');
                    done();
                });
            });
        });

        it('Add a blank vallue \'\'', function (done) {
            gate.addPermission('', function (err, result) {
                expect(err).not.toBeNull();
                expect(err.message).toBe('gatekeeper.error.invalid.params');
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Add a null value', function (done) {
            gate.addPermission(null, function (err, result) {
                expect(err).not.toBeNull();
                expect(err.message).toBe('gatekeeper.error.invalid.params');
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Add an undefined value', function (done) {
            gate.addPermission(undefined, function (err, result) {
                expect(err).not.toBeNull();
                expect(err.message).toBe('gatekeeper.error.invalid.params');
                expect(result).toBeUndefined();
                done();
            });
        });

        it('Add an empty value {}', function (done) {
            gate.addPermission({}, function (err, result) {
                expect(err).not.toBeNull();
                expect(err.message).toBe('gatekeeper.error.invalid.params');
                expect(result).toBeUndefined();
                done();
            });
        });
    });
});