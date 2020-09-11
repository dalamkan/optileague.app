const router = require('express').Router();
const database = require('../database/database.js');
const bcrypt = require('bcrypt');
const SALT_ROUND = 10;
const generateToken = require('../helpers/generateToken.js')
const input = require('../helpers/validateInput.js');
const messages = require('../helpers/messages.js');
const cookieParser = require('cookie-parser');
const MAX_AGE_IN_MILLSECONDS = 1000 * 60 * 60 * 24 * 3;

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

module.exports = router;
