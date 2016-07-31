var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var r = require('../db');
var bcrypt = require('bcryptjs');

passport.serializeUser(function (user, done) {
    return done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    r
        .table('users')
        .get(id)
        .run(r.conn)
        .then(function (user) {
            delete user.password;
            done(null, user);
        });
});

var loginCallbackHandler = function (objectMapper, type) {
    return function (arg1, arg2, arg3, arg4) {
        /*
        * If the type is github
        * arg1 is the accessToken
        * arg2 is the refresh token
        * arg3 is profile object
        * arg4 is done callback
        *
        * if the type is local
        * arg1 is username
        * arg2 is password
        * arg3 is done callback
        * */
        var username, done;
        if (type === "github") {
            username = arg3.username;
            done = arg4;
        } else {
            username = arg1;
            done = arg3;
        }

        if (arg1 !== null) {
            r
                .table('users')
                .getAll(username.toLowerCase(), { index: 'usernameL' })
                .run(r.conn)
                .then(function (cursor) {
                    return cursor.toArray()
                        .then(function (users) {
                            if (users.length > 0) {
                                var userType = users[0].type;
                                if (userType === "github" && type === userType) {
                                    return done(null, users[0]);
                                } else if (userType === "local" && userType === type) {
                                    var hash = users[0].password;
                                    console.log("Checking password...");
                                    bcrypt.compare(arg2, hash, function(err, isMatch) {
                                        if (err || isMatch === false) {
                                            //Incorrect password/error occured
                                            //TODO Throw error
                                        } else {
                                            var user = users[0];
                                            delete user.password;
                                            return done(null, user);
                                        }
                                    });
                                } else {
                                    // If this gets called, a user tried to sign in with a GitHub account even though a normal account with that username already exists, or the other way around
                                    if (userType === "local") {
                                        return done(null, false, {message: "This account has been registered via email, not via GitHub."});
                                    } else {
                                        return done(null, false, {message: "This account has been registered via GitHub, not via email."});
                                    }
                                }
                            } else if (type === "github") {
                                return r.table('users')
                                    .insert(objectMapper(arg3))
                                    .run(r.conn)
                                    .then(function (response) {
                                        return r.table('users')
                                            .get(response.generated_keys[0])
                                            .run(r.conn);
                                    })
                                    .then(function (newUser) {
                                        done(null, newUser);
                                    });
                            } else {
                                console.log("User not found");
                                done(null, false, {message: 'Account not found.'});
                                // TODO Say account not found
                            }
                        });
                })
                .catch(function (err) {
                    console.log('Error Getting User', err);
                });
        }
    };
};
var callbackURL = 'http://127.0.0.1:3000/auth/login/callback';

// Github
passport.use(new GitHubStrategy({
        clientID: "c5516f218aa8682ac67d",
        clientSecret: "5a3ee482ab2eb4ade56ab6ea01fd7544dd9a9be9",
        callbackURL: callbackURL + '/github'
    },
    loginCallbackHandler(function (profile) {
        return {
            'username': profile.username,
            'usernameL': profile.username.toLowerCase(),
            'name': profile.displayName || undefined,
            'email': 'email',
            'type': 'github'
        };
    }, 'github')
));

// Local
passport.use(new LocalStrategy(
    {},
    loginCallbackHandler(undefined, 'local')
));

passport.checkIfLoggedIn = function (req, res, next) {
    if (req.user) {
        return next();
    }
    return res.status(401).send('You\'re not logged in');
};

module.exports = passport;