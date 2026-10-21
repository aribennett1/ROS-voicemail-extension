const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
require('../voicemail.js');
function worker(responses) {
  let listener;
  let queried = 0;
  const chrome = {
    runtime:{onMessage:{addListener(){}}},
    downloads:{onDeterminingFilename:{addListener(fn){listener=fn;}}},
    tabs:{async query(){queried++; return responses.map((r,i)=>({id:i,url:r.page}));},
      async sendMessage(id){return responses[id];}}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'), {chrome,URL,Voicemail,importScripts(){}});
  return {run: item => new Promise(resolve => listener(item,resolve)), queries:()=>queried};
}
const response = {phone:'18482221749',page:'https://mail.google.com/mail/u/3/#inbox/thread'};
const item = {filename:'voicemail.wav',url:'https://mail-attachment.googleusercontent.com/attachment/file',referrer:'https://mail.google.com/mail/u/3/'};
test('native attachment and preview downloads receive requested filename without a DOM URL',async()=>{
  const w=worker([response]);
  const result=await w.run(item);
  assert.equal(result.filename,'Voicemail - 18482221749.wav');
  assert.equal(result.conflictAction,'uniquify');
});
test('other files, origins, and extension downloads remain untouched',async()=>{
  const w=worker([response]);
  for(const change of [{filename:'report.pdf'},{referrer:'https://example.com/'},{byExtensionId:'another-extension'}]) {
    assert.equal(await w.run({...item,...change}),undefined);
  }
  assert.equal(w.queries(),0);
});
test('different Gmail accounts and ambiguous simultaneous clicks are not renamed',async()=>{
  assert.equal(await worker([{...response,page:'https://mail.google.com/mail/u/0/'}]).run(item),undefined);
  assert.equal(await worker([response,response]).run(item),undefined);
  assert.equal(await worker([]).run(item),undefined);
});
test('direct Gmail attachment URL works without referrer',async()=>{
  assert.equal((await worker([response]).run({...item,referrer:'',url:'https://mail.google.com/mail/u/3/?view=att'})).filename,'Voicemail - 18482221749.wav');
});
