
const { Strategy: LocalStrategy} = require('passport-local');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { JWT_SECRET } = require('../config');

const { UserInfo } = require('../models');


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

module.exports = { localStrategy , jwtStrategy};
