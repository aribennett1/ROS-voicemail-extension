(() => {
  const replaying = new WeakSet();
  let previewEntry = null;
  const routeKey = () => location.href.split("?")[0];
  function messagePhone(message) {
    const sender = message?.querySelector('.gD[email], .gD[data-hovercard-id], [email="no-reply@storiesinthecloud.com"]');
    const address = sender?.getAttribute("email") || sender?.getAttribute("data-hovercard-id");
    if (address?.toLowerCase() !== "no-reply@storiesinthecloud.com") return null;
    return Voicemail.phone(message.querySelector(".a3s")?.textContent || "");
  }
  function downloadControl(target) {
    for (let node = target; node && node !== document.body; node = node.parentElement) {
      if (node.matches?.('.aSK') || ["aria-label", "data-tooltip", "title"].some(attr => /^download(?:\s|$)/i.test(node.getAttribute?.(attr) || ""))) return node;
    }
    return null;
  }
  // Let Gmail perform its own authenticated download. The worker names the resulting file.
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (replaying.has(target)) return;
    const message = target?.closest(".adn");
    const phone = messagePhone(message);
    let card = target?.closest(".aZo, .aQy");
    // Some Gmail layouts put the download controls beside the attachment link.
    if (!card && message) {
      for (let node = target; node && node !== message; node = node.parentElement) {
        if (/voicemail\.wav/i.test(node.textContent || "")) { card = node; break; }
      }
    }
    const wav = card && /\.wav\b/i.test(card.textContent + " " + card.getAttribute("download_url"));
    if (phone && wav) previewEntry = { phone, route: routeKey() };
    const control = downloadControl(target);
    if (!control) return;
    let selected = phone && wav ? phone : null;
    if (!selected && /[?&]projector=1\b/.test(location.href)) {
      if (previewEntry?.route === routeKey()) selected = previewEntry.phone;
      else {
        const phones = [...new Set([...document.querySelectorAll(".adn")].map(messagePhone).filter(Boolean))];
        if (phones.length === 1 && /voicemail\.wav/i.test(document.body.textContent)) selected = phones[0];
      }
    }
    if (!selected) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // Wait for the worker to register before Gmail starts the download.
    const route = location.href;
    chrome.runtime.sendMessage({ type: "arm-native-voicemail", phone: selected })
      .catch(error => console.warn("Voicemail naming unavailable; reload Gmail.", error))
      .finally(() => {
        if (!control.isConnected || location.href !== route) return;
        replaying.add(control);
        try { control.click(); } finally { replaying.delete(control); }
      });
  }, true);
})();
