const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function startup(data, reason) {
  Components.manager.addBootstrapedManifestLocation(data.installPath);
  AboutStats.register();
}

function shutdown(data, reason) {
  if (reason == APP_SHUTDOWN) {
    return;
  }
  AboutStatistics.unload();
  Components.manager.removeBootstrappedManifestLocation(data.installPath);
}

const AboutStats = {
  classID: Components.ID(),
  aboutPath: "stats",
  
  QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule, Ci.nsISupportsWeakReference]),
  
  getURIFlags: function getURIFlags(aURI) {
    return 0;
  },
  
  newChannel: function newChannel(aURI) {
    let uri = Services.io.newURI("chrome://aboutstats/content/stats.xhtml", null, null);
    let channel = Services.io.newChannelFromURI(uri);
    channel.originalURI = aURI;
    return channel;
  },

  createInstance: function createInstance(outer, iid) {
    if (outer != null) {
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  }
  
  register: function register() {
    let registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
    registrar.registerFactory(this.classID, "AboutStats", "@mozilla.org/network/protocol/about;1?what=" + this.aboutPath, this);
  },
  
  unload: function unload() {
    let registrar = Components.manager.QueryInterface(Ci.nsIComponentsRegistrar);
    registrar.unregisterFactory(this.classID, this);
  },
}
