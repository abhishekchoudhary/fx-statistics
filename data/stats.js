function populate(styleCss, statsFullName, statsTagLine) {
  //if (!document.getElementById("stats-h1"))
    //return;

  document.title = unescape(statsFullName);
  document.getElementById("stats-h1").textContext = unescape(statsFullName);
  //document.getElementById("stats-h2").textContext = unescape(statsTagLine);
  document.getElementById("stat-stylesheet").href = unescape(styleCss);
}
