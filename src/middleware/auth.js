const jwt = require('jsonwebtoken');
const User = require('../models/user');


const auth = async (req, res, next) => {

    try {
        //the 'authorization' header must be set (to given authToken) for this middleware to work
        const authToken = req.header('Authorization').replace('Bearer', '').trim(); //strips the 'Bearer'
        
        //const decoded = jwt.verify(authToken, 'ilovesoftwareengineering'); 
        const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
        //console.log('Decoded.id: ', decoded._id);
        //console.log('authToken: ', authToken);
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': authToken });
        //console.log('Here...2');
        //console.log('User: ', user);
        if(!user) {
            throw new Error();
        }
        req.token = authToken;
        req.user = user;
        
        //console.log('Req.user: ',  req.user);
        next();
    } catch(e) {
        res.status(401).send({ error: 'Please authenticate' });
    }
}

module.exports = auth;