importScripts("voicemail.js");
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== "download-voicemail") return;
  (async () => {
    if (sender.id !== chrome.runtime.id || !sender.tab || new URL(sender.url).origin !== "https://mail.google.com") {
      throw new Error("Open the voicemail in Gmail first.");
    }
    const id = await chrome.downloads.download(Voicemail.options(message.url, message.phone));
    reply({ ok: true, id });
  })().catch(error => reply({ ok: false, error: error.message }));
  return true;
});

// Native downloads often have no usable URL in Gmail's DOM (especially in preview).
// Ask Gmail tabs which exact Download control was just clicked instead.
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const basename = item.filename.split(/[\\/]/).pop();
  if (!/^voicemail(?: \(\d+\))?\.wav$/i.test(basename) || item.byExtensionId) {
    suggest();
    return;
  }
  let source;
  try {
    source = new URL(item.referrer || item.url);
    if (source.protocol !== "https:" || !["mail.google.com", "mail-attachment.googleusercontent.com"].includes(source.hostname)) {
      suggest();
      return;
    }
  } catch { suggest(); return; }
  (async () => {
    const tabs = await chrome.tabs.query({ url: "https://mail.google.com/*" });
    const results = await Promise.all(tabs.filter(tab => {
      // Keep signed-in accounts isolated when Google supplies the account path.
      const account = source.pathname.match(/\/u\/\d+\//)?.[0];
      return !account || new URL(tab.url).pathname.includes(account);
    }).map(async tab => {
      try { return await chrome.tabs.sendMessage(tab.id, { type: "identify-native-voicemail" }); }
      catch { return null; }
    }));
    const matches = results.filter(result => result && /^\d{7,15}$/.test(result.phone));
    if (matches.length === 1) suggest({ filename: `Voicemail - ${matches[0].phone}.wav`, conflictAction: "uniquify" });
    else suggest();
  })().catch(() => suggest());
  return true;
});
