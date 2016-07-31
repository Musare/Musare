var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var r = require('../db');
var bcrypt = require('bcryptjs');

//This stores the user id in the session as a reference, and is used to call deserializeUser when it needs all info
passport.serializeUser(function (user, done) {
    return done(null, user.id);
});

//This returns the user the user info from the user id
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

//This function gets called when trying to log in, to make the code more efficient and not using repetitive code
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

        //Arg1 is the accessToken when using GitHub, so we are checking if it's not null to make sure everything is fine
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
                                    //This compares the user hash with the password put in
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
                                //TODO Check if this allows you to have duplicate emails/usernames
                                //This gets called to create an account with GitHub if none exist yet
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
//This is the callback url which gets used with the GitHub authentication
//TODO Make this config dependent so it's not hardcoded
var callbackURL = 'http://127.0.0.1:3000/auth/login/callback';

//Github strategy
passport.use(new GitHubStrategy({
        clientID: "c5516f218aa8682ac67d",
        clientSecret: "5a3ee482ab2eb4ade56ab6ea01fd7544dd9a9be9",//TODO Make this secret
        callbackURL: callbackURL + '/github'
    },
    loginCallbackHandler(function (profile) {
        //The object that gets created with the GitHub API response, which will be inserted into the users table
        return {
            'username': profile.username,
            'usernameL': profile.username.toLowerCase(),
            'name': profile.displayName || undefined,
            'email': 'email',
            'type': 'github'
        };
    }, 'github')
));

//Local strategy
passport.use(new LocalStrategy(
    {},
    loginCallbackHandler(undefined, 'local')
));

//Function to check if user is logged in
passport.checkIfLoggedIn = function (req, res, next) {
    if (req.user) {
        return next();
    }
    return res.status(401).send('You\'re not logged in');
};

module.exports = passport;