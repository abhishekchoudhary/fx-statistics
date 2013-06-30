"use strict";

const {Cc, Ci, Cu} = require("chrome"),
      {data} = require("sdk/self");

const aboutStatsUrl = "about:stats";

const debug = true;
console.log("Locked, loaded, ready to fire!");

try {
  require('about').add({what: 'stats', url: data.url("stats.html")});
  console.log("All good!");
}
catch(err) {
  console.log(err);
}

