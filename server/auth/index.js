var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var r = require('../db');

passport.serializeUser(function (user, done) {
    return done(null, user.id);
});

passport.deserializeUser(function (id, done) {
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

passport.checkIfLoggedIn = function (req, res, next) {
    if (req.user) {
        return next();
    }
    return res.status(401).send('You\'re not logged in');
};

module.exports = passport;