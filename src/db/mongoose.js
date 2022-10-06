const mongoose = require('mongoose');

//mongoose.connect('mongodb://127.0.0.1:27017/task-manager-api');
mongoose.connect(process.env.MONGODB_URL);
console.log('Connection established');







