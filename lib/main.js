var {data} = require("sdk/self");
try {
  require('about').add({what: 'stats', url: data.url("stats.xhtml")});
  console.log("All good!");
}
catch(err) {
  console.log(err);
}
