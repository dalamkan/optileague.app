module.exports.invalidEmail = (email) => {
  if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.toLowerCase())) {
    return false;
  } else {
    return true;
  }
}

module.exports.missingField = (fields) => {
  for (let field of fields) {
    if (!field) {
      return true;
    }
  }
  return false;
}
