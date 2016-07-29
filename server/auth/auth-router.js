var express = require('express');
var authControllers = require('./auth-controller');

var auth = require('./index');
var authRouter = express.Router();

// GitHub
authRouter.use('/login/callback/github', auth.authenticate('github'), function (req, res) {
    res.redirect('/');
});
authRouter.get('/login/github', auth.authenticate('github'));

// Local
/*authRouter.post('/login', auth.authenticate('local', {successRedirect: '/user', failureRedirect: '/login'}), function(req, res) {
    // If this function gets called, authentication was successful.
    // `req.user` contains the authenticated user.
    console.log(res.user.username, 111);
    res.redirect('/user');
});*/
authRouter.get('/login', function(req, res, next) {
    auth.authenticate('local', function(err, user, info) {
        // If this gets called, authentication was successful
        console.log(err, user, info, 333);
        res.redirect("/auth/user");
    })(req, res, next);
});


// All
authRouter.use('/user', authControllers.getUser);
authRouter.use('/logout', authControllers.logout);

module.exports = authRouter;