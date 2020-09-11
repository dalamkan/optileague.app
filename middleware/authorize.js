const jsonwebtoken = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const database = require('../database/database.js');

module.exports = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jsonwebtoken.verify(token, JWT_SECRET, async (error, decodedToken) => {
      if (error) {
        console.error(error.message);
        res.locals.user = null;
        res.redirect('/fr/a/se-connecter');
      } else {
        req.userId = decodedToken.id;
        let users = await database.getUserById(decodedToken.id);
        res.locals.user = users[0];
        next();
      }
    });
  } else {
    res.locals.user = null;
    res.redirect('/fr/a/se-connecter');
  }
};
