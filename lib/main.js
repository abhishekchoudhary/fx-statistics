"use strict";

const {Cc, Ci, Cu} = require("chrome"),
      {data} = require("sdk/self"),
      tabs = require("tabs");

const aboutStatsUrl = "about:stats",
      statsFullName = "fx-statistics",
      statsTagLine = "Get to know your browser.";

const debug = true;
console.log("Locked, loaded, ready to fire!");

let toolbarButton = require('toolbarbutton').ToolbarButton({
  id: "stats-toolbar-button",
  label: "How we doin'?",
  image: data.url("chart-icon.png"),
  onCommand: function () {
    let aboutStatsAlreadyOpen = false;
    for each (let tab in tabs) {
      if (tab.url == aboutStatsUrl) {
        aboutStatsAlreadyOpen = true;
        tab.activate();
        tab.reload();
      }
    }

    if (!aboutStatsAlreadyOpen)
      loadStatsPage();
  }
});

function onStatsPageOpened(tab) {
  console.log("Stats Page Opened");
  
  let styleCss = data.url("stats.css");
  tab.attach({
    contentScriptFile: data.url("stats.js"),
    contentScript: "populate('" + escape(styleCss) + "','" + escape(statsFullName) + "','" + escape(statsTagLine) + "');'",
  });
}

function loadStatsPage() {
  tabs.open({
    url: aboutStatsUrl,
    onReady: function onReady(tab) {onStatsPageOpened(tab);}
  });
}

try {
  require('about').add({what: 'stats', url: data.url("stats.html")});
  loadStatsPage();
  console.log("All good!");
}
catch(err) {
  console.log(err);
}
