/* Shared by the content script, service worker, and tests. */
globalThis.Voicemail = (() => {
  function phone(text) {
    const match = String(text).match(/\bfrom\s+(\+?\d[\d ()-]{5,23}\d)(?=\s*(?:-|$|[\r\n]))/i);
    const digits = match?.[1].replace(/\D/g, "");
    return digits && /^\d{7,15}$/.test(digits) ? digits : null;
  }
  function attachmentURL(raw, base = "https://mail.google.com/") {
    try {
      const value = String(raw).replace(/^[^:]+:[^:]*:(https:\/\/)/i, "$1");
      const url = new URL(value, base);
      if (url.protocol !== "https:" || url.username || url.password) return null;
      if (url.hostname === "mail.google.com" && url.searchParams.get("view") === "att") {
        url.searchParams.set("disp", "safe");
        return url.href;
      }
      if (url.hostname === "mail-attachment.googleusercontent.com" && url.pathname.startsWith("/attachment/")) return url.href;
    } catch {}
    return null;
  }
  function options(url, number) {
    const safeURL = attachmentURL(url);
    if (!safeURL || !/^\d{7,15}$/.test(number)) throw new Error("Could not identify this voicemail attachment.");
    return { url: safeURL, filename: `Voicemail - ${number}.wav`, conflictAction: "uniquify" };
  }
  return { phone, attachmentURL, options };
})();
