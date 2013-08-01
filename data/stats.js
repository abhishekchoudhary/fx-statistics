/* This contains the function that will prepare the HTML page with some of
 * the cosmetics that we will not look at through the 'lib/main.js' or the 
 * 'data/visualizr.js' module. Currently, it will:
 * 
 * 1. Set the title for the page
 * 2. Apply the CSS to the page
 *
 * Both are supplied as parameters to the 'populate' function, and the
 * expected invokation is through 'lib/main' by attaching the function
 * to the execution scope as a contentScriptFile via Firefox Add-on SDK's
 * 'tab.attach' method.
 * */

function populate(styleCss, statsFullName, statsTagLine) {
  document.title = unescape(statsFullName) + " | " + unescape(statsTagLine);
  document.getElementById("stat-stylesheet").href = unescape(styleCss);
}
