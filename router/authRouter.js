require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const jwt = require('jsonwebtoken');
mongoose.Promise = global.Promise;

const { JWT_SECRET } = require('../config');
const { JWT_EXPIRY } = require('../config');

const { BlogPost, UserInfo } = require('../models');

const authRouter = express.Router();

const { localStrategy, jwtStrategy } = require('../strategies/strategies');

passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', {session: false});
const localAuth = passport.authenticate('local', { session: false });

const createAuthToken = function(user) {
    return jwt.sign({user}, JWT_SECRET, {
        subject: user.username,
        expiresIn: JWT_EXPIRY,
        algorithm: 'HS256'
    });
};

authRouter.post('/login', localAuth, (req, res) => {
    console.log(JWT_SECRET);
    const authToken = createAuthToken(req.user.serialize());
    res.json({authToken});
});

authRouter.post('/refresh', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    res.json({authToken});
});
module.exports = { authRouter };
