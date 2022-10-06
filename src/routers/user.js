const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

const auth = require('../middleware/auth');
const User = require('../models/user');
const { sendWelcomeEmail, sendAccountCancellationEmail } = require('../emails/account');

const router = new express.Router();
const upload = multer({
    //dest: 'avatars', only required if saving to disk
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if(!file.originalname.match(/\.(jpe?g|png)$/)) {
            return cb(new Error('Please upload jpg, jpeg or png file'));
        }
        cb(undefined, true);
    }
});

//ROUTES FOR USER RESOURCES

//Endpoint for handling signup - creating new user
router.post('/users', async (req, res) => {
    const user = new User(req.body);

    //OPTION 1 - USES ASYNC-AWAIT
    try {
        await user.save();
        //sendWelcomeEmail(user.email, user.name); //this line will only work when API key is supplied to the account.js file
        const token = user.generateAuthToken();
        //console.log('token', token);
        res.status(201).send({user, token});
    } catch(err) {
        res.status(400).send(err);
    }
    
    //OPTION TWO
    // user.save().then(() => {
    //     res.status(201).send(user);
    // }).catch((error) => {
    //     res.status(201).status(400).send(error);
    // });
});

//Endpont for handling login - supply email and password in a JSON object ot  use this endpoint
router.post('/users/login', async (req, res) => {
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({ user, token });
        //OR
        //res.send({ user: user.getPublicProfile(), token });
    } catch(e) {
        res.status(400).send();
    }
});

//Endpoint for handling logout.
//Ensure 'Authorization' header is set to 'oauthToken' (provided in the returned payload upon logging in)
//in the request for the middleware 'auth' to work;
router.post('/users/logout', auth, async (req, res) => {
    try {
        //
        req.user.tokens = req.user.tokens.filter((token) => {
            console.log("Token.token", token.token);
            console.log("Request.token", req.token);
            return token.token !== req.token;
        });

        await req.user.save();
        res.send({ "Message": "You have now logged out" });

    } catch(err) {
        res.status(500).send(err);
    }
});

//Endpoint for handling bulk logout
//Log out is performed on all session (i.e., all authTokens). Basically, the array
//Ensure 'Authorization' header is set to 'oauthToken' (provided in the returned payload upon logging in)
//in the request for the middleware 'auth' to work; 
router.post('/users/logoutall', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.status(200).send({ message: 'You are now logged out from all sessions' });
    } catch(err) {
        res.status(500).send();
    } 
});

//Supports file upload
router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    //req.user.avatar =  req.file.buffer // buffer stores the binary form of the file

    //'sharp' module used to resize and convert the file into png format
    //afte this cropping process, the output is converted to binary (i.e., 'buffer' datatype)
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
    
    req.user.avatar = buffer;
    await req.user.save();
    res.send();
}, (error, req, res, next) => {
    res.status(400).send({error: error.message});
});

router.delete('/users/me/avatar', auth, async (req, res) => {
    req.user.avatar = undefined;
    req.user.save();
    res.send();
});

router.get('/users/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if(!user || !user.avatar) {
            throw new Error('Error occurred');
        }

        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch(err) {
        res.status(404).send(err);
    }
});


//End-point to a given user profile;
//The login endpoint must have been invoked before invoking this endpoint;
//Ensure 'Authorization' header is set to 'oauthToken' (provided in the returned payload upon logging in)
//in the request for the middleware 'auth' to work;
router.get('/users/me', auth, async (req, res) => {
    console.log('..inside READ PROFILE'); 
    res.send(req.user);
});

// //the log-in endpoint must have been invoked first, so that authToken is generated first
// //The authToken must be inserted in the request (sent to this endpoint) header "Authorization"
// //This setting can be done manually or using the programmable setup facility in POSTMAN tool
// router.get('/users/:id', async (req, res) => {
//     const _id = req.params.id;

//     //OPTION 1: USES ASYNC-AWAIT WITH PROMISE
//     try {
//         const user = await User.findById(_id);
//         if(!user) {
//             return res.status(404).send();
//         }
//         res.send(user);
//     } catch(e) {
//         res.status(500).send();
//     }

//     //OPTION 2: USES BARE 'PROMISE'
//     // User.findById(_id).then((user) => {
//     //     if(!user) {
//     //         return res.status(404).send();
//     //     }
//     //     res.send(user);
//     // }).catch((error) => {
//     //     res.status(500).send();
//     // });
// });*/

router.patch('/users/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    //console.log('updates', updates);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isValidOperation = updates.every((updates) => allowedUpdates.includes(updates)); 
    //console.log('updates', updates);
    //const _id = req.user._id;
    console.log("Control got here...!!!");
    if(!isValidOperation) {
        return res.status(400).send({ err: 'Invalid updates!' });
    }

    try{
        //OPTION 1: this option is used in order to ensure the 'pre-save' middleware 
        //set in the 'user-model' is not bypassed
        //const user = await User.findById(req.user._id);

        updates.forEach((update) => req.user[update] = req.body[update]);
        await req.user.save();

        //OPTION 2: this option byasses the "pre-save" middleware (set in the 'user-model' is not bypassed) hence the need to use option 1 above
        //const user = await User.findByIdAndUpdate(_id, req.body, { new: true, runValidators: true });
        // if(!user) {
        //     return res.status(404).send();
        // }    
        res.send(req.user);
    } catch(err) {
        res.status(400).send(err);
    }
});


// router.patch('/users/:id', async (req, res) => {
//     const updates = Object.keys(req.body);
//     const allowedUpdates = ['name', 'email', 'password', 'age'];
//     const isValidOperation = updates.every((updates) => allowedUpdates.includes(updates)); 

//     const _id = req.params.id;
//     console.log("Control got here...!!!");
//     if(!isValidOperation) {
//         return res.status(400).send( { err: 'Invalid updates!' } );
//     }

//     try{
//         //OPTION 1: this option is used in order to ensure the 'pre-save' middleware 
//         //set in the 'user-model' is not bypassed
//         const user = await User.findById(req.params.id);
//         updates.forEach((update) => task[update] = req.body[update]);
//         await user.save();

//         //OPTION 2: this option byasses the "pre-save" middleware (set in the 'user-model' is not bypassed) hence the need to use option 1 above
//         //const user = await User.findByIdAndUpdate(_id, req.body, { new: true, runValidators: true });
//         if(!user) {
//             return res.status(404).send();
//         }    
//         res.send(user);
//     } catch(err) {
//         res.status(400).send(err);
//     }
// });

//A user can only remove his own profile 
router.delete('/users/me', auth, async (req, res) => {
    
    try {
        await req.user.remove();
        //Uncomment the line below only work when API key is supplied to the dev.env file
        //sendAccountCancellationEmail(req.user.email, req.user.name); 
        res.send(req.user);
    } catch(err) {
        res.status(500).send(err);
    }
});

module.exports = router;
