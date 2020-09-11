// Fisher-Yates shuffle
module.exports.randomly = (array) => {
  let newArray = array.slice();
  for (let i = newArray.length - 1; i > 0; i -= 1) {
    let j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

module.exports.randomValue = (array) => {
  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }
  let randomIndex = getRandomIntInclusive(0, array.length - 1);
  return array[randomIndex];
}

module.exports.byDecreasingScore = (array) => {
  let newArray = array.slice();

  const getScore = (positives, reviews) => {
    let score;
    if (reviews === 0) {
      score = 0;
    } else {
      score = Math.ceil(positives / reviews * 100)
    }
    return score;
  }

  newArray.sort((a, b) => {
    return (getScore(b.positives, b.reviews) - getScore(a.positives, a.reviews));
  });
  return newArray;
}

module.exports.byDecreasingReviews = (array) => {
  let newArray = array.slice();
  newArray.sort((a, b) => {
    return (b.reviews - a.reviews);
  });
  return newArray;
}

module.exports.byDecreasingBinderReviews = (array) => {
  let newArray = array.slice();
  newArray.sort((a, b) => {
    return (b.binder_reviews - a.binder_reviews);
  });
  return newArray;
}

module.exports.byDecreasingCreationDates = (array) => {
  let newArray = array.slice();
  newArray.sort((a, b) => {
    return (b.creation_date - a.creation_date);
  });
  return newArray;
}

module.exports.byDecreasingLastReviewDates = (array) => {
  let newArray = array.slice();
  newArray.sort((a, b) => {
    return (b.creation_date - a.creation_date);
  });
  return newArray;
}