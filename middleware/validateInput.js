const input = require('../helpers/validateInput.js');

module.exports = (req, res, next) => {
  let { email, password } = req.body;

  if (req.path === '/a/s-inscrire') {
    if (input.invalidEmail(email)) {
      res.render('fr-authentication-sign-up.ejs', { message: input.EMAIL_MESSAGE });
    }
    if (input.missingField([email, password])) {
      res.render('fr-authentication-sign-up.ejs', { message: input.MISSING_FIELD_MESSAGE });
    }
  }

  if (req.path === '/a/se-connecter') {
    if (input.invalidEmail(email)) {
      return res.render('fr-authentication-sign-in.ejs', { message: input.EMAIL_MESSAGE });
    }
    if (missingField([email, password])) {
      return res.render('fr-authentication-sign-in.ejs', { message: input.MISSING_FIELD_MESSAGE });
    }
  }

  next();
};