module.exports = () => {
  const chars = '0123456789ABCDEF';

  function getRandomArbitrary(min, max) { 
    return Math.random() * (max - min) + min;
  }

  let string ='';

  for (let i = 0; i <= 50; i += 1) {
    string += chars.charAt(getRandomArbitrary(0, chars.length - 1));
  }
  return string;
}