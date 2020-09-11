const router = require('express').Router();
const authorize = require("../middleware/authorize.js");
const cookieParser = require('cookie-parser');

router.get('/', (req, res) => {
  res.cookie('jwt', '', { maxAge: 1 } );
  res.redirect('/');
});

module.exports = router;
