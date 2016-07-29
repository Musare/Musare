/*var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.sendFile('client/html/index.html', {root: "./"})
});

app.use(express.static('static'));

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});*/



/* Database stuff
    var r = require('rethinkdb');
    var connection = null;
    r.connect( {host: 'localhost', port: 28015, db: "musare"}, function(err, conn) {
        if (err) throw err;
        connection = conn;
    });
*/

var express = require('express');
var session = require('express-session');
var engines = require('consolidate');

var app = express();
var auth = require('./auth');
var authRouter = require('./auth/auth-router');

// Middleware
app
    .use(session({
        secret: 'thisisoursecretcode',
        resave: false,
        saveUninitialized: true
    }))
    .use(auth.initialize())
    .use(auth.session());

// Views
app
    .set('views', './client/html')
    .engine('html', engines.mustache)
    .set('view engine', 'html');

// Routes
app
    .use('/auth', authRouter)
    .get('/', function (req, res) {
        res.render('index.html', { user: req.user });
    })
    .use(express.static(__dirname + '../static'))
    .use('*', function (req, res) {
        res.status(404).send('404 Not Found').end();
    });

app.listen(3000);