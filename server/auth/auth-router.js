var express = require('express');
var authControllers = require('./auth-controller');

var auth = require('./index');
var authRouter = express.Router();
var r = require('../db');

var bcrypt = require('bcryptjs');

//GitHub authentication routes
//GitHub authentication callback route
authRouter.use('/login/callback/github', auth.authenticate('github'), function (req, res) {
    res.redirect('/');
});
//GitHub authentication route
authRouter.get('/login/github', auth.authenticate('github'));

//Local authentication routes
//Local login route
authRouter.get('/login', auth.authenticate('local', {successRedirect: '/auth/user', failureRedirect: '/login'}), function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    res.redirect("/auth/user");
});

//Local register route
authRouter.get('/register', function(req, res) {
    //Checks if the email, username and password are valid
    req.checkQuery('email', 'Invalid email').isEmail();
    req.checkQuery('username', 'Invalid getparam').notEmpty();
    req.checkQuery('password', 'Invalid getparam').notEmpty();

    var query = req.query;

    //Check to see if there are any errors, and throw them if so
    var errors = req.validationErrors();
    if (errors) {
        res.send('There have been validation errors: ', 400);
        return;
    } else {
        //TODO Check if username/email already exists
        //Check to see if a user with that username already exists
        r.table("users").getAll(query.username.toLowerCase(), {index: "usernameL"}).isEmpty().run(r.conn, function(err, result) {
            if (err) throw err;
            if (result) {
                //Check to see if a user with that email already exists
                r.table("users").getAll(query.email.toLowerCase(), {index: "email"}).isEmpty().run(r.conn, function(err, result) {
                    if (err) throw err;
                    if (result) {
                        //TODO Hash password
                        var hash;
                        //Generating a salt
                        bcrypt.genSalt(10, function (err, salt) {
                            if (err) {
                                //TODO Throw error
                            } else {
                                //Hashing the password with the salt
                                bcrypt.hash(query.password, salt, function (err, hash) {
                                    if (err) {
                                        //TODO Throw error
                                    } else {
                                        var email = query.email.toLowerCase();
                                        var usernameL = query.username.toLowerCase();
                                        //Inserting the user object into the database
                                        r.table('users')
                                            .insert({
                                                username: query.username,
                                                usernameL: usernameL,
                                                email: email,
                                                type: 'local',
                                                password: hash
                                            })
                                            .run(r.conn)
                                            .then(function (response) {

                                                return r.table('users')
                                                    //Getting the newly created user
                                                    .get(response.generated_keys[0])
                                                    .run(r.conn);
                                            })
                                            .then(function (newUser) {
                                                //Logging in
                                                //TODO Log in
                                            });
                                    }
                                });
                            }
                        });
                    } else {
                        //TODO Throw error
                    }
                });
            } else {
                //TODO Throw error
            }
        });
    }
});

//Route to get user info
authRouter.use('/user', authControllers.getUser);
//Route to logout
authRouter.use('/logout', authControllers.logout);

module.exports = authRouter;