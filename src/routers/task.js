const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');

const router = new express.Router();

//ROUTES FOR TASK RESOURCES
router.post('/tasks', auth, async (req, res) => {
    //const task = new Task(req.body);
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });

    //OPTION 1: Uses ASYNC-AWAIT WITH PROMISE
    try{
        await task.save();
        res.status(201).send(task);
    } catch(err) {
        res.status(500).send(err);
    }
    
    //OPTION 2: USES ONLY PROMISE
    // task.save().then((task) => {
    //     res.status(201).send(task);
    // }).catch((error) => {
    //     res.status(400).send(error);
    // });
});

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id;

    //OPTION 1: USES ASYNC-AWAIT PROMISE
    // try{
    //     const task = await Task.findById(_id);
    //     res.status(200).send(task);
    // } catch(err) {
    //     res.status(404).send(err);
    // }
    
    //OPTION 2:
    try {
        //returns only tasks belonging to a given owner
        const task = await Task.findOne({ _id, owner: req.user._id }) ;  
        console.log('TASK: ', task);

        if(!task) {
            return res.status(404).send();
        }
        res.status(200).send(task);

    } catch(err) {
        res.status(500).send(err);
    }
});

//GET /tasks?completed=true or /tasks?limit=2 
//or  /tasks?skip=2 
//or /tasks?limit=1&skip=2
//or /tasks?sortBy=createdAt:desc ---- REF4
router.get('/tasks', auth, async (req, res) => {

    const sort = {};

    if(req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        //note => using REF4 above, sort[parts[0]] resolves to "sort.createdAt" (i.e. 'createdAt' is a property on object 'sort');
        //note => using REF4 above, parts[1] resolves to 'desc'
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1  //this equivalent to sort = {createdAt: 'desc'}
    }

    //below, populate() fetches 'tasks' and make them available as one of the property on the User object
    await req.user.populate({
        path: 'tasks', 
        options: { 
            limit: parseInt(req.query.limit), 
            skip: parseInt(req.query.skip),
            sort //i.e. sort: sort // i.e. sort: {createdAt: 'desc'}
        }
    });

    const tasks = req.user.tasks;
    const targetedTask = req.query.completed;

    if(!targetedTask) {
        try {
           return res.send(tasks);
        } catch(err) {
            res.status(500).send(err);
        }        
    }

    try{
        const completedStatus = targetedTask === 'true';
        const filteredTasks = tasks.filter((task) => {
            return task.completed === completedStatus;
        });
        res.send(filteredTasks);
    } catch(err) {
        res.status(500).send(err);
    }
});

router.patch('/tasks/:id', auth, async (req, res) => {
    const updateKeys = Object.keys(req.body);
    const taskId = req.params.id;
    //console.log('updatekeys', updateKeys);
    const allowedUpdates = ['description', 'completed']; //keys whose values can be updated
    const isValidKey = updateKeys.every((updateKeys) => {
        return allowedUpdates.includes(updateKeys);
    });
    
    if(!isValidKey) {
        return res.status(404).send('Invalid input');
    }

    try{
        //OPTION 1: this option is used in order to ensure the 'pre-save' middleware 
        //set in the 'user-model' is not bypassed
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id });

        if(!task) {
            return res.status(404).send();
        }

        updateKeys.forEach((updateKeys) => task[updateKeys] = req.body[updateKeys]);
        await task.save();

        //OPTION 2: this option byasses the "pre-save" middleware (set in the 'task-model' is not bypassed) hence the need to use option 1 above
        //const user = await User.findByIdAndUpdate(_id, req.body, { new: true, runValidators: true });
        //console.log('req.body', req.body)
        //const task = await Task.findByIdAndUpdate(taskId, req.body, { new: true, runValidators: true });
        //console.log(task);
        res.send(task);
    } catch(err) {
        res.status(500).send(err);
    }
});

router.delete('/tasks/:id', auth, async (req, res) => {

    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id }); 
        //const task = await Task.findByIdAndDelete({ _id: req.params.id, owner: req.user._id }); 
        console.log('Task: ', task);
        console.log('Task Id: ', req.params.id);
        console.log('Owner Id: ', req.user._id);
        if(!task) {
            return res.status(404).send();
        }
        res.status(200).send(task);
        
    } catch(err) {
        res.status(500).send(err)
    }
});

module.exports = router;