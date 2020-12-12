const router = require('express').Router();
const input = require('../helpers/validateInput.js');
const messages = require('../helpers/messages.js');
const database = require('../database/database.js');
const reorder = require('../helpers/reorder.js');

router.get('/', async (req, res, next) => {
  try {
    let order = req.query.ordre || 'date-de-creation';
    let currentPage = Number(req.query.page) || 1;
    let binders;

    switch (order) {
      case 'date-de-creation':
        binders = await database.listBindersByCreationDateAndByPage(req.userId, currentPage);
        break;
      case 'nom':
        binders = await database.listBindersByNameAndByPage(req.userId, currentPage);
        break;
      case 'score':
        binders = await database.listBindersByScoreAndByPage(req.userId, currentPage);
        break;
      case 'revisions':
        binders = await database.listBindersByReviewsAndByPage(req.userId, currentPage);
        break;
      case 'date-de-derniere-revision':
        binders = await database.listBindersByLastReviewDateAndByPage(req.userId, currentPage);
        break;
      default:
        break;
    }

    res.locals.binders = binders;
    res.locals.currentPage = currentPage;
    res.locals.order = order;

    // Number of pages
    const numberOfBinders = await database.getNumberOfBindersOfUser(req.userId);

    let numberOfPages = numberOfBinders % database.MAX_BINDERS_PER_PAGE;
    if (numberOfPages) {
      numberOfPages = Math.floor(numberOfBinders / database.MAX_BINDERS_PER_PAGE) + 1;
    } else {
      numberOfPages = (numberOfBinders / database.MAX_BINDERS_PER_PAGE);
    }

    res.locals.numberOfPages = numberOfPages;

    res.render('frBindersIndex.ejs');

  } catch (err) {
    next(err);
  }
});

router.get('/nouveau', (req, res) => {
  res.render('frBindersCreate.ejs');
});

router.post('/nouveau', async (req, res, next) => {
  try {
    // 1. Destructure the req.body
    let { name } = req.body;

    // 2. Validate the input
    if (input.missingField([name])) {
      return res.render('frBindersCreate.ejs', { message: messages.MISSING_FIELD_ERROR.FR });
    }

    // 3. Create the binder
    await database.createBinder(req.userId, name);

    res.redirect('/fr/classeurs');

  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/supprimer', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    res.locals.binder = binders[0];
    res.render('frBindersDelete.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/supprimer', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    await database.deleteBinderById(binderId);
    res.redirect('/fr/classeurs');
  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/parametres', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    res.locals.binder = binders[0];
    res.render('frBindersUpdate.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/parametres', async (req, res, next) => {
  try {
    const { name, toreview } = req.body;
    const binderId = req.params.binderId;
    await database.updateBinderById(binderId, name, toreview);
    res.redirect('/fr/classeurs');
  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fiches', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;

    let order = req.query.ordre || 'date-de-creation';
    let currentPage = Number(req.query.page) || 1;
    let cards;

    switch (order) {
      case 'date-de-creation':
        cards = await database.listCardsByCreationDateAndByPage(binderId, currentPage);
        break;
    }

    const binders = await database.getBinderById(binderId);
    res.locals.binder = binders[0];
    res.locals.cards = cards;
    res.locals.currentPage = currentPage;
    res.locals.order = order;

    // Number of pages
    const numberOfCards = await database.getNumberOfCardsOfBinder(binderId);

    let numberOfPages = numberOfCards % database.MAX_CARDS_PER_PAGE;
    if (numberOfPages) {
      numberOfPages = Math.floor(numberOfCards / database.MAX_CARDS_PER_PAGE) + 1;
    } else {
      numberOfPages = (numberOfCards / database.MAX_CARDS_PER_PAGE);
    }

    res.locals.numberOfPages = numberOfPages;

    res.render('frCardsIndex.ejs');
  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fiches/nouvelle', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    res.locals.binder = binders[0];
    res.render('frCardsCreate.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/fiches/nouvelle', async (req, res, next) => {
  try {
    const { side1, side2 } = req.body;
    const binderId = req.params.binderId;
    await database.createCard(binderId, side1, side2);
    res.redirect(`/fr/classeurs/${binderId}/fiches`);
  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fiches/nouvelles', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    res.locals.binder = binders[0];
    res.render('frCardsCreate5.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/fiches/nouvelles', async (req, res, next) => {
  try {
    const { q1, q2, q3, q4, q5, a1, a2, a3, a4, a5 } = req.body;
    const questions = [q1, q2, q3, q4, q5];
    const answers = [a1, a2, a3, a4, a5];
    const binderId = req.params.binderId;
    for (let i = 0; i < questions.length; i += 1) {
      if (questions[i] !== '') {
        await database.createCard(binderId, questions[i], answers[i]);
      }
    }
    res.redirect(`/fr/classeurs/${binderId}/fiches`);
  } catch (err) {
    next(err);
  }
});


router.get('/:binderId/fiches/:cardId/supprimer', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    const binder = binders[0];
    res.locals.binder = binder;
    const cardId = req.params.cardId;
    const cards = await database.getCardById(cardId);
    const card = cards[0];
    res.locals.card = card;
    res.render('frCardsDelete.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/fiches/:cardId/supprimer', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const cardId = req.params.cardId;
    await database.deleteCardById(cardId, binderId);
    res.redirect(`/fr/classeurs/${binderId}/fiches`);
  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fiches/:cardId/modifier', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    res.locals.binderId = binderId;
    const cardId = req.params.cardId;
    const cards = await database.getCardById(cardId);
    const card = cards[0];
    res.locals.card = card;
    res.render('frCardsUpdate.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/fiches/:cardId/modifier', async (req, res, next) => {
  try {
    const { side1, side2 } = req.body;
    const binderId = req.params.binderId;
    res.locals.binderId = binderId;
    const cardId = req.params.cardId;
    await database.updateCardById(cardId, side1, side2);
    res.redirect(`/fr/classeurs/${binderId}/fiches`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;