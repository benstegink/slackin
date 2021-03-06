"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

module.exports = invite;

var request = _interopRequire(require("superagent"));

function invite(_ref, fn) {
  var org = _ref.org;
  var token = _ref.token;
  var email = _ref.email;
  var channel = _ref.channel;

  var data = { email: email, token: token };

  if (channel) {
    data.channels = channel;
    data.ultra_restricted = 1;
    data.set_active = true;
  }

  request.post("https://" + org + ".slack.com/api/users.admin.invite").type("form").send(data).end(function (err, res) {
    if (err) return fn(err);
    if (200 != res.status) {
      fn(new Error("Invalid response " + res.status + "."));
      return;
    }

    // If the account that owns the token is not admin, Slack will oddly
    // return `200 OK`, and provide other information in the body. So we
    // need to check for the correct account scope and call the callback
    // with an error if it's not high enough.
    var _res$body = res.body;
    var ok = _res$body.ok;
    var providedError = _res$body.error;
    var needed = _res$body.needed;

    if (!ok) {
      if (providedError === "missing_scope" && needed === "admin") {
        fn(new Error("Missing admin scope: The token you provided is for an account that is not an admin. You must provide a token from an admin account in order to invite users through the Slack API."));
      } else if (providedError === "already_invited") {
        fn(new Error("You have already been invited to slack. Check for an email from feedback@slack.com."));
      } else if (providedError === "already_in_team") {
        fn(new Error("Already invited. Sign in at https://" + org + ".slack.com."));
      } else {
        fn(new Error(providedError));
      }
      return;
    }

    fn(null);
  });
}

