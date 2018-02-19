var User = require("../model/user");
var async = require("async");

module.exports = function(req, res) {
  User.findOne(
    {
      "local.passwordResetToken": req.params.token,
      "local.passwordResetExpiration": { $gt: Date.now() }
    },
    function(err, user) {
      if (user) {
        return res.render("reset", { resetMessage: req.flash("resetMessage") });
      } else {
        req.flash(
          "forgetMessage",
          "Password reset token is invalid or has expired."
        );
        return res.redirect("/forget");
      }
    }
  );
};
