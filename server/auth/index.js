var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var r = require('../db');

passport.serializeUser(function (user, done) {
    console.log(user, 555);
    return done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    console.log(id, 444);
    r
        .table('users')
        .get(id)
        .run(r.conn)
        .then(function (user) {
            done(null, user);
        });
});

var loginCallbackHandler = function (objectMapper, type) {
    return function (accessToken, refreshToken, profile, done) {
        if (accessToken !== null) {
            r
                .table('users')
                .getAll(profile.username, { index: 'login' })
                .filter({ type: type })
                .run(r.conn)
                .then(function (cursor) {
                    return cursor.toArray()
                        .then(function (users) {
                            if (users.length > 0) {
                                return done(null, users[0]);
                            }
                            return r.table('users')
                                .insert(objectMapper(profile))
                                .run(r.conn)
                                .then(function (response) {
                                    return r.table('users')
                                        .get(response.generated_keys[0])
                                        .run(r.conn);
                                })
                                .then(function (newUser) {
                                    done(null, newUser);
                                });
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
            'login': profile.username,
            'name': profile.displayName || null,
            'url': profile.profileUrl,
            'avatarUrl': profile._json.avatar_url,
            'type': 'github'
        };
    }, 'github')
));

// Local
passport.use(new LocalStrategy(
    function(username, password, done) {
        /*User.findOne({ username: username }, function (err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!user.validPassword(password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });*/
        //TODO Check password
        // This is checking if passord is valid and all
        console.log(username, password);
        return done(null, {id: "potatoe", login: "Kris", name: "Kristian", url: "no", avatarUrl: "no", type: "local"});
    }
));

passport.checkIfLoggedIn = function (req, res, next) {
    console.log(req.user, 666);
    if (req.user) {
        return next();
    }
    return res.status(401).send('You\'re not logged in');
};

module.exports = passport;