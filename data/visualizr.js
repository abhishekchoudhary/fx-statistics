var name = d3.select("#wrapper")
  .append("p")
  .style("font-size", "30px")
  .style("font-weight","bold")
  .text("Firefox Statistics");

self.on("message", function(transmission) {
  var width = 1000,
      height = 500,
      rad = 150;
      innerRad = 50;

  var color = d3.scale.category20();

  var memData = transmission["memdata"],
      tabData = transmission["tabdata"];
 
  /*var canvas = d3.select("#wrapper")
    .append("svg:svg")
    .data([memData])
    .attr("width", width)
    .attr("height", height)
      .append("svg:g")
      .attr("transform", "translate(" + width/4 + "," + height/2 + ")");*/

  var canvas = d3.select("#wrapper")
    .append("svg:svg")
    .attr("width", width)
    .attr("height", height);

  var vis1 = canvas.data([memData])
    .append("svg:g")
    .attr("transform", "translate(" + width/4 + "," + height/2 + ")");
 
  var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
    .outerRadius(rad)
    .innerRadius(innerRad);

  var outline = d3.svg.arc()
    .outerRadius(rad+3)
    .innerRadius(rad);
 
  var pie = d3.layout.pie()           //this will create arc data for us given a list of values
    .value(function(block) { return block.amount; });
 
  var arcs = vis1.selectAll("g.slice")
    .data(pie)                          //associate the generated pie data
    .enter()                            /*this will create <g> elements for every "extra" data element that should be associated with a selection.
                                      The result is creating a <g> for every object in the data array*/
      .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
      .attr("class", "slice");    //allow us to style things in the slices (like text)
 
 
  arcs.append("svg:path")
    .attr("fill", function(d, i) { return color(i); } )
    .attr("d", arc)                                     //actual SVG path created here
    .on("mouseover", function(i) {d3.select(this).style("fill","white")})
    .on("mouseout", function(d, i) {d3.select(this).style("fill", color(i))})
    .append("svg:title")
      .text(function(d,i) {return memData[i].path})

  arcs.append("svg:path") 
    .attr("fill", "black")
    .attr("d",outline);

  arcs.append("svg:text")
    .attr("transform", function(d) {
    
      d.innerRadius = innerRad;
      d.outerRadius = rad;
      return "translate(" + arc.centroid(d) + ")";
  })
  .attr("text-anchor", "middle")
  .text(function(block, i) { return memData[i].path; });

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
    .attr("fill", function(block, i) { return color(i); })
    .attr("d",arc)
    .on("mouseover", function(i) { d3.select(this).style("fill","white") })
    .on("mouseout", function(d,i) {d3.select(this).style("fill", color(i))})
    .append("svg:title")
    .text(function(d, i) {return tabData[i].name});

  morearcs.append("svg:path")
    .attr("fill","black")
    .attr("d",outline);
  morearcs.append("svg:text")
    .attr("transform", function(d) {
      d.innerRadius = innerRad;
      d.outerRadius = rad;
      return "translate(" + arc.centroid(d) + ")";
    })
    .attr("text-anchor","middle")
    .text(function(block, i) {return tabData[i].name});
});

var footer = d3.select("#finisher")
  .append("a")
  .attr("href","about:memory")
  .attr("target","_blank")
  .style("font-size","15px")
  .style("font-style","italic")
  .text("Where do you get your data from?");
