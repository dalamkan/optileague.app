const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const MAX_AGE_IN_SECONDS = 60 * 60 * 24 * 3;

module.exports = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: MAX_AGE_IN_SECONDS });
}
