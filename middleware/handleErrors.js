const handleErrors = (err, req, res, next) => {
  if (err) {
    console.error(err);
    res.locals.err = err;
    res.status(500).render('frError.ejs');
  } else {
    res.status(404).render('fr404.ejs');
  }
};

module.exports = handleErrors;