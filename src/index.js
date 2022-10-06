const express = require('express');
require('./db/mongoose');

const User = require('./models/user');
const Task = require('./models/task');
const userRouters = require('./routers/user');
const taskRouters = require('./routers/task');

const app = express();

//PORT is auto-picked from 'dev.env' file (excluded from deployment) via this command "env-cmd ./config/dev.env nodemon src/index.js"
//'process.env.PORT' picks the environment from deployment environment when app is deployed
const port = process.env.PORT; 

//Setting up middleware
app.use(express.json());
app.use(userRouters);
app.use(taskRouters);

//Running the server
app.listen(port, () => {
    console.log('CORS-unenabled Server is up and running on port ' + port);
});





