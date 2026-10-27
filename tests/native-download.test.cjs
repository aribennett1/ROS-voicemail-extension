const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function worker() {
  let messageListener, listener, timer;
  const chrome = {
    runtime:{id:'ros',onMessage:{addListener(fn){messageListener=fn;}}},
    downloads:{onDeterminingFilename:{
      addListener(fn){listener=fn;}, removeListener(fn){if(listener===fn)listener=null;},hasListener(fn){return listener===fn;}
    }}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'),'utf8'), {
    chrome,URL,setTimeout(fn){timer=fn;},clearTimeout(){timer=null;},Date
  });
  return {
    active:()=>!!listener,
    arm(phone='18482221749', url='https://mail.google.com/mail/u/3/', id='ros') {
      let reply; messageListener({type:'arm-native-voicemail',phone},{id,tab:{id:1},url},r=>reply=r); return reply;
    },
    run(item) {const calls=[]; const result=listener?.(item,value=>calls.push(value)); return {calls,result};},
    expire(){const original=Date.now; Date.now=()=>original()+31000; try{timer();}finally{Date.now=original;}}
  };
}
const item = {filename:'voicemail.wav',url:'https://mail-attachment.googleusercontent.com/attachment/file',referrer:'https://mail.google.com/mail/u/3/'};
test('no permanent listener; arm, rename once, then unregister',()=>{
  const w=worker(); assert.equal(w.active(),false);
  assert.equal(w.arm().ok,true); assert.equal(w.active(),true);
  const {calls}=w.run(item);
  assert.equal(calls.length,1);
  assert.equal(calls[0].filename,'Voicemail - 18482221749.wav');
  assert.equal(calls[0].conflictAction,'uniquify');
  assert.equal(w.active(),false);
});
test('TorahAnytime download never receives an empty filename suggestion',()=>{
  const w=worker(); w.arm();
  const result=w.run({...item,byExtensionId:'torah-anytime',filename:'lecture.mp3'});
  assert.equal(result.calls.length,0);
  assert.equal(result.result,true); // Suppress the binding's automatic suggest().
  assert.equal(w.run(item).calls[0].filename,'Voicemail - 18482221749.wav');
});
test('other origins and accounts are declined without suggesting a filename',()=>{
  for(const change of [{filename:'report.pdf'},{referrer:'https://example.com/'},{referrer:'https://mail.google.com/mail/u/0/'}]) {
    const w=worker();w.arm();const result=w.run({...item,...change});
    assert.equal(result.calls.length,0);assert.equal(result.result,true);
  }
});
test('expired intents remove listener and invalid requests cannot arm it',()=>{
  const w=worker();
  assert.equal(w.arm('../bad').ok,false);
  assert.equal(w.arm('18482221749','https://evil.com/').ok,false);
  assert.equal(w.arm('18482221749','https://mail.google.com/','foreign').ok,false);
  assert.equal(w.active(),false);
  w.arm();w.expire();assert.equal(w.active(),false);
});
test('ambiguous simultaneous voicemail intents are not guessed',()=>{
  const w=worker();w.arm();w.arm('12125551234');
  assert.equal(w.run(item).calls.length,0);
});
