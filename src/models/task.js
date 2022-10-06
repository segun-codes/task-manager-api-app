const mongoose = require('mongoose');
const validator = require('validator');

const taskSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
        trim: true
    },
    completed: {
        type: Boolean, 
        default: false
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
},{
    timestamps: true
});

//Will be use at be used later
taskSchema.pre('save', async function(next) {
    const user = this; //'this' refers to the current document (equivalent to row in tables)
    console.log('Just before updating task...');
    next();
});

//TASK SCHEMA
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;