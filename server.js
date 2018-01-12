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
const { authRouter } = require('./router/authRouter');
const { localStrategy, jwtStrategy } = require('./strategies/strategies');

const app = express();


app.use(morgan('common'));
app.use(bodyParser.json());
app.use('/api/', blogRouter );
app.use('/auth/', authRouter);



//ading this on app.user
// multiple instance of jwtAuth


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
