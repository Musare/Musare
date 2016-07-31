var r = require('rethinkdb');
require('rethinkdb-init')(r);

r.connections = [];

//Creates new connection
r.getNewConnection = function () {
    return r.connect({host: 'localhost', port: 28015, db: 'musare'}).then(function (conn) {
        conn.use("musare");
        r.connections.push(conn);
        return conn;
    });
};

//Sets up the tables for the database
r.init({host: 'localhost', port: 28015, db: 'musare'}, [
    {
        name: 'users',
        indexes: ['username', 'usernameL', 'email']
    }
]).then(function (conn) {
    r.conn = conn;
    r.connections.push(conn);
    r.conn.use("musare");
});

module.exports = r;