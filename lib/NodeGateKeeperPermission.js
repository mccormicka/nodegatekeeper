'use strict';

module.exports = function GateKeeperPermission(connection) {
    var db = connection;
    var validate = require('mongoose-validator').validate;
    var TYPE = 'nodegatekeeperpermission';
    var schema = connection.model('___' + TYPE + '___', {}).schema;
    schema.add({
        type: {type: String, 'default': TYPE},
        href: {
            type: String,
            'default': '/' + TYPE + '/'
        },
        name: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
            validate: [
                validate({message: 'min.length:1'}, 'len', 1),
                validate('notNull'),
                validate('notEmpty')
            ]
        }
    });

    /**
     * Expose type to outside world.
     * @type {string}
     */
    schema.statics.TYPE = TYPE;
    schema.pre('save', function (next) {
        var self = this;
        self.name = self.name.toLowerCase();
        next();
    });

    return db.model(TYPE, schema);
};