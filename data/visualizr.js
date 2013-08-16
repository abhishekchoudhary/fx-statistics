const margin = {top: 20, right: 10, bottom: 20, left: 10},                                        // Defining margins for the display area
      width = 1000 - margin.left - margin.right,                                                  // Width of the SVG element to be drawn
      height = 500 - margin.top - margin.bottom;                                                  // Height of the SVG element to be drawn

var canvas = d3.select("#wrapper")                                                                // Create SVG on 'wrapper' div
  .append("svg:svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

self.postMessage(1);                                                                              // Tell the main script that the module is ready

var version,
    tabData,
    memData;

let liveUpdate = true,
    autoStop = false,
    debugging = true,
    buttonVal = 1,
    buttonValSet = [{text:"Start Live Updates", title:"Should I start pulling the latest data?"},
                    {text:"Stop Live Updates",  title:"Should I stop pulling the latest data?"}];

function log(message) {
  if(debugging)
    console.log(message);
}

function collect(transmission) {
  version = transmission.version,                                                                 // Collect browser version from transmission
  memData = transmission.memdata,                                                                 // Collect single-reporter data from transmission
  tabData = transmission.tabdata;                                                                 // Collect multi-reporter data from transmission
}

function flipButton() {
  liveUpdate = !liveUpdate;
  buttonVal = (buttonVal + 1) % 2;
}

function updateButton() {
  d3.select("button")
    .text(buttonState().text)
    .attr("title", buttonState().title);
}

function buttonState(change) {
  return buttonValSet[buttonVal];
}

function initializePage() {
  d3.select("#interact")
    .html("<input type=\"range\" min=\"-5\" max=\"0\" step=\"1\" value=\"0\" title=\"Control the dataset being used,&#10;rightmost being the latest\">");
  
  d3.select("#interact")
    .append("button")
    .text(buttonState().text)
    .attr("title", buttonState().title)
    .on("click", function() {
      flipButton();
      updateButton();
  });

  d3.select("#interact")
    .append("p")
    .style("font-size", "30px")
    .style("font-weight","bold")
    .text(version + " Statistics");

  d3.select("#finisher")                                                                          // Link to 'about:memory' as the source of data
    .append("a")
    .attr("href","about:memory")
    .attr("target","_blank")
    .style("font-size","15px")
    .style("font-style","italic")
    .text("Where do you get your data from?");
}

self.port.on('first_block', function(transmission) {                                              // Start when message containing data is received
  console.log("Received first block.");
  collect(transmission);
  initializePage();
  canvas.call(draw);
});

function draw(canvas) {
  var rad = 150,                                                                                  // Outer Radius of the Donut Charts
      innerRad = 50,                                                                              // Inner Radius of the Donut Charts
      color = d3.scale.category20();                                                              // Selecting one of D3's built-in color scales

  var vis1 = canvas.data([memData])                                                               // Create first visuallization, bind memData
    .append("svg:g")
    .attr("transform", "translate(" + width/4 + "," + height/2 + ")");
 
  var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
    .outerRadius(rad)
    .innerRadius(innerRad);

  var outline = d3.svg.arc()
    .outerRadius(rad+3)
    .innerRadius(rad);
 
  var pie = d3.layout.pie()           //this will create arc data for us given a list of values
    .value(function(d) { return d.amount; });
 
  var arcs = vis1.selectAll("g.slice")
    .data(pie)                          //associate the generated pie data
    .enter()                            /*this will create <g> elements for every "extra" data element that should be associated with a selection.
                                      The result is creating a <g> for every object in the data array*/
      .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
      .attr("class", "slice");    //allow us to style things in the slices (like text)

  var div = d3.select("#wrapper").append("div")
    .attr("class","tooltip")
    .style("opacity",1e-6);
  
  var path = arcs.append("svg:path")
    .attr("fill", function(d, i) { return color(i); } )
    .attr("d", arc)                                     //actual SVG path created here
    .each(function(d) { this._current = d; }) 
    .on("mouseover", function(d) { d3.select(this).style("fill", "white"); mouseover(); })
    .on("mousemove", mousemove)
    .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i)); mouseout(); });


  function mouseover() {
    div.transition()
      .duration(500)
      .style("opacity", 1);
  }

  function mousemove() {
    div
      .html("<b>" + this.__data__.data.path + "</b><br/>" + (this.__data__.data.amount/1024).toFixed(3) + " kb")
      .style("width", 30+10*this.__data__.data.path.length + "px")
      .style("left", (d3.event.pageX) + "px")
      .style("top", (d3.event.pageY) + "px");
  }

  function mouseout() {
    div.transition()
      .duration(500)
      .style("opacity", 1e-6);
  }

  function redraw() {
    var value = this.value;
    pie.value(function(d) { return d[value]; }); // change the value function
    path = path.data(pie); // compute the new angles
    path.transition().duration(750).attrTween("d", arcTween);
  }

  function arcTween(a) {
    var i = d3.interpolate(this._current, a);
    this._current = i(0);
    return function(t) {
      return arc(i(t));
    };
  }

  arcs.append("svg:path") 
    .attr("fill", "black")
    .attr("d",outline);

  var vis2 = canvas.data([tabData])
    .append("svg:g")
    .attr("transform","translate(" + 3*width/4 + "," + height/2 + ")");

  var morepie = d3.layout.pie()
    .value(function(d) { return d.amount; });

  var morearcs = vis2.selectAll("g.slice")
    .data(morepie)
    .enter()
      .append("svg:g")
      .attr("class","slice");
  
  morearcs.append("svg:path")
    .attr("fill", function(d, i) { return color(i); })
    .attr("d",arc)
    .on("mouseover", function(d) { d3.select(this).style("fill", "white"); mouseover(); })
    .on("mousemove", mousemove)
    .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i)); mouseout(); });

  morearcs.append("svg:path")
    .attr("fill","black")
    .attr("d",outline);
}

  /*morearcs.append("svg:text")
    .attr("transform", function(d) {
      d.innerRadius = innerRad;
      d.outerRadius = rad;
      return "translate(" + arc.centroid(d) + ")";
    })
    .attr("text-anchor","middle")
    .text(function(block, i) {return tabData[i].path});*/


self.port.on('sheep_block', function(transmission) {
  collect(transmission);
  canvas.call(draw);
});
