const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const Task = require('./task');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error('Email is invalid');
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minLength: [6, 'Too few characters'],
        validate(value) {
            if(value.toLowerCase().includes('password')) {
                throw new Error('Password should not include the word *Password*');
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if(value < 0) {
                throw new Error('Age must be a positive number');
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: { //holds the profile in binary format
        type: Buffer
    }
}, {
    timestamps: true
});

//Setup relationship between collections Task and User. A virtual field 'tasks' is setup
//This is not stored in the database, this setup is for mongoose to setup association between
//the two collections at runtime. Simple query can be issued to query for tasks associated 
//with a table;
//With this virtual association, 'tasks' can be treated as a property on 'userSchema' 
userSchema.virtual('tasks', {
    ref: 'Task', //referenced schema
    localField: '_id', //field in 'User' referenced  in 'Task'.This field auto-added by mongoose
    foreignField: 'owner' //field in "Task" collection that links "User" collection to "Task" collection
});

//Use 'methods' property available on each instances (of model) to create
//a custom function useful for every user
userSchema.methods.generateAuthToken = async function() {
    const user = this;
    const token = jwt.sign({ _id: user._id.toString() }, process.env.JWT_SECRET);
    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
};

//Customizes the object sent to user so property including "password" and "token"
//are not.
//userSchema.methods.getPublicProfile = function() { //To use this, uncomment the corresponding line in 'routes.js' on endpoint 'users/login/
//OR     
userSchema.methods.toJSON = function() {
    const user = this;
    const userObject = user.toObject(); 

    //password, tokens and avatar will not be among the property sent along with the jsonfied 'userObject' sent to the client (e.g., browser, Postman)
    //whenever the 'res.send(user)' is called - i.e., when response is sent for ;
    delete userObject.password;  //deletes password property on the userObject
    delete userObject.tokens;    //deletes token property on the userObject
    delete userObject.avatar;    //deletes token property on the userObject

    return userObject;
}

//Use 'statics' property available on model level to create a 
//custom function useful for the entire schema
userSchema.statics.findByCredentials = async(email, password) => {
    const user = await User.findOne({email});

    if(!user) {
        throw new Error('Unable to login');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    
    if(!isMatch) {
        throw new Error('Unable to login');
    }

    return user;
}

//Hash the plain text password before saving 
userSchema.pre('save', async function(next) {
    const user = this; //'this' refers to the current document (equivalent to row in tables)

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }
    console.log('Just before saving...');
    next();
});

//Delete user tasks when user is removed
userSchema.pre('remove', async function(next) {
    const user = this;
    await Task.deleteMany({ owner: user._id });    
    next();
});



//SETUP SCHEMA/MODEL FOR USER
const User = mongoose.model('User', userSchema);

module.exports = User;