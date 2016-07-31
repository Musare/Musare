var authController = {};
//Function to get the user info and return it in json
authController.getUser = function (req, res) {
    if (req.user && req.user.id) {
        res.json(req.user);
        return;
    }
    res.status(400).json(null);
};
//Function to logout
authController.logout = function (req, res) {
    req.logout();
    res.redirect('/');
};
//Function to login? Not sure, might be able to remove this or move some router functions to here?
authController.login = function (req, res) {
    res.redirect('/');
};

module.exports = authController;