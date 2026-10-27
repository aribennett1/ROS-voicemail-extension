// Register only while a Gmail download is pending. A permanent no-op filename
// listener can compete with other extensions in Chrome (even suggest() is not
// reliably neutral). Removing a listener releases Chrome's pending determiner.
let pending = [];
let expiryTimer;
function disarm() {
  chrome.downloads.onDeterminingFilename.removeListener(determineFilename);
}
function refresh() {
  clearTimeout(expiryTimer);
  pending = pending.filter(intent => intent.expires > Date.now());
  if (!pending.length) { disarm(); return; }
  if (!chrome.downloads.onDeterminingFilename.hasListener(determineFilename)) {
    chrome.downloads.onDeterminingFilename.addListener(determineFilename);
  }
  expiryTimer = setTimeout(refresh, Math.max(1, Math.min(...pending.map(intent => intent.expires)) - Date.now()));
}
function decline() {
  // Do not call suggest() or implicitly let Chrome call it. Unregistering
  // releases this determiner without submitting an empty filename override.
  disarm();
  refresh();
  return true;
}
function determineFilename(item, suggest) {
  const basename = item.filename.split(/[\\/]/).pop();
  if (item.byExtensionId || !/^voicemail(?: \(\d+\))?\.wav$/i.test(basename)) return decline();
  let source;
  try {
    source = new URL(item.referrer || item.url);
    if (source.protocol !== "https:" || !["mail.google.com", "mail-attachment.googleusercontent.com"].includes(source.hostname)) return decline();
  } catch { return decline(); }
  const account = source.pathname.match(/\/u\/\d+\//)?.[0];
  const matches = pending.filter(intent => intent.expires > Date.now() && (!account || intent.account === account));
  if (matches.length !== 1) return decline();
  const intent = matches[0];
  pending = pending.filter(candidate => candidate !== intent);
  suggest({ filename: `Voicemail - ${intent.phone}.wav`, conflictAction: "uniquify" });
  refresh();
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== "arm-native-voicemail") return;
  try {
    if (sender.id !== chrome.runtime.id || !sender.tab || new URL(sender.url).origin !== "https://mail.google.com" || !/^\d{7,15}$/.test(message.phone)) {
      throw new Error("Open the voicemail in Gmail first.");
    }
    pending.push({ phone: message.phone, account: new URL(sender.url).pathname.match(/\/u\/\d+\//)?.[0], expires: Date.now() + 30000 });
    refresh();
    reply({ ok: true });
  } catch (error) { reply({ ok: false, error: error.message }); }
});
