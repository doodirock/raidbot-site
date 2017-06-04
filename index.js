"use strict";

// Express stuff
const express = require('express');
const session = require('express-session');
const _ = require('lodash');
const passport = require('passport');
const Strategy = require('passport-discord').Strategy;
const bodyParser = require('body-parser');
const redis   = require("redis");
const redisStore = require('connect-redis')(session);
const exec = require('child_process').exec;

// set up vars
const app = express();
const redisurl = process.env.REDISCLOUD_URL;
const redispass = process.env.REDISCLOUD_PASS;
const clientId = process.env.DISCORD_CLIENT;
const secret = process.env.DISCORD_SECRET;

// Passport connection for login
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

const scopes = ['identify', 'guilds'];

passport.use(new Strategy({
    clientID: clientId,
    clientSecret: secret,
    callbackURL: 'http://www.raidbot.io/callback',
    scope: scopes
}, function(accessToken, refreshToken, profile, done) {
    process.nextTick(function() {
        return done(null, profile);
    });
}));

// Express config for Website
app.set('port', (process.env.PORT || 5000));

app.use(session({
    secret: 'I like a do da chacha',
		store: new redisStore({ host: redisurl, port: 16523, pass: redispass, ttl: 604800}),
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public', { maxAge: 86400000 /* 1d */ }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.locals.moment = require('moment');

// Index Route
app.get('/', getGuild, function (req, res) {
	var useObj = req.user;
	var myguild = req.guildinfo;
	res.render('pages/index', {});
});

//  Login
app.get('/login', passport.authenticate('discord', { scope: scopes }), function(req, res) {});
app.get('/callback',
    passport.authenticate('discord', { failureRedirect: '/' }), function(req, res) { 
		res.redirect('/profile') 
	} // auth success
);

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

function checkAuth(req, res, next) {
	var user = req.user;
    if (req.isAuthenticated()) return next();
    res.render('pages/login', {});
}

app.listen(app.get('port'), function () {
	console.log('Node app is running on port', app.get('port'));
});