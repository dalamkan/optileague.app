const handleErrors = (err, req, res, next) => {
  console.error(err);
  res.locals.err = err;
  res.status(500).render('frError.ejs');
};

module.exports = handleErrors;