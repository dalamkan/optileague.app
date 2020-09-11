const router = require('express').Router();
const database = require('../database/database.js');
const input = require('../helpers/validateInput.js');
const messages = require('../helpers/messages.js');
const bcrypt = require('bcrypt');
const SALT_ROUND = 10;
const config = require('../config.js');
const stripe = require('stripe')(config.FR_STRIPE_SECRET_KEY);

router.get('/', (req, res) => {
  res.locals.FR_STRIPE_PUBLISHABLE_KEY = config.FR_STRIPE_PUBLISHABLE_KEY;
  res.render('frAccountIndex.ejs');
});

router.get('/changer-email', (req, res) => {
  res.render('frAccountChangeEmail.ejs', { message: undefined });
});

router.post('/changer-email', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (email, password)
    let { newemail } = req.body;
    newemail = newemail.toLowerCase();
    
    // 2a. Validate the input
    if (input.invalidEmail(newemail)) {
      return res.render('frAccountChangeEmail.ejs', { message: messages.EMAIL_ERROR.FR });
    }

    // 2b. Validate the input
    const users = await database.getUserById(req.userId);
    const user = users[0];

    if (newemail === user.email) {
      return res.render('frAccountChangeEmail.ejs', { message: messages.SAME_EMAIL_ERROR.FR });
    }

    // 3. Update the email address of the user
    database.updateEmailOfUser(req.userId, newemail);
    res.redirect('/fr/mon-compte');

  } catch (err) {
    next(err);
  }
});

router.get('/changer-mot-de-passe', (req, res) => {
  res.render('frAccountChangePassword.ejs', { message: undefined });
});

router.post('/changer-mot-de-passe', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (name, email, password)
    let { currentpassword, newpassword, newpassword2 } = req.body;
    
    // 2. Validate the input
    if (input.missingField([currentpassword, newpassword, newpassword2])) {
      return res.render('frAuthenticationSignUp.ejs', { message: messages.MISSING_FIELD_ERROR.FR });
    }

    // 3a. Check if the current password is the same as the database password
    const users = await database.getUserById(req.userId);
    const user = users[0];
    const validPassword = await bcrypt.compare(currentpassword, user.password);
    const invalidPassword = !validPassword;
    
    // 3b. Check if the 2 new passwords are the same
    const differentNewPasswords = (newpassword !== newpassword2);

    // 3c. Reload the page with an error message
    if (invalidPassword || differentNewPasswords) {
      return res.render('frAccountChangePassword.ejs', { message: messages.SAME_PASSWORD_ERROR.FR });
    }

    // 4. Check if the new password is different from the current one
    const noNewPassword = (currentpassword === newpassword);

    if (noNewPassword) {
      return res.render('frAccountChangePassword.ejs', { message: messages.SAME_PASSWORD_ERROR.FR });
    }

    // 4. Encrypt the new password
    const salt = await bcrypt.genSalt(SALT_ROUND);
    const bcryptPassword = await bcrypt.hash(newpassword, salt);

    // 5. Update the new password in the database
    database.updatePasswordOfUser(req.userId, bcryptPassword);
    res.redirect('/fr/mon-compte/mot-de-passe-change')

  } catch (err) {
    next(err);
  }

});

router.get('/mot-de-passe-change', (req, res) => {
  res.render('frAccountChangedPassword.ejs');
});

router.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    submit_type: 'pay',
    success_url: config.FR_STRIPE_SUCCESS_URL,
    cancel_url: config.FR_STRIPE_CANCEL_URL,
    payment_method_types: ['card'],
    mode: "payment",
    client_reference_id: req.userId,
    line_items: [
      { price: config.STRIPE_PRICE_EUR_60,
        quantity: 1 }
    ],
  });

  res.json({ id: session.id });
});

router.get('/process', (req, res) => {
  database.add365CreditsForUser(req.userId);
  res.redirect('/fr/mon-compte/succes');
});

router.get('/succes', (req, res) => {
  res.render('frAccountSuccess.ejs');
});

router.get('/abandon', (req, res) => {
  res.render('frAccountAbort.ejs');
});

module.exports = router;
