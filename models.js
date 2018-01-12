'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
mongoose.Promise = global.Promise;

const UserSchema = mongoose.Schema({
  username:{
    type: String,
    required: true,
    unique:true
  },
  firstName:{
    type:String,
    required: true,
    default:''
  },
  lastName: {
    type: String,
    required: true,
    default: ''
  },
  password:{
    type: String,
    required: true
  }
});

UserSchema.methods.serialize = function(){
  return{
    username:this.username,
    firstName: this.firstName,
    lastName: this.lastName
  };
};

UserSchema.methods.validatePassword = function(password){
  return bcrypt.compare(password, this.password);
};

UserSchema.statics.hashPassword = function(password){
  console.log(password);
  return bcrypt.hash(password, 10);
};

const blogPostSchema = mongoose.Schema({
  author: {
    firstName: String,
    lastName: String
  },
  title: { type: String, required: true },
  content: { type: String },
  created: { type: Date, default: Date.now }
});


blogPostSchema.virtual('authorName').get(function () {
  return `${this.author.firstName} ${this.author.lastName}`.trim();
});

blogPostSchema.methods.serialize = function () {
  return {
    id: this._id,
    author: this.authorName,
    content: this.content,
    title: this.title,
    created: this.created
  };
};





const BlogPost = mongoose.model('BlogPost', blogPostSchema);
const UserInfo = mongoose.model('UserInfo', UserSchema);

module.exports = { BlogPost, UserInfo };
