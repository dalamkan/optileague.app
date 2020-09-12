// const { client } = require('../app.js');
const marked = require('marked');
const { JSDOM } = require('jsdom');
const createDomPurify = require('dompurify');
const dompurify = createDomPurify(new JSDOM().window);
const { pool } = require('../app.js');
const MAX_BINDERS_PER_PAGE = 25;
const MAX_CARDS_PER_PAGE = 25;

async function process(sql, parametersArray) {
  let result;
  if (parametersArray === 'undefined') {
    result = await pool.query(sql);
  } else {
    result = await pool.query(sql, parametersArray);
  }
  return result;
}

function sanitizeHtml(input) {
  if (input) {
  return dompurify.sanitize(marked(input));
  }
}

// Constants
module.exports.MAX_BINDERS_PER_PAGE = MAX_BINDERS_PER_PAGE;
module.exports.MAX_CARDS_PER_PAGE = MAX_CARDS_PER_PAGE;

// Users
module.exports.getUserByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = $1';
  result = await process(sql, [email]);
  return result.rows;
}

module.exports.getUserById = async (id) => {
  const sql = 'SELECT * FROM users WHERE id = $1';
  result = await process(sql, [id]);
  return result.rows;
}

module.exports.createUser = async (email, password) => {
  const sql = 'INSERT INTO users (email, password, role_in_app, status_in_app, credits) VALUES ($1, $2, $3, $4, $5) RETURNING *';
  result = await process(sql, [email, password, 'customer', 'trial', 22]);
  return result.rows;
}

module.exports.add365CreditsForUser = async (userId) => {
  const sql = 'UPDATE users SET credits = credits + 366, status_in_app = $2 WHERE id = $1';
  process(sql, [userId, 'active']);
}

module.exports.retrieve1CreditForCustomers = () => {
  const sql = 'UPDATE users SET credits = credits - 1 WHERE role_in_app = $1 AND (status_in_app = $2 OR status_in_app = $3)';
  process(sql, ['customer', 'trial', 'active']);
}

module.exports.updateCustomerStatus = () => {
  const sql = 'UPDATE users SET status_in_app = $1 WHERE role_in_app = $2 AND credits = 0';
  process(sql, ['pending', 'customer']);
}

module.exports.updateEmailOfUser = (id, newEmail) => {
  const sql = 'UPDATE users SET email = $2 WHERE id = $1';
  process(sql, [id, newEmail]);
}

module.exports.updatePasswordOfUser = (id, newPassword) => {
  const sql = 'UPDATE users SET password = $2 WHERE id = $1';
  process(sql, [id, newPassword]);
}

// Binders
module.exports.createBinder = async (id, binderName) => {
  const sql2 ='UPDATE users SET binders = binders + 1 WHERE id = $1';
  process(sql2, [id]);
  const sql1 = 'INSERT INTO binders (user_id, binder_name) VALUES ($1, $2)';
  await process(sql1, [id, binderName]);
}

module.exports.listBindersByCreationDateAndByPage = async (userId, page) => {
  const OFFSET = (page - 1) * MAX_BINDERS_PER_PAGE;
  const sql = 'SELECT * FROM binders WHERE user_id = $1 ORDER BY to_review DESC, creation_date DESC LIMIT $2 OFFSET $3';
  result = await process(sql, [userId, MAX_BINDERS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.listBindersByNameAndByPage = async (userId, page) => {
  const OFFSET = (page - 1) * MAX_BINDERS_PER_PAGE;
  const sql = 'SELECT * FROM binders WHERE user_id = $1 ORDER BY to_review DESC, binder_name LIMIT $2 OFFSET $3';
  result = await process(sql, [userId, MAX_BINDERS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.listBindersByScoreAndByPage = async (userId, page) => {
  const OFFSET = (page - 1) * MAX_BINDERS_PER_PAGE;
  const sql =  `SELECT binders.*, 
  CASE
    WHEN 
      binders.reviews = 0 THEN 0
    ELSE
      CAST(
        (
          CAST(binders.positives AS FLOAT)/CAST(binders.reviews AS FLOAT)
        ) * 100 
        AS INT
      )
  END as score
  FROM binders WHERE user_id = $1 ORDER BY to_review DESC, score LIMIT $2 OFFSET $3`;
  result = await process(sql, [userId, MAX_BINDERS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.listBindersByReviewsAndByPage = async (userId, page) => {
  const OFFSET = (page - 1) * MAX_BINDERS_PER_PAGE;
  const sql = 'SELECT * FROM binders WHERE user_id = $1 ORDER BY to_review DESC, binder_reviews LIMIT $2 OFFSET $3';
  result = await process(sql, [userId, MAX_BINDERS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.listBindersByLastReviewDateAndByPage = async (userId, page) => {
  const OFFSET = (page - 1) * MAX_BINDERS_PER_PAGE;
  const sql = 'SELECT * FROM binders WHERE user_id = $1 ORDER BY to_review DESC, last_review_date LIMIT $2 OFFSET $3';
  result = await process(sql, [userId, MAX_BINDERS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.getBinderById = async (id) => {
  const sql = 'SELECT * FROM binders WHERE id = $1';
  result = await process(sql, [id]);
  return result.rows;
}

module.exports.updateBinderById = (id, binderName, toReview) => {
  const sql = 'UPDATE binders SET binder_name = $2, to_review = $3 WHERE id = $1';
  process(sql, [id, binderName, toReview]);
}

module.exports.deleteBinderById = async (id) => {
  const sql1 ='UPDATE users SET binders = binders - 1 WHERE id = (SELECT user_id FROM binders WHERE id = $1)';
  await process(sql1, [id]);
  const sql2 = 'DELETE FROM binders WHERE id = $1';
  process(sql2, [id]);
}

module.exports.getNumberOfBindersOfUser = async (id) => {
  const sql = 'SELECT binders FROM users WHERE id = $1';
  result = await process(sql, [id]);
  return result.rows[0]['binders'];
}

// Cards
module.exports.listCardsByCreationDateAndByPage = async (binderId, page) => {
  const OFFSET = (page - 1) * MAX_CARDS_PER_PAGE;
  const sql = 'SELECT * FROM cards WHERE binder_id = $1 ORDER BY creation_date DESC LIMIT $2 OFFSET $3';
  result = await process(sql, [binderId, MAX_CARDS_PER_PAGE, OFFSET]);
  return result.rows;
}

module.exports.getNumberOfCardsOfBinder = async (binderId) => {
  const sql = 'SELECT cards FROM binders WHERE id = $1';
  result = await process(sql, [binderId]);
  return result.rows[0]['cards'];
}

module.exports.createCard = async (binderId, side1Markdown, side2Markdown) => {
  const side1Html = sanitizeHtml(side1Markdown);
  const side2Html = sanitizeHtml(side2Markdown);
  const sql1 = 'UPDATE binders SET cards = cards + 1 WHERE id = $1'
  process(sql1, [binderId]);
  const sql2 = 'INSERT INTO cards (binder_id, side_1_markdown, side_1_html, side_2_markdown, side_2_html) VALUES ($1, $2, $3, $4, $5)';
  await process(sql2, [binderId, side1Markdown, side1Html, side2Markdown, side2Html]);
}

module.exports.updateCardById = (cardId, side1Markdown, side2Markdown) => {
  const side1Html = sanitizeHtml(side1Markdown);
  const side2Html = sanitizeHtml(side2Markdown);
  const sql = 'UPDATE cards SET side_1_markdown = $2, side_1_html = $3, side_2_markdown = $4, side_2_html = $5 WHERE id = $1';
  process(sql, [cardId, side1Markdown, side1Html, side2Markdown, side2Html]);
}

module.exports.getCardById = async (cardId) => {
  const sql = 'SELECT * FROM cards WHERE id = $1';
  result = await process(sql, [cardId]);
  return result.rows;
}

module.exports.deleteCardById = async (cardId) => {
  const sql1 = `UPDATE binders
  SET cards = cards - 1,
      positives = positives - (SELECT positives FROM cards WHERE id = $1),
      reviews = reviews - (SELECT reviews FROM cards WHERE id = $1)
  WHERE id = (SELECT binder_id FROM cards WHERE id = $1)`
  await process(sql1, [cardId]);
  const sql2 = 'DELETE FROM cards WHERE id = $1';
  await process(sql2, [cardId]);
}

// Practice
module.exports.getCardsByBinderId = async (binderId) => {
  const sql = 'SELECT * FROM cards WHERE binder_id = $1';
  result = await process(sql, [binderId]);
  return result.rows;
}

module.exports.updateSequenceOfCards = (binderId, cardsSequence) => {
  const sql = 'UPDATE binders SET cards_sequence = $2 WHERE id = $1';
  process(sql, [binderId, cardsSequence]);
}

module.exports.getSequenceOfCardsByBinderId = async (binderId) => {
  const sql = 'SELECT cards_sequence FROM binders WHERE id = $1';
  result = await process(sql, [binderId]);
  return result.rows;
}

module.exports.updateCardAndBinderWithPositive = (cardId, BinderId) => {
  const sql1 = 'UPDATE cards SET last_review_date = now(), positives = positives + 1, reviews = reviews + 1 WHERE id = $1';
  process(sql1, [cardId]);
  const sql2 = 'UPDATE binders SET last_review_date = now(), positives = positives + 1, reviews = reviews + 1 WHERE id = $1';
  process(sql2, [BinderId]);
}

module.exports.updateCardAndBinderWithNegative = (cardId, BinderId) => {
  const sql1 = 'UPDATE cards SET last_review_date = now(), reviews = reviews + 1 WHERE id = $1';
  process(sql1, [cardId]);
  const sql2 = 'UPDATE binders SET last_review_date = now(), reviews = reviews + 1 WHERE id = $1';
  process(sql2, [BinderId]);
}

module.exports.listActiveAndNonEmptyBinders = async (userId) => {
  const sql = 'SELECT * FROM binders WHERE user_id = $1 AND to_review = true AND CARDS > 0';
  result = await process(sql, [userId]);
  return result.rows;
}

module.exports.updateBinderReviews = (BinderId) => {
  const sql = 'UPDATE binders SET binder_reviews = binder_reviews + 1 WHERE id = $1';
  process(sql, [BinderId]);
}

// Export
module.exports.process = process;