d3.select("body").append("p").text("I work, for sure.");

var canvas = d3.select("body")
              .append("svg")
              .attr("width", 500)
              .attr("height", 500);

var circle = canvas.append("circle")
              .attr("cx", 250)
              .attr("cy", 250)
              .attr("r", 50)
              .attr("fill", "red");
