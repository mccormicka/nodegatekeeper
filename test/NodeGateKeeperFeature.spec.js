describe('GateKeeperFeature tests', function () {
    'use strict';

    var mockgoose = require('mockgoose');
    var mongoose = require('mongoose');
    mockgoose(mongoose);
    var connection = mongoose.createConnection('mongodb://localhost:3001/NodeGatekeeperTests');
    var Gate = require('../index');
    Gate.initialize(connection, function (req, res, next) {
        next(null, [
            {name: 'admin'}
        ]);
    });

    var TestClass = Gate.Feature;
    var Permission = Gate.Permission;

    beforeEach(function (done) {
        mockgoose.reset();
        Permission.create({name: 'admin'}, {name: 'before-permission'}, function (err, admin, beforePermission) {
            TestClass.create({flag: 'before-feature', permissions: [
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
        it('Add a feature', function (done) {
            TestClass.createFeature({flag: 'one', description: 'testing'}, [], function (err, result) {
                expect(err).toBeNull();
                expect(result).toBeTruthy();
                done(err);
            });
        });
    });
});