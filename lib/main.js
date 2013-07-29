const {Cc, Ci, Cu} = require("chrome"),
      {data} = require("sdk/self"),
      tabs = require("tabs");

const aboutStatsUrl = "about:stats",
      statsFullName = "Firefox Statistics",
      statsTagLine = "Get To Know Your Browser";

console.log("Locked, loaded, ready to fire!");

let gMgr = Cc["@mozilla.org/memory-reporter-manager;1"].getService(Ci.nsIMemoryReporterManager),
    dataArray = [],
    tabArray = [],
    transmission = {};

let toolbarButton = require('toolbarbutton').ToolbarButton({
  id: "stats-toolbar-button",
  label: "How we doin'?",
  tooltiptext: statsFullName,
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

function processMemoryReporters() {
  dataArray = [];
  let e = gMgr.enumerateReporters();
  while (e.hasMoreElements()) {
    let rOrig = e.getNext().QueryInterface(Ci.nsIMemoryReporter);
    //if (rOrig.path.contains("explicit/") && rOrig.amount < 5000)
      dataArray.push(JSON.parse(JSON.stringify(rOrig)));
  }

  transmission["memdata"] = dataArray;

  let f = gMgr.enumerateMultiReporters();
  while(f.hasMoreElements()) {
    var mr = f.getNext().QueryInterface(Ci.nsIMemoryMultiReporter);
    
    if (mr.name != "window-objects") {
      continue;
    }

    mr.collectReports(oneReport, null);
  }

  for(var t in tabCollector) {
    tabArray.push({"name":t, "amount":tabCollector[t]});
  }
  transmission["tabdata"] = tabArray;

  //console.log(JSON.stringify(tabArray));
  //console.log(JSON.stringify(tabCollector));
  console.log(JSON.stringify(transmission));
}

var tabCollector = {};

function oneReport(aProcess, aUnsafePath, aKind, aUnits, aAmount, aDescription) {
    // This function will be called once for each entry from the
    // multi-reporters. aUnsafePath has the full name, and
    // if aUnits == 0 it means the amount is in bytes. (this is the only
    // one that is relevant for us)
    
  if (aUnits != 0) {
    return;
  }

  var regExp = aUnsafePath.match(/top\(([^)]+)/);

  if (regExp) {
    var tabUrl = regExp[1];
    if (tabCollector[tabUrl]) {
      tabCollector[tabUrl] += aAmount;
    } 
    else {
      tabCollector[tabUrl] = aAmount;
    }
  }
}

function onStatsPageOpened(tab) {
  console.log("Stats Page Opened");

  let styleCss = data.url("stats.css");
  tab.attach({
    contentScriptFile: data.url("stats.js"),
    contentScript: "populate('" + escape(styleCss) + "','" + escape(statsFullName) + "','" + escape(statsTagLine) + "');",
  });
  var worker = tab.attach({
    contentScriptFile: [data.url("d3.v3.js"), data.url("visualizr.js")],
  });

  processMemoryReporters();
  worker.postMessage(transmission);
}

function loadStatsPage() {
  tabs.open({
    url: aboutStatsUrl,
    onReady: function onReady(tab) {onStatsPageOpened(tab);}
  });
}

function statsOnDemand(tab) {
  console.log("One serving of stats coming right up.");

  if (tab.url.toLowerCase() == aboutStatsUrl) {
    onStatsPageOpened(tab);
  }
}

//tabs.on('ready',statsOnDemand);

try {
  require('about').add({what: 'stats', url: data.url("stats.html")});
  loadStatsPage();
  toolbarButton.moveTo({
    toolbarID: "nav-bar",
    forceMove: true
  });
  console.log("All good!");
}
catch(err) {
  console.log(err);
}
