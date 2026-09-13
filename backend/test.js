const catalyst = require('zcatalyst-sdk-node');
console.log(Object.keys(catalyst.app().nosql().table('test')));
