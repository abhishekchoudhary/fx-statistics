/* -*- Mode: js2; tab-width: 8; indent-tabs-mode: nil; js2-basic-offset: 2 -*-*/
/* vim: set ts=8 sts=2 et sw=2 tw=80: */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/* Pre-requisites for the addon
 * Constants and Data Structures */

const margin = {top: 20, right: 10, bottom: 20, left: 10},
      width = 1000 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom,
      outerPie = 200,
      innerPie = 150,
      tweenDuration = 500;

// Circular Buffer for storing incoming tab data

/* Working with the buffer:
 *
 * The underlying storage is in an array, with the size specified at
 * initialization. The 'length' property will show the number of
 * pushes to the buffer, and NOT the current size of the buffer.
 *
 * An instance of length 'x', size 'n' would remember last x-n elements.
 * */
var CircularBuffer = function (n) {
  this._array= new Array(n);
  this.length= 0;
}

CircularBuffer.prototype.get= function(i) {
  if (i<0 || i<this.length-this._array.length)
    return undefined;

  return this._array[i%this._array.length];
};

CircularBuffer.prototype.set= function(i, val) {
  if (i<0 || i<this.length-this._array.length)
    throw CircularBuffer.IndexError;

  while (i>this.length) {
    this._array[this.length%this._array.length]= undefined;
    this.length++;
  }

  this._array[i % this._array.length]= val;
  if (i==this.length)
    this.length++;
};

CircularBuffer.IndexError= {};

/** End of pre-requisites **/

// Tell the main script the module is ready
self.postMessage(1);

var version,
    tabData,
    tabTotal,
    memData,
    memTotal,
    explicitTree;

let liveUpdate = true,
    debugging = true,
    intervalID = undefined,
    updateButton = undefined,
    refreshButton = undefined,
    internalsButton = undefined,
    remeasureInternalsButton = undefined,
    div = undefined,
    inputBuffer = new CircularBuffer(5), // TODO Make this size easily reconfigurable, source from about:config
    updateButtonVal = 1,
    updateButtonValSet = [{text:"Start Live Updates", title:"Should I start pulling the latest data?"},
                          {text:"Stop Live Updates",  title:"Should I stop pulling the latest data?"}],
    internalsButtonVal = 1,
    internalsButtonValSet = [{text: "Remove Browser's Internal Statistics", title: "Should I remove the browser's internal statistics?"},
                             {text: "Show Browser's Internal Statistics", title:"Should I show the browser's internal statistics?"}];

// Defining all handler objects for D3
var pieData = [],
    oldPieData = [],
    otherPieData = [];

var donut = d3.layout.pie().value(function(d) {
  return d.size;
});

var pie = d3.layout.pie().value(function(d) {
  return d.amount;
});

// TODO Include more color scales available here directly
var color = d3.scale.category20b();

var arc = d3.svg.arc()
  .startAngle(function(d){ return d.startAngle; })
  .endAngle(function(d){ return d.endAngle; })
  .innerRadius(outerPie)
  .outerRadius(innerPie);

var vis = d3.select("#wrapper").append("svg:svg")
  .attr("width", width)
  .attr("height", height);

var arcGroup = vis.append("svg:g")
  .attr("class", "arc")
  .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")");

var centerGroup = vis.append("svg:g")
  .attr("class", "centerGroup")
  .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")");

var paths = arcGroup.append("svg:circle")
    .attr("fill", "#EFEFEF")
    .attr("r", outerPie);

var whiteCircle = centerGroup.append("svg:circle")
  .attr("fill", "white")
  .attr("r", innerPie);

var totalLabel = centerGroup.append("svg:text")
  .attr("class", "label")
  .attr("dy", -15)
  .attr("text-anchor", "middle")
  .text("TOTAL");

var totalValue = centerGroup.append("svg:text")
  .attr("class", "total")
  .attr("dy", 7)
  .attr("text-anchor", "middle")
  .text("Waiting...");

var totalUnits = centerGroup.append("svg:text")
  .attr("class", "units")
  .attr("dy", 21)
  .attr("text-anchor", "middle")
  .text("Kilobytes");

// The secondary visual is pulled on request, so they don't need any initial values
var vis2 = undefined,
    svg = undefined,
    otherCenterGroup = undefined,
    otherPaths = undefined,
    otherWhiteCircle = undefined,
    otherTotalLabel = undefined,
    otherTotalValue = undefined,
    otherTotalUnits = undefined;

// Logging function for debugging
function log(message) {
  if(debugging)
    console.log(JSON.stringify(message));
}

/* Function to collect all expected data carried in a particular incoming batch.
 * Any data that exists in the dataset, will be updated locally. */

function collect(transmission) {
  if(!!transmission.version)
    version = transmission.version;

  if(!!transmission.memdata)
    memData = transmission.memdata;

  if(!!transmission.memtotal)
    memTotal = transmission.memtotal;

  if(!!transmission.explicitTree)
    explicitTree = transmission.explicitTree;

  if(!!transmission.tabdata)
    tabData = transmission.tabdata;

  if(!!transmission.tabtotal)
    tabTotal = transmission.tabtotal;
}

/* --------------------------- Button Handlers -------------------------------- */
function flipUpdateButton() {
  liveUpdate = !liveUpdate;
  updateButtonVal = (updateButtonVal + 1) % 2;

  updateButton
    .text(updateButtonState().text)
    .attr("title", updateButtonState().title);
}

function updateButtonState() {
  return updateButtonValSet[updateButtonVal];
}

function flipInternalsButton() {
  internalsButtonVal = (internalsButtonVal + 1) % 2;

  internalsButton
    .text(internalsButtonState().text)
    .attr("title", internalsButtonState().title);
}

function internalsButtonState() {
  return internalsButtonValSet[internalsButtonVal];
}
/* ---------------------------------------------------------------------------- */

// Function to initialize page, load slider and some buttons
function initializePage() {
  d3.select("#interact")
    .append("input")
    .attr("type", "range")
    .attr("min", 0)
    .attr("max", 0)
    .attr("step", 1)
    .attr("value", 0)
    .attr("title", "Control the dataset being used,&#10;leftmost being the latest")
    .on("change", function() {
      if (liveUpdate) {
        flipUpdateButton();
        disableLiveUpdates();
      }
      transmission = inputBuffer.get(inputBuffer.length-this.value-1);
      collect(transmission);
      oldPieData = pieData;
      pieData = donut(tabData);
      draw();
    });
  
  updateButton = d3.select("#interact")
    .append("button")
    .attr("style", "position:absolute;right:85px;top:35px;width:250px;height:50px")
    .text(updateButtonState().text)
    .attr("title", updateButtonState().title)
    .on("click", function() {
      flipUpdateButton();

      if (liveUpdate) {
        self.port.emit('sheep_block_request','1');
        enableLiveUpdates();
      }
      else {
        disableLiveUpdates();
      }
  });

  // Show the browser name in the page heading
  d3.select("#interact")
    .append("p")
    .style("font-size", "30px")
    .style("font-weight","bold")
    .text(version + " Statistics");

  // Tooltip class
  div = d3.select("body").append("div")
    .attr("class","tooltip")
    .style("opacity",1e-6);

  internalsButton = d3.select("#wrapper")
    .append("button")
    .attr("style", "right:85px;width:250px;height:50px")
    .text(internalsButtonState().text)
    .attr("title", internalsButtonState().title)
    .on("click", function () {
      flipInternalsButton();
      if (internalsButtonVal === 0)
        prepareSecondVis();
      else {
        removeSecondVis();
      }
    });

  // Credit links
  d3.select("#finisher")
    .append("a")
    .attr("href","about:memory")
    .attr("target","_blank")
    .style("font-size","15px")
    .style("font-style","italic")
    .text("Where do you get your data from?");

  d3.select("#finisher")
    .append("p")
    .text("Lots of credit to Mike Bostock's amazing ")
      .append("a")
      .attr("href","http://d3js.org")
      .attr("target","_blank")
      .style("font-size","15px")
      .style("font-style","italic")
      .text("D3");

    d3.select("#finisher")
      .append("p")
      .text("Peek at / swear about / contribute to the code ")
        .append("a")
        .attr("href","https://github.com/abhishekchoudhary/fx-statistics")
        .attr("target","_blank")
        .style("font-size","15px")
        .style("font-style","italic")
        .text("here");
}

// Function to load secondary visuals when requested
function prepareSecondVis() {
  vis2 = d3.select("#optional").append("svg:svg")
    .attr("width", width)
    .attr("height", height);
  
  remeasureInternalsButton = d3.select("#optional")
    .append("button")
    .attr("style", "position:absolute;right:385px;width:250px;height:50px")
    .text("Refresh Internals")
    .on("click", function() {
      self.port.emit('internals_block_request','1');
    });

  makeInternalPie();
  makeInternalSunburst();
}

// Fucntion to remove secondary visuals when requested
function removeSecondVis() {
  vis2.remove();
  svg.remove();
  remeasureInternalsButton.remove();
}

function makeInternalPie() {
  otherArcGroup = vis2.append("svg:g")
    .attr("class", "arc")
    .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")");

  otherCenterGroup = vis2.append("svg:g")
    .attr("class", "centerGroup")
    .attr("transform", "translate(" + (width/2) + "," + (height/2) + ")");

  otherPaths = otherArcGroup.append("svg:circle")
    .attr("fill", "#EFEFEF")
    .attr("r", outerPie);

  otherWhiteCircle = otherCenterGroup.append("svg:circle")
    .attr("fill", "white")
    .attr("r", innerPie);
  
  otherTotalLabel = otherCenterGroup.append("svg:text")
    .attr("class", "label")
    .attr("dy", -15)
    .attr("text-anchor", "middle")
    .text("TOTAL");

  otherTotalValue = otherCenterGroup.append("svg:text")
    .attr("class", "total")
    .attr("dy", 7)
    .attr("text-anchor", "middle") // text-align: right
    .text("Waiting...");

  otherTotalValue.text(function(){
    var kb = memTotal/1024;
    return kb.toFixed(2);
  });

  otherTotalUnits = otherCenterGroup.append("svg:text")
    .attr("class", "units")
    .attr("dy", 21)
    .attr("text-anchor", "middle") // text-align: right
    .text("Kilobytes");

  otherPieData = donut(memData);

  otherArcGroup.selectAll("circle").remove();
  otherPaths = otherArcGroup.selectAll("path").data(otherPieData).attr("d", arc);

  otherPaths.enter().append("svg:path")
    .attr("d", arc)
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("fill", function(d, i) { return color(i); })
    .on("mouseover", function(d) { d3.select(this).style("fill", "white"); mouseover(); })
    .on("mousemove", mousemove)
    .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i)); mouseout(); });
}

function makeInternalSunburst() {

var w = 960,
    h = 500,
    r = 290,
    color = d3.scale.category20c();
 
var partition = d3.layout.partition()
    .size([2 * Math.PI, r])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return d.y; })
    .outerRadius(function(d) { return d.y + d.dy; }); 

  svg = d3.select("#optional").append("svg:svg")
    .attr("width", w)
    .attr("height", h)
  .append("svg:g")
    .attr("transform", "translate(" + w / 2 + "," + h / 2 + ")");

root = explicitTree;

var path = svg.data([root]).selectAll("path")
      .data(partition.nodes)
    .enter().append("svg:path")
      .attr("d", arc)
      .style("fill", function(d) { return color((d.children ? d : d.parent).name); })
      .on("mouseover", function(d) { d3.select(this).style("fill", "white"); mouseover(); })
      .on("mousemove", mousemove)
      .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i)); mouseout(); });

  // Over-riding the default mousemove function, because the data is stored in a
  // different structure in the explicitTree
  function mousemove() {
    div
      .html("<b>" + this.__data__.name + "</b><br/>" + (this.__data__.size/1024).toFixed(3) + " kb")
      .style("width", 30+10*this.__data__.name.length + "px")
      .style("left", (d3.event.pageX) + "px")
      .style("top", (d3.event.pageY) + "px");
  }

}

// Custom tween functions for the pie / donut charts
function pieTween(d, i) {
  var s0;
  var e0;
  if(oldPieData[i]){
    s0 = oldPieData[i].startAngle;
    e0 = oldPieData[i].endAngle;
  } else if (!(oldPieData[i]) && oldPieData[i-1]) {
    s0 = oldPieData[i-1].endAngle;
    e0 = oldPieData[i-1].endAngle;
  } else if(!(oldPieData[i-1]) && oldPieData.length > 0){
    s0 = oldPieData[oldPieData.length-1].endAngle;
    e0 = oldPieData[oldPieData.length-1].endAngle;
  } else {
    s0 = 0;
    e0 = 0;
  }
  var i = d3.interpolate({startAngle: s0, endAngle: e0}, {startAngle: d.startAngle, endAngle: d.endAngle});
  return function(t) {
    var b = i(t);
    return arc(b);
  };
}


function removePieTween(d, i) {
  s0 = 2 * Math.PI;
  e0 = 2 * Math.PI;
  var i = d3.interpolate({startAngle: d.startAngle, endAngle: d.endAngle}, {startAngle: s0, endAngle: e0});
  return function(t) {
    var b = i(t);
    return arc(b);
  };
}

function enableLiveUpdates() {
  intervalID = setInterval(function(){ self.port.emit('sheep_block_request','1'); }, 5000);
  
  if(!!refreshButton) {
    refreshButton.remove();
    refreshButton = undefined;
  }
}

function disableLiveUpdates() {
  if (!!intervalID)
    clearInterval(intervalID);
  
  refreshButton = d3.select("#interact")
    .append("button")
    .attr("style", "position:absolute;right:385px;top:35px;width:250px;height:50px")
    .text("Refresh Stats")
    .on("click", function() {
      self.port.emit('sheep_block_request','1');
    });
}

function setSlider() {
  if (inputBuffer.length < inputBuffer._array.length)
    d3.select("input").attr("max", (inputBuffer.length-1));
}

/* ------------------------ Mouse-movement handlers ----------------------- */

function mouseover() {
  div.transition()
    .duration(500)
    .style("opacity", 1);
}

function mousemove() {
  div
    .html("<b>" + this.__data__.data.name + "</b><br/>" + (this.__data__.data.size/1024).toFixed(3) + " kb")
    .style("width", 30+10*this.__data__.data.name.length + "px")
    .style("left", (d3.event.pageX) + "px")
    .style("top", (d3.event.pageY) + "px");
}

function mouseout() {
  div.transition()
    .duration(500)
    .style("opacity", 1e-6);
}
/* ------------------------------------------------------------------------ */

//Handle the first incoming dataset
self.port.on('first_block', function(transmission) {                                              // Start when message containing data is received
  log("Received first block.");
  inputBuffer.set(inputBuffer.length,transmission);
  collect(transmission);
  initializePage();
  pieData = donut(tabData);
  enableLiveUpdates();
});

// Function to manage the primary visual, which is invoke for every 'sheep_block'
function draw() {
  arcGroup.selectAll("circle").remove();

    totalValue.text(function(){
      var kb = tabTotal/1024;
      return kb.toFixed(2);
    });

  paths = arcGroup.selectAll("path").data(pieData);

  // Define the enter and exit functions for the projected data
  // Binding mouseover behaviour
  paths.enter().append("svg:path")
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("fill", function(d, i) { return color(i); })
    .on("mouseover", function(d) { d3.select(this).style("fill", "white"); mouseover(); })
    .on("mousemove", mousemove)
    .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i)); mouseout(); })
    .transition()
      .duration(tweenDuration)
      .attrTween("d", pieTween);

  paths
    .transition()
      .duration(tweenDuration)
      .attrTween("d", pieTween);

  paths.exit()
    .transition()
      .duration(tweenDuration)
      .attrTween("d", removePieTween)
    .remove();  
}

// Handle the incoming 'live' tab data, both automatic and manually invoked
self.port.on('sheep_block', function(transmission) {

  // Push input in the storage buffer, check if slider is to be adjusted
  inputBuffer.set(inputBuffer.length,transmission);
  setSlider();
  collect(transmission);
  oldPieData = pieData;
  pieData = donut(tabData);
  draw();
});

// Handle the incoming data for the secondary visuals
self.port.on('internals_block', function(transmission) {
  collect(transmission);
  removeSecondVis();
  d3.select("#optional").text("");
  prepareSecondVis(); // TODO reloading the secondary visuals can and should be done more elegently
});
