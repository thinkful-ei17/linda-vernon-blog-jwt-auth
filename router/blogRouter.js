require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
mongoose.Promise = global.Promise;

const blogRouter = express.Router();

const { BlogPost, UserInfo } = require('../models');

const { jwtStrategy } = require('../strategies/strategies');

passport.use(jwtStrategy);

const jwtAuth = passport.authenticate('jwt', {session: false});

blogRouter.get('/posts', (req, res) => {
    BlogPost
        .find()
        .then(posts => {
            res.json(posts.map(post => post.serialize()));
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went terribly wrong' });
        });
});

blogRouter.get('/posts/:id', (req, res) => {
    BlogPost
        .findById(req.params.id)
        .then(post => res.json(post.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went horribly awry' });
        });
});

blogRouter.post('/posts', jwtAuth, (req, res) => {
    const requiredFields = ['title', 'content', 'author'];
    for (let i = 0; i < requiredFields.length; i++) {
        const field = requiredFields[i];
        if (!(field in req.body)) {
            const message = `Missing \`${field}\` in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    }

    BlogPost
        .create({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author
        })
        .then(blogPost => res.status(201).json(blogPost.serialize()))
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'Something went wrong' });
        });

});


blogRouter.delete('/posts/:id', jwtAuth, (req, res) => {
    BlogPost
        .findByIdAndRemove(req.params.id)
        .then(() => {
            res.status(204).json({ message: 'success' });
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: 'something went terribly wrong' });
        });
});

blogRouter.put('/posts/:id', jwtAuth, (req, res) => {
    if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
        res.status(400).json({
            error: 'Request path id and request body id values must match'
        });
    }

    const updated = {};
    const updateableFields = ['title', 'content', 'author'];
    updateableFields.forEach(field => {
        if (field in req.body) {
            updated[field] = req.body[field];
        }
    });

    BlogPost
        .findByIdAndUpdate(req.params.id, { $set: updated }, { new: true })
        .then(updatedPost => res.status(201).json(updatedPost.serialize()))
        .catch(err => res.status(500).json({ message: 'Something went wrong' }));
});

blogRouter.post('/users', jwtAuth, function (req, res) {
    const requiredFields = ['username','firstName','lastName','password'];

    const missingField = requiredFields.find(field =>!(field in req.body));

    const nonStringField = requiredFields.find(
        field => field in req.body && typeof req.body[field] !== 'string');

    if (missingField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing field',
            location: missingField
        });
    }
    if (nonStringField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }

    const sizedFields = {
        username: {
            min: 1
        },
        password: {
            min: 8,
            // bcrypt truncates after 72 characters, so let's not give the illusion
            // of security by storing extra (unused) info
            max: 72
        }
    };
    const tooSmallField = Object.keys(sizedFields).find(
        field =>
            'min' in sizedFields[field] &&
            req.body[field].trim().length < sizedFields[field].min
    );
    const tooLargeField = Object.keys(sizedFields).find(
        field =>
            'max' in sizedFields[field] &&
            req.body[field].trim().length > sizedFields[field].max
    );

    if (tooSmallField || tooLargeField) {
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: tooSmallField
                ? `Must be at least ${sizedFields[tooSmallField]
                    .min} characters long`
                : `Must be at most ${sizedFields[tooLargeField]
                    .max} characters long`,
            location: tooSmallField || tooLargeField
        });
    }

    const {firstName, lastName, username, password} = req.body;

    return UserInfo.find({username})
        .count()
        .then(count => {
            if(count > 0) {
                return Promise.reject({
                    code: 422,
                    reason: 'ValidationError',
                    message: 'Username already taken',
                    location: 'username'
                });
            }

            return UserInfo.hashPassword(password);
        })
        .then(digest => {
            return UserInfo.create({
                username,
                password: digest,
                firstName,
                lastName
            });
        })
        .then(user => {  //not using nodemon to watch changes keep eye on log!
            return res.status(201).location(`/users/${user.id}`).json(user.serialize());
        })
        .catch(err => {
            if (err.reason === 'ValidationError') {
                return res.status(err.code).json(err);
            }
            res.status(500).json({code: 500, message: 'Internal server error'});
        });
});

module.exports = { blogRouter };
