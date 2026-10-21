(() => {
  let nativeIntent = null;
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
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type !== "identify-native-voicemail") return;
    const intent = nativeIntent;
    if (!intent || Date.now() - intent.time > 30000 || intent.route !== routeKey()) return reply(null);
    // Consume once; unrelated downloads cannot inherit the caller indefinitely.
    nativeIntent = null;
    reply({ phone: intent.phone, page: location.href });
  });
  // Let Gmail perform its own authenticated download. The worker names the resulting file.
  document.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : event.target.parentElement;
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
    if (!downloadControl(target)) return;
    let selected = phone && wav ? phone : null;
    if (!selected && /[?&]projector=1\b/.test(location.href)) {
      if (previewEntry?.route === routeKey()) selected = previewEntry.phone;
      else {
        const phones = [...new Set([...document.querySelectorAll(".adn")].map(messagePhone).filter(Boolean))];
        if (phones.length === 1 && /voicemail\.wav/i.test(document.body.textContent)) selected = phones[0];
      }
    }
    nativeIntent = selected ? { phone: selected, route: routeKey(), time: Date.now() } : null;
  }, true);
})();
