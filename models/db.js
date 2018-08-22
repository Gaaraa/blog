var settings = require('../settings');
var Db = require('mongodb').Db;
var connection = require('mongodb').connection;
var Server = require('mongodb').Server;

module.exports = new Db(settings.db,
new Server(settings.host, settings.port), {safe: true});