d3.select("body").append("p").text("I work, for sure.");
/*
var canvas = d3.select("body")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500);

var group = canvas.append("g")
  .attr("transform", "translate(100,100)");

var r = 200;

var dataArray = [];
self.on("message", function(message) {

var arc = d3.svg.arc()
  .innerRadius(r - 25)
  .outerRadius(r);

var arcs = group.selectAll(".arc")
  .data(pie(message))
  .enter()
  .append("g")
  .attr("class", "arc");

arcs.append("path")
  .attr("d", arc);

var pie = d3.layout.pie()
  .value(function(d) { return d.amount; });
});*/
self.on("message", function(message) {
var width = 500,
    height = 500,
    rad = 200;

var color = d3.scale.category20c();     //built-in colors
 
data = [{"label":"one", "value":20}, 
        {"label":"two", "value":50}, 
        {"label":"three", "value":30}];
    
var vis = d3.select("body")
  .append("svg:svg")              //create the SVG element inside the <body>
  .data([message])                   //associate our data with the document
  .attr("width", width)           //set the width and height of our visualization (these will be attributes of the <svg> tag
  .attr("height", height)
    .append("svg:g")                //make a group to hold our pie chart
    .attr("transform", "translate(" + rad + "," + rad + ")")    //move the center of the pie chart from 0, 0 to radius, radius
 
var arc = d3.svg.arc()              //this will create <path> elements for us using arc data
  .outerRadius(rad);
 
var pie = d3.layout.pie()           //this will create arc data for us given a list of values
  .value(function(d) { return d.amount; });    //we must tell it out to access the value of each element in our data array
 
var arcs = vis.selectAll("g.slice")     //this selects all <g> elements with class slice (there aren't any yet)
  .data(pie)                          //associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties) 
  .enter()                            /*this will create <g> elements for every "extra" data element that should be associated with a selection.
                                      The result is creating a <g> for every object in the data array*/
  .append("svg:g")                //create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
  .attr("class", "slice");    //allow us to style things in the slices (like text)
 
 
arcs.append("svg:path")
  .attr("fill", function(d, i) { return color(i); } ) //set the color for each slice to be chosen from the color function defined above
  .attr("d", arc);                                    //this creates the actual SVG path using data (pie) with the arc drawing function
 
arcs.append("svg:text")                                     //add a label to each slice
  .attr("transform", function(d) {                    //set the label's origin to the center of the arc
    //we have to make sure to set these before calling arc.centroid
    
    d.innerRadius = 0;
    d.outerRadius = rad;
    return "translate(" + arc.centroid(d) + ")";        //this gives us a pair of coordinates like [50, 50]
 })
  .attr("text-anchor", "middle")                          //center the text on it's origin
  .text(function(d, i) { return message[i].path; });        //get the label from our original data array
});
