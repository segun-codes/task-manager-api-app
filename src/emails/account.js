const sgMail = require('@sendgrid/mail');

//Note: getting API Key from sendgrid.com is in progress
//It's a rather tedious process.
//Set '..SENDGRID_API_KEY' in 'dev.env' file upon receiving the API key from sendgrid.com;
//The code below and other related entries in 'router.js' file will not work for this reason;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendWelcomeEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'adoughdough@yahoo.com',
        subject: "Testing..",
        text: `Welcome to the app, ${name}`,
        html: "" //you may send html in lieu of plain text
    })
}

const sendAccountCancellationEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'adoughdough@yahoo.com',
        subject: 'We are sorry you had to cancel your account',
        text: `Goodbye ${name}, is there anything we could have done to maintain you as our client`
    });
 }


module.exports = {
    sendWelcomeEmail,
    sendAccountCancellationEmail
}