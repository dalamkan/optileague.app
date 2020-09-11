const database = require('../database/database.js');

module.exports.credits = () => {
  database.retrieve1CreditForCustomers();
}

module.exports.status = () => {
  database.updateCustomerStatus();
}