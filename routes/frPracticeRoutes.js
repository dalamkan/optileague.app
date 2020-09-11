const router = require('express').Router();
const database = require('../database/database.js');
const reorder = require('../helpers/reorder.js')

router.get('/:binderId', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    const binders = await database.getBinderById(binderId);
    const binder = binders[0];
    res.locals.binder = binder;
    res.render('frPracticeCardStrategy.ejs')
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId', async (req, res, next) => {
  try {
    const binderId = req.params.binderId;
    let { showside, strategy } = req.body;
    // res.locals.binderId = binderId;
    
    // Get all cards from the binder
    const cards = await database.getCardsByBinderId(binderId);

    // Redirect if there is no card
    if (cards.length === 0) {
      return res.redirect('/fr/classeurs');
    }
    
    // Specifiy whatever strategy
    if (strategy === 'whatever') {
      strategy = reorder.randomValue(['random', 'scores']);
    }

    // Reorder the cards according to the chosen strategy
    let sequenceOfCards = [];
    switch (strategy) {
      case 'natural':
        sequenceOfCards = reorder.byDecreasingCreationDates(cards);
        break;
      case 'random':
        sequenceOfCards = reorder.randomly(cards);
        break;
      case 'scores':
        sequenceOfCards = reorder.byDecreasingScore(cards);
        break;
      case 'reviews':
        sequenceOfCards = reorder.byDecreasingReviews(cards);
        break;
      case 'dates':
        sequenceOfCards = reorder.byDecreasingLastReviewDates(cards);
        break;
      default:
        break;
    }

    // Establish the sequence of cardsIds
    let sequenceOfCardsIds = sequenceOfCards.map(card => card.id);

    const nextCardId = sequenceOfCardsIds.pop();
    let sequenceString = sequenceOfCardsIds.join(' ');
    database.updateSequenceOfCards(binderId, sequenceString);
    res.redirect(`/fr/s-entrainer/${binderId}/fiche/${nextCardId}?showside=${showside}`);

  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fiche/:cardId', async (req, res, next) => {
  try {
    const { binderId, cardId } = req.params;
    const showside = req.query.showside;
    const cards = await database.getCardById(cardId);
    const card = cards[0];
    res.locals.card = card;
    res.locals.binderId = req.params.binderId;
    res.locals.showside = showside;

    let sequences = await database.getSequenceOfCardsByBinderId(binderId);
    let sequenceString = sequences[0].cards_sequence;
    if (sequenceString) {
    res.locals.remainingCards = sequenceString.split(' ').length;
    } else {
    res.locals.remainingCards = 0;
    }
    res.render('frPracticeCard.ejs');
  } catch (err) {
    next(err);
  }
});

router.post('/:binderId/fiche/:cardId', async (req, res, next) => {
  try {
    const { binderId, cardId } = req.params;
    const { positives } = req.body;
    const showside = req.query.showside;

    // Update database with training stats
    if (positives === 'one') {
      database.updateCardAndBinderWithPositive(cardId, binderId);
    } else {
      database.updateCardAndBinderWithNegative(cardId, binderId);
    }

    // Determine next card
    let sequences = await database.getSequenceOfCardsByBinderId(binderId);
    let sequenceArray = sequences[0].cards_sequence.split(' ');

    let nextCardId = sequenceArray.pop();
    
    if (nextCardId) {
     
      // Save new sequence in database
      let sequenceString = sequenceArray.join(' ');
      database.updateSequenceOfCards(binderId, sequenceString);

      res.redirect(`/fr/s-entrainer/${binderId}/fiche/${nextCardId}?showside=${showside}`);
    } else {
      await database.updateBinderReviews(binderId);
      res.redirect(`/fr/s-entrainer/${binderId}/fin`);
    }

  } catch (err) {
    next(err);
  }
});

router.get('/:binderId/fin', async (req, res, next) => {
  try {
    const { binderId } = req.params;
    const binders = await database.getBinderById(binderId);
    const binder = binders[0];
    res.locals.binder = binder;
    res.render('frPracticeEnd.ejs');
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try { 
    const activeBinders = await database.listActiveAndNonEmptyBinders(req.userId);
    res.locals.activeBinders = activeBinders;
    res.render('frPracticeBinderStrategy.ejs');
  } catch (err) {
    next(err);
  } 
});

router.post('/', async (req, res, next) => {
  try {
    let { strategy } = req.body;
    
    // Get all cards from the binder
    const activeBinders = await database.listActiveAndNonEmptyBinders(req.userId);

    // Specifiy whatever strategy
    if (strategy === 'whatever') {
      strategy = reorder.randomValue(['random', 'scores', 'reviews', 'dates']);
    }

    // Reorder the binders according to the chosen strategy
    let binders = [];
    switch (strategy) {
      case 'random':
        binders = reorder.randomly(activeBinders);
        break;
      case 'scores':
        binders = reorder.byDecreasingScore(activeBinders);
        break;
      case 'reviews':
        binders = reorder.byDecreasingBinderReviews(activeBinders);
        break;
      case 'dates':
        binders = reorder.byDecreasingLastReviewDates(activeBinders);
        break;
      default:
        break;
    }
    let binderId = binders[binders.length - 1].id;

    res.redirect(`/fr/s-entrainer/${binderId}`);

  } catch (err) {
    next(err);
  }
});

module.exports = router;