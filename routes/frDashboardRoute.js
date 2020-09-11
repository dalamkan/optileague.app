const router = require('express').Router();

router.get('/', (req, res, next) => {
  res.render('frDashboard.ejs');
});

module.exports = router;
