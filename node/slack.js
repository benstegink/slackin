"use strict";

var _interopRequire = function (obj) { return obj && obj.__esModule ? obj["default"] : obj; };

var _createClass = (function () { function defineProperties(target, props) { for (var key in props) { var prop = props[key]; prop.configurable = true; if (prop.value) prop.writable = true; } Object.defineProperties(target, props); } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var request = _interopRequire(require("superagent"));

var EventEmitter = require("events").EventEmitter;

var SlackData = (function (_EventEmitter) {
  function SlackData(_ref) {
    var token = _ref.token;
    var interval = _ref.interval;
    var host = _ref.org;

    _classCallCheck(this, SlackData);

    this.host = host;
    this.token = token;
    this.interval = interval;
    this.ready = false;
    this.org = {};
    this.users = {};
    this.channelsByName = {};
    this.init();
    this.fetch();
  }

  _inherits(SlackData, _EventEmitter);

  _createClass(SlackData, {
    init: {
      value: function init() {
        var _this = this;

        request.get("https://" + this.host + ".slack.com/api/channels.list").query({ token: this.token }).end(function (err, res) {
          (res.body.channels || []).forEach(function (channel) {
            _this.channelsByName[channel.name] = channel;
          });
        });

        request.get("https://" + this.host + ".slack.com/api/team.info").query({ token: this.token }).end(function (err, res) {
          var team = res.body.team;
          _this.org.name = team.name;
          if (!team.icon.image_default) {
            _this.org.logo = team.icon.image_132;
          }
        });
      }
    },
    fetch: {
      value: function fetch() {
        var _this = this;

        request.get("https://" + this.host + ".slack.com/api/users.list").query({ token: this.token, presence: 1 }).end(function (err, res) {
          _this.onres(err, res);
        });
        this.emit("fetch");
      }
    },
    getChannelId: {
      value: function getChannelId(name) {
        var channel = this.channelsByName[name];
        return channel ? channel.id : null;
      }
    },
    retry: {
      value: function retry() {
        var interval = this.interval * 2;
        setTimeout(this.fetch.bind(this), interval);
        this.emit("retry");
      }
    },
    onres: {
      value: function onres(err, res) {
        if (err) {
          this.emit("error", err);
          return this.retry();
        }

        var users = res.body.members;

        if (!users) {
          var _err = new Error("Invalid Slack response: " + res.status);
          this.emit("error", _err);
          return this.retry();
        }

        // remove slackbot and bots from users
        // slackbot is not a bot, go figure!
        users = users.filter(function (x) {
          return x.id != "USLACKBOT" && !x.is_bot && !x.deleted;
        });

        var total = users.length;
        var active = users.filter(function (user) {
          return "active" == user.presence;
        }).length;

        if (this.users) {
          if (total != this.users.total) {
            this.emit("change", "total", total);
          }
          if (active != this.users.active) {
            this.emit("change", "active", active);
          }
        }

        this.users.total = total;
        this.users.active = active;

        if (!this.ready) {
          this.ready = true;
          this.emit("ready");
        }

        setTimeout(this.fetch.bind(this), this.interval);
        this.emit("data");
      }
    }
  });

  return SlackData;
})(EventEmitter);

module.exports = SlackData;

