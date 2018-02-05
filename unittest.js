'use strict';

const uniquire = require('./index.js');

uniquire('./undertest.js', {
  fs: {
    hello: () => console.log("Hello, World!")
  }
});
