'use strict';

require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
mongoose.Promise = global.Promise;

const passport = require('passport');
const { Strategy: LocalStrategy} = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { JWT_SECRET } = require('./config');
const { JWT_EXPIRY } = require('./config');


const { DATABASE_URL, PORT } = require('./config');
const { BlogPost, UserInfo } = require('./models');
const { blogRouter } = require('./router/blogRouter');
const app = express();

app.use(morgan('common'));
app.use(bodyParser.json());
app.use('/api/', blogRouter );

//=====ROUTER=====//
const createAuthToken = function(user) {
    return jwt.sign({user}, JWT_SECRET, {
        subject: user.username,
        expiresIn: JWT_EXPIRY,
        algorithm: 'HS256'
    });
};



// ===== Define and create basicStrategy =====
const localStrategy = new LocalStrategy((username, password, done) => {
    let user;
    UserInfo
        .findOne({ username })
        .then(results => {
            user = results;

            if (!user) {
                return Promise.reject({
                    reason: 'LoginError',
                    message: 'Incorrect username',
                    location: 'username'
                });
            }

            return user.validatePassword(password);
        })
        .then(isValid => {
            if (!isValid) {
                return Promise.reject({
                    reason: 'LoginError',
                    message: 'Incorrect password',
                    location: 'password'
                });
            }
            return done(null, user);
        })
        .catch(err => {
            if (err.reason === 'LoginError') {
                return done(null, false);
            }

            return done(err);

        });
});

const jwtStrategy = new JwtStrategy(
    {
        secretOrKey: JWT_SECRET,
        // Look for the JWT as a Bearer auth header
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('Bearer'),
        // Only allow HS256 tokens - the same as the ones we issue
        algorithms: ['HS256']
    },
    (payload, done) => {
        done(null, payload.user);
    }
);

passport.use(localStrategy);
passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', {session: false});
const localAuth = passport.authenticate('local', { session: false });
app.post('/login', localAuth, (req, res) => {
    console.log(JWT_SECRET);
    const authToken = createAuthToken(req.user.serialize());
    res.json({authToken});
});

app.post('/refresh', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    res.json({authToken});
});

app.use('*', function (req, res) {
    res.status(404).json({ message: 'Not Found' });
});

// closeServer needs access to a server object, but that only
// gets created when `runServer` runs, so we declare `server` here
// and then assign a value to it in run
let server;

// this function connects to our database, then starts the server
function runServer(databaseUrl = DATABASE_URL, port = PORT) {
    return new Promise((resolve, reject) => {
        mongoose.connect(databaseUrl, { useMongoClient: true }, err => {
            if (err) {
                return reject(err);
            }
            server = app.listen(port, () => {
                console.log(`Your app is listening on port ${port}`);
                resolve();
            })
                .on('error', err => {
                    mongoose.disconnect();
                    reject(err);
                });
        });
    });
}

// this function closes the server, and returns a promise. we'll
// use it in our integration tests later.
function closeServer() {
    return mongoose.disconnect().then(() => {
        return new Promise((resolve, reject) => {
            console.log('Closing server');
            server.close(err => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    });
}

// if server.js is called directly (aka, with `node server.js`), this block
// runs. but we also export the runServer command so other code (for instance, test code) can start the server as needed.
if (require.main === module) {
    runServer().catch(err => console.error(err));
}

module.exports = { runServer, app, closeServer, localStrategy, jwtStrategy };
