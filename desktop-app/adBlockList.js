// Compact local ad & tracker blocklist for FlowTrack Study Portals
// Plain CommonJS module loaded synchronously by electron.js at startup.
// Does NOT block youtube.com, googlevideo.com, or accounts.google.com.

const AD_BLOCK_PATTERNS = [
  // Google & DoubleClick Ad Networks
  "*://*.doubleclick.net/*",
  "*://googleads.g.doubleclick.net/*",
  "*://*.googlesyndication.com/*",
  "*://*.googleadservices.com/*",
  "*://static.doubleclick.net/*",
  "*://adservice.google.com/*",
  "*://pagead2.googlesyndication.com/*",
  "*://*.google-analytics.com/*",

  // Third-Party Ad & Retargeting Networks
  "*://*.adnxs.com/*",
  "*://*.adroll.com/*",
  "*://*.criteo.com/*",
  "*://*.taboola.com/*",
  "*://*.outbrain.com/*",
  "*://*.facebook.com/tr/*",
  "*://connect.facebook.net/*",
];

module.exports = {
  AD_BLOCK_PATTERNS,
};
