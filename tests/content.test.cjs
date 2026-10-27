const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
require('../voicemail.js');
test('Gmail click waits for registration and is replayed exactly once without looping',async()=>{
  let listener, acknowledge, requests=0, downloads=0;
  class Element {}
  const sender={getAttribute:()=> 'no-reply@storiesinthecloud.com'};
  const message={querySelector: selector=>selector==='.a3s'?{textContent:'from 18482221749 - LAKEWOOD NJ'}:sender};
  const card={textContent:'voicemail.wav',getAttribute:()=>null};
  const control=new Element();
  Object.assign(control,{
    closest:selector=>selector==='.adn'?message:card,
    matches:()=>true,
    isConnected:true,
    click(){const event=eventFor(control);listener(event);if(!event.stopped)downloads++;}
  });
  function eventFor(target){return {target,stopped:false,preventDefault(){},stopImmediatePropagation(){this.stopped=true;}};}
  vm.runInNewContext(fs.readFileSync(require.resolve('../content.js'),'utf8'),{
    Element,Voicemail,location:{href:'https://mail.google.com/mail/u/3/#inbox/test'},
    document:{body:{},addEventListener(name,fn){listener=fn;}},console,
    chrome:{runtime:{sendMessage(){requests++;return new Promise(resolve=>acknowledge=resolve);}}}
  });
  const event=eventFor(control);listener(event);
  assert.equal(event.stopped,true);assert.equal(downloads,0);assert.equal(requests,1);
  acknowledge({ok:true});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(downloads,1);assert.equal(requests,1);
});
