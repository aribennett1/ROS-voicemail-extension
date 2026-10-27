const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../Chrome-TA-Plugin');
test('installed TorahAnytime worker passes filename directly without a global listener', {skip:!fs.existsSync(path.join(root,'background.js'))}, async()=>{
  const {lectureId,downloadOptions}=await import(pathToFileURL(path.join(root,'lecture.mjs')));
  const metadata={title:'Test Lecture',date_recorded:'2026-10-21',audio_url:'https://example.com/hash.mp3'};
  let listener, options;
  const chrome={runtime:{id:'ta',onMessage:{addListener(fn){listener=fn;}}},downloads:{
    onDeterminingFilename:{addListener(){assert.fail('TA must not register a global filename listener');}},
    async download(value){options=value;return 1;}
  }};
  const source=fs.readFileSync(path.join(root,'background.js'),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInNewContext(source,{chrome,lectureId,downloadOptions,AbortSignal,fetch:async()=>({ok:true,json:async()=>metadata})});
  const response=await new Promise(resolve=>listener({type:'download-lecture',id:'123'}, {id:'ta',url:'https://torahanytime.com/lectures/123'},resolve));
  assert.equal(response.ok,true);
  assert.equal(options.filename,'Test Lecture - 10-21-26.mp3');
  assert.equal(options.url,metadata.audio_url);
});
