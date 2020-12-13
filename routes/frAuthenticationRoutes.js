const router = require('express').Router();
const database = require('../database/database.js');
const bcrypt = require('bcrypt');
const SALT_ROUND = 10;
const generateToken = require('../helpers/generateToken.js')
const input = require('../helpers/validateInput.js');
const messages = require('../helpers/messages.js');
const cookieParser = require('cookie-parser');
const MAX_AGE_IN_MILLSECONDS = 1000 * 60 * 60 * 24 * 3;
const postmark = require("postmark");
const postmarkClient = new postmark.ServerClient("fee83a09-4e2b-4fbb-8f7c-24787aea5212");

router.get('/s-inscrire', (req, res) => {
  res.render('frAuthenticationSignUp.ejs', { message: undefined });
});

router.post('/s-inscrire', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (name, email, password)
    let { email, password } = req.body;
    email = email.toLowerCase();
    
    // 2. Validate the input
    if (input.invalidEmail(email)) {
      return res.render('frAuthenticationSignUp.ejs', { message: messages.EMAIL_ERROR.FR });
    }

    if (input.missingField([email, password])) {
      return res.render('frAuthenticationSignUp.ejs', { message: messages.MISSING_FIELD_ERROR.FR });
    }

    // 3. Check if the user exists (if the user exists, reload the page with an error message)
    const users = await database.getUserByEmail(email);

    if (users.length > 0) {
      return res.render('frAuthenticationSignUp.ejs', { message: messages.EXISTING_EMAIL_ERROR.FR });
    }

    // 4. Bcrypt the user password
    const salt = await bcrypt.genSalt(SALT_ROUND);
    const bcryptPassword = await bcrypt.hash(password, salt);

    // 5. Add the new user to the database
    const newUsers = await database.createUser(email, bcryptPassword);
    const newUser = newUsers[0];
    
    // 6. Generate the JWT
    const token = generateToken(newUser.id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: MAX_AGE_IN_MILLSECONDS });
    res.cookie('SameSite', 'Lax', { httpOnly: true, maxAge: MAX_AGE_IN_MILLSECONDS, security: true});
    res.redirect('/fr/tableau-de-bord');

  } catch (error) {
    next(error);
  }

});

router.get('/se-connecter', (req, res) => {
  res.render('frAuthenticationSignIn.ejs', { message: undefined });
});

router.post('/se-connecter', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (email, password)
    let { email, password } = req.body;
    email = email.toLowerCase();

    // 2. Validate the input
    if (input.invalidEmail(email)) {
      return res.render('frAuthenticationSignIn.ejs', { message: messages.EMAIL_ERROR.FR });
    }

    if (input.missingField([email, password])) {
      return res.render('frAuthenticationSignIn.ejs', { message: messages.MISSING_FIELD_ERROR.FR });
    }

    // 3. Check if the user exists (if the user exists, reload the page with an error message)
    const users = await database.getUserByEmail(email);

    if (users.length === 0) {
      return res.render('frAuthenticationSignIn.ejs', { message: messages.INCORRECT_FIELD.FR });
    }

    // 4. Check if the incoming password is the same as the database password
    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.render('frAuthenticationSignIn.ejs', { message: messages.INCORRECT_FIELD.FR });
    }

    // 5. Generate the JWT
    const token = generateToken(user.id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: MAX_AGE_IN_MILLSECONDS });
    res.cookie('SameSite', 'Lax', { httpOnly: true, maxAge: MAX_AGE_IN_MILLSECONDS, security: true});
    res.redirect('/fr/tableau-de-bord');

  } catch (err) {
    next(err);
  }
});

router.get('/mot-de-passe-oublie', (req, res) => {
  res.render('frAuthenticationForgottenPassword.ejs', { message: undefined });
});

router.post('/mot-de-passe-oublie', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (email)
    let { email } = req.body;
    email = email.toLowerCase();
    
    // 2a. Validate the input
    if (input.invalidEmail(email)) {
      return res.render('frAuthenticationForgottenPassword.ejs', { message: messages.EMAIL_ERROR.FR });
    }

    // 2b. Validate the input
    const users = await database.getUserByEmail(email);
    const user = users[0];

    // If the email exists in the database, send email and redirect
    // Otherwise, reload the page with message error
    if (!user) {
      return res.render('frAuthenticationForgottenPassword.ejs', { message: messages.NON_EXISTING_EMAIL_ERROR.FR });
    } else {
      const userId = user.id;
      postmarkClient.sendEmail({
        "From": "support@optileague.app",
        "To": email,
        "Subject": "Réinitialisez votre mot de passe",
        "HtmlBody": `Bonjour,<br><br>Veuillez cliquer sur le lien suivant : <a href="https://www.optileague.app/fr/a/reinitialiser-mot-de-passe/${userId}" target="_blank">réinitialiser mon mot de passe</a>`,
        "TextBody": "Réinitialisez votre mot de passe",
        "MessageStream": "outbound"
      });
      res.redirect('/fr/a/e-mail-envoye');
    }

  } catch (err) {
    next(err);
  }
});

router.get('/e-mail-envoye', (req, res) => {
  res.render('frAuthentificationEmailSent.ejs');
});

router.get('/reinitialiser-mot-de-passe/:userId', (req, res) => {
  const userId = req.params.userId;
  res.render('frAuthenticationResetPassword.ejs', { message: undefined, userId });
});

router.post('/reinitialiser-mot-de-passe', async (req, res, next) => {
  try {
    // 1. Destructure the req.body (password)
    let { newpassword, newpassword2, userid } = req.body;

    // 2. Validate the input
    if (input.missingField([newpassword, newpassword2])) {
      return res.render('frAuthenticationResetPassword.ejs', { message: messages.MISSING_FIELD_ERROR.FR, userId: userid });
    }

    // 3a. Check if the 2 new passwords are the same
    const differentNewPasswords = (newpassword !== newpassword2);

    // 3b. Reload the page with an error message
    if (differentNewPasswords) {
      return res.render('frAuthenticationResetPassword.ejs', { message: messages.INCORRECT_PASSWORD.FR, userId: userid });
    }

    // 3. Check if the user exists (if the user exists, reload the page with an error message)
    const users = await database.getUserById(userid);

    if (users.length === 0) {
      return res.render('frAuthenticationResetPassword.ejs', { message: messages. NON_EXISTING_USER_ERROR.FR, userId: userid });
    }

    // 4. Bcrypt the user password
    const salt = await bcrypt.genSalt(SALT_ROUND);
    const bcryptPassword = await bcrypt.hash(newpassword, salt);

    // 5. Reset the password of user
    database.updatePasswordOfUser(userid, bcryptPassword);
    
    // 6. Redirect to the connection page
    res.redirect('/fr/a/se-connecter');

  } catch (error) {
    next(error);
  }
});

module.exports = router;
