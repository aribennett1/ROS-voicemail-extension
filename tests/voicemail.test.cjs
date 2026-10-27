const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('../voicemail.js');
const V = globalThis.Voicemail;
const url = 'https://mail.google.com/mail/u/1/?view=att&th=abc&attid=0.1&disp=inline';
test('sample body extracts caller, not date or time', () => {
  assert.equal(V.phone('Attached is a vocemail that was recorded at 2026-10-20 at 11:10 PM from 18482221749 - LAKEWOOD NJ'), '18482221749');
  assert.equal(V.phone('New voicemail message from 18482221749'), '18482221749');
  assert.equal(V.phone('Recorded at 2026-10-20 at 11:10 PM'), null);
  assert.equal(V.phone('from +1 (848) 222-1749 - LAKEWOOD NJ'), '18482221749');
});
test('Gmail drag metadata and account/attachment parameters are preserved', () => {
  const result = new URL(V.attachmentURL(`audio/x-wav:voicemail.wav:${url}`));
  assert.equal(result.pathname, '/mail/u/1/');
  assert.equal(result.searchParams.get('attid'), '0.1');
  assert.equal(result.searchParams.get('disp'), 'safe');
  assert.equal(V.options(url, '18482221749').filename, 'Voicemail - 18482221749.wav');
  assert.equal(V.options(url, '18482221749').conflictAction, 'uniquify');
});
test('reject unrelated URLs, deceptive hosts, and filename injection', () => {
  for (const value of ['https://evil.com/file.wav', 'https://mail.google.com.evil.com/?view=att', 'javascript:alert(1)', 'http://mail.google.com/?view=att', 'https://mail.google.com/mail/u/0/', 'https://user:pass@mail.google.com/?view=att']) {
    assert.equal(V.attachmentURL(value), null);
  }
  assert.throws(() => V.options(url, '../secret'));
});
