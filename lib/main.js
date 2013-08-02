const {Cc, Ci, Cu} = require("chrome"),
      {data} = require("sdk/self"),
      tabs = require("tabs"),
      BrandStringBundle = require("app-strings").StringBundle("chrome://branding/locale/brand.properties");

const debug = true,
      aboutStatsUrl = "about:stats",
      statsTagLine = "Get To Know Your Browser",
      brandShortName = BrandStringBundle.get("brandShortName"),
      statsFullName = brandShortName + " Statistics";

function log(someString) {
  if(debug) {
    console.log(someString);
  }
}

let gMgr = Cc["@mozilla.org/memory-reporter-manager;1"].getService(Ci.nsIMemoryReporterManager),  // Create a memory-reporter object
    dataArray = [],                                                                               // Object to hold data from single reporters
    tabArray = [],                                                                                // Object to hold data from multi reporters
    tabCollector = {},
    transmission = {};                                                                            // A hash that will hold all values to be sent

transmission["version"] = brandShortName;

let toolbarButton = require('toolbarbutton').ToolbarButton({                                      // Create a toolbar button - a clickable shortcut
  id: "stats-toolbar-button",
  label: "How we doin'?",
  tooltiptext: statsFullName,
  image: data.url("chart-icon.png"),
  onCommand: function () {  // When invoked
    let aboutStatsAlreadyOpen = false;
    
    // Check to see if aboutStatsUrl is already open in one of the tabs
    
    for each (let tab in tabs) {
      if (tab.url.toLowerCase() == aboutStatsUrl) {
        aboutStatsAlreadyOpen = true;
        tab.activate();
        tab.reload();
      }
    }

    // Open a new instance of aboutStatsUrl if not already open

    if (!aboutStatsAlreadyOpen) {
      //openedViaTBB = true;
      loadStatsPage();
    }
  }
});

function processMemoryReporters() {
  dataArray = [];
  let e = gMgr.enumerateReporters();
  while (e.hasMoreElements()) {
    let rOrig = e.getNext().QueryInterface(Ci.nsIMemoryReporter);
    dataArray.push(JSON.parse(JSON.stringify(rOrig)));
  }

  transmission["memdata"] = dataArray;
  tabArray = [];
  let f = gMgr.enumerateMultiReporters();
  while(f.hasMoreElements()) {
    var mr = f.getNext().QueryInterface(Ci.nsIMemoryMultiReporter);
    
    if (mr.name != "window-objects") {
      continue;
    }

    mr.collectReports(oneReport, null);
  }

  for(var t in tabCollector) {
    let a = fixTab(t);
    if (a)
      tabArray.push({"path":a, "amount":tabCollector[t]});
    else
      tabArray.push({"path":t, "amount":tabCollector[t]});
  }

  transmission["tabdata"] = tabArray; 
}

function fixTab(t){
  var a;
  for each (let tab in tabs) {
    let tabInfo = t.split(/, /);
    log(tabInfo[0]);
    log(tab.url.replace(/\//g, '\\'));
    if(tab.url.replace(/\//g, '\\') == tabInfo[0]) {
      a = tab.title + ", " + tabInfo[1];
      break;
    }
    else
      a = null;
  }
  log("a :" + a);
  return a;
}

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
  log("Stats Page Opened");

  let styleCss = data.url("stats.css");
  tab.attach({
    contentScriptFile: data.url("stats.js"),
    contentScript: "populate('" + escape(styleCss) + "','" + escape(statsFullName) + "','" + escape(statsTagLine) + "');",
  });
  var worker = tab.attach({
    contentScriptFile: [data.url("d3.v3.js"), data.url("visualizr.js")],
  });

  processMemoryReporters();                                                                       // Collect all necessary reports
  worker.postMessage(transmission);                                                               // Reports collected, send to Visializr module
}

function loadStatsPage() {
  tabs.open({
    url: aboutStatsUrl,
    onReady: log("Via loadStatsPage.") // We don't need to actually *do* anything, statsOnDemand will be invoked by the URL
  });
}

function statsOnDemand(tab) {
  if (tab.url.toLowerCase() == aboutStatsUrl) {
    log("Via statsOnDemand");
    onStatsPageOpened(tab);
  }
}

tabs.on('ready',statsOnDemand);

try {
  require('about').add({what: 'stats', url: data.url("stats.html")});
  toolbarButton.moveTo({
    toolbarID: "nav-bar",
    forceMove: true
  });
  log(brandShortName);
  log("All good!");
}
catch(err) {
  log(err);
}
