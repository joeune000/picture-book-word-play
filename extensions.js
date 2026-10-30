'use strict';
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
const ACTIVITY_NAMES={cloze:'낱말 빈칸',main:'중심문장·중심 내용',factopinion:'사실·의견'};
const MODE_NAMES={choose:'골라 넣기',type:'타이핑',write:'손글씨',paper:'종이 활동'};
const DATE=new Intl.DateTimeFormat('ko-KR',{dateStyle:'short',timeStyle:'short'});
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const Scene=page=>{const key=state.book!=='octopus'&&!String(page).startsWith('page-')?state.book+'-'+page:page;return window.OCTOPUS_SCENES?.[key]||'scenes/'+key+'.webp';};
const cloud={available:false,preview:false,account:'',students:[],student:'',pending:new Map(),busy:false,trials:[],loadedStudent:''};
state.sessionId=uid();
async function api(path,options={}){
 const r=await fetch('/api'+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
 if(!r.headers.get('Content-Type')?.includes('application/json'))throw Error('기록 저장소가 아직 연결되지 않았습니다.');
 const d=await r.json();if(!r.ok)throw Error(d.error||'연결하지 못했습니다.');return d;
}
function syncStatus(text){$('sync-status').textContent=text;$('sync-status').classList.toggle('pending',cloud.pending.size>0);$('sync-retry').hidden=cloud.pending.size===0;}
function refreshStudents(){for(const id of ['student-select','record-student']){const select=$(id),old=select.value;select.replaceChildren();if(id==='student-select')select.append(new Option('연습만 하기 · 기록 안 함',''));else select.append(new Option('학생을 선택해 주세요',''));cloud.students.forEach(s=>select.append(new Option(s.name,s.id)));select.value=cloud.students.some(s=>s.id===old)?old:'';}if(cloud.student)$('student-select').value=cloud.student;}
async function initCloud(){if(window.APP_HOST==='static'){document.querySelector('.student-bar:not(.book-selector)').hidden=true;return;}if(location.protocol==='file:'){syncStatus('파일 버전 · 학생 기록 공유는 웹주소에서');$('student-add-open').disabled=true;return;}
 try{const a=await api('/account');cloud.account=a.account;cloud.preview=a.preview;cloud.students=(await api('/students')).students;cloud.available=true;refreshStudents();syncStatus(cloud.preview?'로컬 미리보기 · 기기 간 공유 안 됨':'비공개 기록 저장소 연결됨');}
 catch{syncStatus('연습·인쇄 가능 · 기록 저장소 연결 안 됨');cloud.available=false;}
}
let flushPromise=null;
function flush(){
 if(flushPromise)return flushPromise;
 if(!cloud.pending.size)return Promise.resolve();
 cloud.busy=true;
 flushPromise=(async()=>{
  try{while(cloud.pending.size){for(const [id,trial] of [...cloud.pending]){await api('/trials',{method:'PUT',body:JSON.stringify(trial)});if(cloud.pending.get(id)?.revision===trial.revision)cloud.pending.delete(id);}}
   syncStatus(cloud.preview?'로컬 미리보기 기록 저장됨 · 기기 간 공유 안 됨':'모든 기록 저장됨 · 다른 기기에서 불러올 수 있어요');
  }catch(e){syncStatus('저장 대기 '+cloud.pending.size+'개 · 이 화면을 닫지 말고 다시 저장해 주세요.');}
  finally{cloud.busy=false;flushPromise=null;if(cloud.pending.size===0)$('sync-retry').hidden=true;}
 })();return flushPromise;
}
function queue(t){if(!t.bookId)t.bookId=state.book;cloud.pending.set(t.id,structuredClone(t));syncStatus('저장 중 · '+cloud.pending.size+'개');void flush();}
function trialFor(q,slot){
 if(!cloud.student)return null;
 if(!slot.trial)slot.trial={id:uid(),studentId:cloud.student,sessionId:state.sessionId,revision:0,word:slot.word,mode:state.mode,category:state.category,page:q.passage.page,startedAt:new Date().toISOString(),completed:false,hinted:false,revealed:false,attempts:[],note:'',drawing:[]};
 return slot.trial;
}
function track(q,slot,{value,correct,teacher=false,hint=false,reveal=false,drawing}={}){
 const t=trialFor(q,slot);if(!t)return;
 if(value!==undefined)t.attempts.push({response:String(value).slice(0,200),correct:!!correct,mode:state.mode,at:new Date().toISOString(),teacher});
 t.completed=slot.done;t.mode=state.mode;t.hinted=t.hinted||hint||!!slot.hinted;t.revealed=t.revealed||reveal;t.revision++;if(drawing)t.drawing=structuredClone(drawing);queue(t);
}
window.addEventListener('beforeunload',e=>{if(cloud.pending.size){e.preventDefault();e.returnValue='저장 대기 중인 기록이 있습니다.';}});
window.addEventListener('online',()=>void flush());
$('sync-retry').onclick=()=>void flush();
$('student-select').onchange=()=>{cloud.student=$('student-select').value;start();syncStatus(cloud.student?(cloud.preview?'로컬 미리보기 기록 중':'학생 기록 중'):'연습 모드 · 기록 안 함');};
$('student-add-open').onclick=()=>{$('student-error').textContent=cloud.available?'':'현재 기록 저장소가 연결되지 않았습니다. 학생 등록은 게시된 웹주소에서 가능합니다.';$('student-dialog').showModal();};
$('student-form').onsubmit=async e=>{e.preventDefault();if(!cloud.available){$('student-error').textContent='저장소 연결 후 학생을 등록해 주세요.';return;}const name=$('student-name').value.trim();if(!name)return;const button=e.submitter;button.disabled=true;try{const d=await api('/students',{method:'POST',body:JSON.stringify({id:uid(),name})});cloud.students.push(d.student);cloud.student=d.student.id;refreshStudents();$('student-dialog').close();$('student-name').value='';start();syncStatus(cloud.preview?'로컬 미리보기 학생 선택됨':'학생이 등록됐어요. 활동 기록이 저장됩니다.');}catch(err){$('student-error').textContent=err.message;}finally{button.disabled=false;}};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
// Pen/touch input is stored as normalized strokes. A teacher, not OCR, marks the work.
const drawing={key:'',pages:new Map(),active:null};
const canvas=$('writing-pad'),ctx=canvas.getContext('2d');
function drawingKey(){return current()?state.sessionId+':'+current().passage.id+':'+current().slots[state.active].word:'';}
function strokes(){return drawing.pages.get(drawing.key)||[];}
function draw(target=canvas,data=strokes()){
 const c=target.getContext('2d'),w=target.width,h=target.height;c.clearRect(0,0,w,h);c.strokeStyle='#cad7e5';c.lineWidth=2;c.setLineDash([10,10]);c.beginPath();c.moveTo(0,h*.67);c.lineTo(w,h*.67);c.stroke();c.setLineDash([]);c.strokeStyle='#183652';c.lineWidth=Math.max(3,w/250);c.lineJoin='round';c.lineCap='round';for(const stroke of data){if(!stroke.length)continue;c.beginPath();c.moveTo(stroke[0][0]*w,stroke[0][1]*h);if(stroke.length===1)c.lineTo(stroke[0][0]*w+.1,stroke[0][1]*h+.1);else stroke.slice(1).forEach(p=>c.lineTo(p[0]*w,p[1]*h));c.stroke();}}
function point(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];}
canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();if(strokes().length>=250){message('획이 많아졌어요. 모두 지우고 다시 써 주세요.');return;}canvas.setPointerCapture(e.pointerId);drawing.active=[point(e)];const list=strokes();list.push(drawing.active);drawing.pages.set(drawing.key,list);draw();};
canvas.onpointermove=e=>{if(!drawing.active)return;e.preventDefault();if(drawing.active.length<2000)drawing.active.push(point(e));draw();};
canvas.onpointerup=canvas.onpointercancel=()=>drawing.active=null;
$('drawing-undo').onclick=()=>{strokes().pop();draw();};$('drawing-clear').onclick=()=>{drawing.pages.set(drawing.key,[]);draw();};
function markWriting(correct,assisted=false){const q=current(),slot=q?.slots[state.active];if(!slot||slot.done)return;if(!strokes().some(s=>s.length)){message('먼저 낱말을 써 주세요.');return;}if(assisted){slot.helped=true;slot.hinted=true;}if(correct)answer(slot.word,false,true);else{slot.tries=(slot.tries||0)+1;track(q,slot,{value:'[손글씨]',correct:false,teacher:true,drawing:strokes()});message('받침을 다시 살펴보고, 한 번 더 써 봐요.');}}
$('writing-correct').onclick=()=>markWriting(true);$('writing-help').onclick=()=>markWriting(true,true);$('writing-retry').onclick=()=>markWriting(false);
const oldRenderAnswer=renderAnswer;renderAnswer=function(){oldRenderAnswer();const q=current(),done=q?.slots.every(s=>s.done);$('handwriting').hidden=state.mode!=='write'||done;if(state.mode==='write'&&!done){$('typing-form').hidden=true;$('choices').hidden=true;const k=drawingKey();if(k!==drawing.key){drawing.key=k;$('writing-check').open=false;}draw();$('writing-answer').textContent='확인할 낱말: '+q.slots[state.active].word;message('직접 쓴 다음 선생님과 함께 확인해요.');}};
const oldRender=render;render=function(){oldRender();const q=current();$('mode-help').textContent=state.mode==='write'?'손가락이나 펜으로 쓴 뒤 선생님이 확인해요.':state.mode==='type'?'키보드로 낱말을 입력해요.':'보기를 눌러 빈칸을 채워요.';if(q){$('scene-image').src=Scene(q.passage.page);$('scene-image').alt=q.passage.title+' 장면의 책 삽화';$('scene-caption').textContent='관련 삽화 · PDF '+(q.passage.scenePage||q.passage.page)+'쪽 / 원문 '+q.passage.page+'쪽';}if(!q&&state.deck.length){const first=state.results.filter(r=>!r.helped&&(r.tries||1)===1).length;$('result').textContent=state.results.length+'개 낱말을 완성했어요. 첫 시도에 도움 없이 '+first+'개 · 다시 시도하거나 도움받아 '+(state.results.length-first)+'개 · 건너뛴 문장 '+state.deck.filter(q=>q.skipped).length+'개';}};
const oldStart=start;start=function(){state.sessionId=uid();drawing.pages.clear();drawing.key='';oldStart();};
const oldAnswer=answer;answer=function(value,show=false,teacher=false){const q=current(),slot=q?.slots[state.active];if(!slot||slot.done)return {ok:false,reason:'no_active_blank'};if(state.mode==='write'&&!teacher&&!show)return {ok:false,reason:'teacher_review_required'};const ink=state.mode==='write'?structuredClone(strokes()):undefined;if(typeof value==='string'&&value.trim())slot.tries=(slot.tries||0)+1;const result=oldAnswer(value,show);if(value&&value.trim()){track(q,slot,{value:teacher?'[손글씨]':value,correct:result.ok,teacher,reveal:show,drawing:ink});if(result.ok){const r=state.results[state.results.length-1];r.tries=slot.tries;r.mode=state.mode;}}return result;};
const oldHint=hint;hint=function(){const q=current(),slot=q?.slots[state.active];if(!slot||slot.done)return;slot.hinted=true;oldHint();track(q,slot,{hint:true});};
// Print sheets preserve the source wording and use the illustration from that source page.
let sheets=[];
function sheet(q,i,total,bank){const trace=$('print-writing').value==='trace';const article=E('article','worksheet');const head=E('div','sheet-heading');head.append(E('span','',bookTitle(state.book)),E('span','','이름: __________________  날짜: ______________'));article.append(head);article.append(E('h2','',q.passage.title));const img=E('img','sheet-scene');img.src=Scene(q.passage.page);img.alt=q.passage.title+' 삽화';article.append(img);const passage=E('div','sheet-passage');let pos=0;for(const [i,s] of q.slots.entries()){passage.append(document.createTextNode(q.passage.text.slice(pos,s.start)));const blank=E('span','paper-blank boxed-blank'+(trace?' trace-blank':''));if(q.slots.length>1)blank.append(E('span','blank-number',String(i+1)));[...s.word].forEach(letter=>blank.append(E('span',letter===' '?'writing-space':'answer-cell'+(trace?' trace-word':''),trace&&letter!==' '?letter:'')));passage.append(blank);pos=s.start+s.word.length;}passage.append(document.createTextNode(q.passage.text.slice(pos)));article.append(passage);if(bank){const b=E('div','word-bank');b.append(E('strong','','보기  '));shuffled(q.slots.map(s=>s.word)).forEach(w=>b.append(E('span','',w)));article.append(b);}article.append(E('div','sheet-practice',trace?'연한 글씨를 따라 한 번 더 써 봐요.':'빈칸에 낱말을 한 번 더 써 봐요.'));const practice=E('div','word-practice');q.slots.forEach((slot,j)=>{const group=E('div','practice-word');if(q.slots.length>1)group.append(E('span','practice-number',String(j+1)));[...slot.word].forEach(letter=>group.append(E('span',letter===' '?'writing-space':'practice-cell'+(trace?' trace-word':''),trace&&letter!==' '?letter:'')));practice.append(group);});article.append(practice);article.append(E('footer','sheet-footer','『'+bookTitle(state.book)+'』 · PDF '+q.passage.page+'쪽 원문 발췌 / 삽화 '+(q.passage.scenePage||q.passage.page)+'쪽 일부 · '+(i+1)+' / '+total));return article;}
function preparePrint(){
 const all=$('print-range').value==='all',perPage=Number($('print-per-page').value)||2,scale=[1,1.3,1.5].includes(Number($('print-size').value))?Number($('print-size').value):1.3;
 sheets=all?state.deck:(current()?[current()]:state.deck.slice(0,1));
 $('print-preview').replaceChildren();$('print-root').replaceChildren();
 const append=n=>{n.style.setProperty('--writing-scale',scale);n.dataset.writingScale=String(scale);$('print-preview').append(n);$('print-root').append(n.cloneNode(true));};
 const pageCount=Math.ceil(sheets.length/perPage);
 for(let offset=0;offset<sheets.length;offset+=perPage){
  if(perPage===1){append(sheet(sheets[offset],offset,sheets.length,$('print-wordbank').checked));continue;}
  const page=E('article','worksheet multi-page pages-'+perPage),head=E('div','sheet-heading');
  head.append(E('span','',bookTitle(state.book)),E('span','','이름: ______________  날짜: ____________'));
  page.append(head);const grid=E('div','multi-grid');
  sheets.slice(offset,offset+perPage).forEach((q,j)=>{
   const number=offset+j+1,card=sheet(q,offset+j,sheets.length,$('print-wordbank').checked);
   card.className='print-card';card.querySelector('.sheet-heading').remove();
   card.querySelector('h2').prepend(number+'. ');
   const scene=card.querySelector('.sheet-scene'),passage=card.querySelector('.sheet-passage'),body=E('div','card-body');
   scene.before(body);body.append(scene,passage);
   card.querySelector('.sheet-footer').textContent='PDF '+q.passage.page+'쪽 원문 · 삽화 '+(q.passage.scenePage||q.passage.page)+'쪽 일부';
   grid.append(card);
  });
  page.append(grid,E('footer','page-number',(offset/perPage+1)+' / '+pageCount));append(page);
 }
 const keys=$('print-key').checked&&sheets.length?Math.ceil(sheets.length/18):0;
 if(keys){for(let offset=0;offset<sheets.length;offset+=18){const key=E('article','worksheet answer-key');key.append(E('h2','','교사용 정답표'));const list=E('ol');list.start=offset+1;sheets.slice(offset,offset+18).forEach(q=>list.append(E('li','',q.passage.title+' — '+q.slots.map((s,i)=>(i+1)+'. '+s.word).join(' / '))));key.append(list);append(key);}}
 $('print-count').textContent=sheets.length+'문제 · 활동지 '+pageCount+'장'+(keys?' + 정답표 '+keys+'장':'');
 $('print-help').textContent='A4 세로 · 한 장에 '+perPage+'문제 · 글씨·네모칸 '+(scale===1?'기본 크기':scale+'배')+'. 선택한 크기는 문장 속 네모칸과 아래 연습 칸에 함께 적용됩니다.'+(!all?' 지금 보는 문장만 선택하면 한 문제만 인쇄해요.':perPage===4?' 4문제는 글씨와 쓰기 칸이 작아져요.':'');
 $('print-now').disabled=!sheets.length;
}
$('print-open').onclick=()=>{preparePrint();$('print-dialog').showModal();};['print-range','print-wordbank','print-key'].forEach(id=>$(id).onchange=preparePrint);
$('print-now').onclick=async()=>{preparePrint();await Promise.all([...$('print-root').querySelectorAll('img')].map(i=>i.complete?Promise.resolve():i.decode().catch(()=>{})));$('print-dialog').close();window.print();};
function outcome(t){if(t.mode==='paper')return !t.completed?'추가 연습 · 교사 기록':t.hinted?'도움받아 완성 · 교사 기록':'도움 없이 완성 · 교사 기록';if(!t.completed)return '추가 연습 / 진행 중';if(t.revealed)return '정답을 보며 완성';if(t.hinted)return '도움받아 완성';if(t.attempts.length>1)return '다시 시도 후 정답';return '첫 시도 정답';}
async function allTrials(studentId){let offset=0,out=[];do{const d=await api('/trials?studentId='+encodeURIComponent(studentId)+'&offset='+offset);out.push(...d.trials);offset=d.nextOffset;}while(offset!==null);return out;}
function recordTable(){const rows=cloud.trials.filter(t=>($('record-book').value==='all'||(t.bookId||'octopus')===$('record-book').value)&&($('record-activity').value==='all'||(t.activity||'cloze')===$('record-activity').value)&&($('record-mode').value==='all'||t.mode===$('record-mode').value)),completed=rows.filter(t=>t.completed),independent=completed.filter(t=>t.mode!=='paper'&&!t.hinted&&!t.revealed&&t.attempts.length===1&&t.attempts[0].correct);$('record-metrics').replaceChildren();[['완료한 문항',completed.length+'개'],['첫 시도 정답 · 화면 활동',independent.length+' / '+completed.filter(t=>t.mode!=='paper').length],['활동 횟수',new Set(rows.map(t=>t.sessionId)).size+'회']].forEach(([a,b])=>{const box=E('div');box.append(E('span','',a),E('strong','',b));$('record-metrics').append(box);});$('record-rows').replaceChildren();rows.forEach(t=>{const row=E('tr');[DATE.format(new Date(t.startedAt)),bookTitle(t.bookId)+' / '+ACTIVITY_NAMES[t.activity||'cloze']+' / '+t.word,MODE_NAMES[t.mode],String(t.attempts.length),outcome(t)].forEach(v=>row.append(E('td','',v)));const cell=E('td');const b=E('button','text-button','보기');b.onclick=()=>showTrial(t);cell.append(b);row.append(cell);$('record-rows').append(row);});if(!rows.length){const r=E('tr'),cell=E('td','','아직 기록이 없습니다. 학생을 선택한 뒤 낱말 활동을 시작해 보세요.');cell.colSpan=6;r.append(cell);$('record-rows').append(r);}}
async function loadRecords(){const student=$('record-student').value;cloud.loadedStudent='';cloud.trials=[];recordTable();if(!student){$('record-status').textContent=cloud.available?'학생을 선택해 주세요.':'기록 저장소에 연결되지 않았습니다. 온라인 비공개 주소에서 사용해 주세요.';return;}$('record-status').textContent='기록을 불러오는 중…';try{await flush();cloud.trials=await allTrials(student);cloud.loadedStudent=student;recordTable();$('record-status').textContent=(cloud.preview?'로컬 미리보기 기록 · ':'')+cloud.trials.length+'개 기록을 불러왔어요.'+(cloud.pending.size?' 저장 대기 기록은 아직 포함되지 않습니다.':'');}catch(e){$('record-status').textContent=e.message;}}
$('records-open').onclick=()=>{refreshStudents();$('record-student').value=cloud.student;$('records-dialog').showModal();void loadRecords();};$('record-student').onchange=()=>void loadRecords();$('records-refresh').onclick=()=>void loadRecords();$('record-mode').onchange=recordTable;$('record-activity').onchange=recordTable;$('record-book').onchange=recordTable;
function showTrial(t){$('trial-heading').textContent=bookTitle(t.bookId)+' · '+t.word+' · '+MODE_NAMES[t.mode];$('trial-detail').replaceChildren(E('p','',DATE.format(new Date(t.startedAt))+' / '+outcome(t)));const list=E('ol');t.attempts.forEach(a=>list.append(E('li','',(a.teacher?'교사 확인 · ':'')+a.response+' → '+(a.correct?'맞음':'다시 연습'))));if(t.prompt)$('trial-detail').append(E('p','','문제: '+t.prompt));if(t.expected)$('trial-detail').append(E('p','','정답 / 예시: '+t.expected));$('trial-detail').append(list);if(t.drawing?.length){const c=E('canvas','saved-drawing');c.width=1200;c.height=300;$('trial-detail').append(c);draw(c,t.drawing);}if(t.note)$('trial-detail').append(E('p','',t.note));$('trial-dialog').showModal();}
function download(text,name,type){const a=E('a');const url=URL.createObjectURL(new Blob([text],{type}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvCell(v){let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
$('export-csv').onclick=()=>{if(!cloud.loadedStudent){$('record-status').textContent='먼저 학생의 기록을 불러와 주세요.';return;}const name=cloud.students.find(s=>s.id===cloud.loadedStudent)?.name||'';const rows=[['학생','날짜','책','활동 종류','목표','문제','정답 / 예시','분류','방식','시도 수','힌트','정답 보기','결과','응답 과정','교사 메모'],...cloud.trials.map(t=>[name,t.startedAt,bookTitle(t.bookId),ACTIVITY_NAMES[t.activity||'cloze'],t.word,t.prompt||'',t.expected||'',t.category,MODE_NAMES[t.mode],t.attempts.length,t.hinted?'예':'아니오',t.revealed?'예':'아니오',outcome(t),t.attempts.map(a=>a.response+'('+ (a.correct?'맞음':'다시')+')').join(' → '),t.note])];download('\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'독후활동-평가기록.csv','text/csv;charset=utf-8');};
$('export-json').onclick=()=>{if(!cloud.loadedStudent)return;download(JSON.stringify({format:'octopus-records-v1',exportedAt:new Date().toISOString(),student:cloud.students.find(s=>s.id===cloud.loadedStudent),trials:cloud.trials},null,2),'독후활동-상세기록.json','application/json');};
WORDS.forEach(w=>$('paper-word').append(new Option(w,w)));$('paper-date').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
$('paper-record-form').onsubmit=async e=>{e.preventDefault();const studentId=$('record-student').value;if(!studentId||!cloud.available){$('record-status').textContent='저장할 학생을 먼저 선택해 주세요.';return;}const day=$('paper-date').value;if(!day)return;const selected=$('paper-outcome').value,word=$('paper-word').value,t={id:uid(),studentId,sessionId:uid(),revision:1,word,mode:'paper',category:wordKind(word)==='none'?'key':wordKind(word),page:PASSAGES.find(p=>p.words.includes(word))?.page,startedAt:new Date(day+'T12:00:00').toISOString(),completed:selected!=='retry',hinted:selected==='assisted',revealed:false,attempts:[{response:'[종이 활동]',correct:selected!=='retry',mode:'paper',at:new Date().toISOString(),teacher:true}],note:$('paper-note').value.trim(),drawing:[]};queue(t);await flush();if(cloud.pending.has(t.id))$('record-status').textContent='저장 대기 중입니다. 화면을 닫지 말고 다시 저장해 주세요.';else{$('paper-note').value='';await loadRecords();}};
render();void initCloud();
// Keep the same print dialog available after its header button scrolls away.
const floatingPrint=$('print-open').cloneNode(true);
floatingPrint.id='print-floating';floatingPrint.className='print-floating';floatingPrint.hidden=true;
floatingPrint.querySelector('small')?.remove();
floatingPrint.setAttribute('aria-haspopup','dialog');floatingPrint.setAttribute('aria-controls','print-dialog');
floatingPrint.onclick=()=>$('print-open').click();document.body.append(floatingPrint);
if('IntersectionObserver' in window){
 const printVisibility=new IntersectionObserver(([entry])=>{floatingPrint.hidden=entry.isIntersecting;},{threshold:0});
 printVisibility.observe($('print-open'));
 window.addEventListener('pagehide',()=>printVisibility.disconnect(),{once:true});
 window.addEventListener('pageshow',()=>printVisibility.observe($('print-open')));
}else floatingPrint.hidden=false;


if(window.APP_HOST==='static'){
 $('records-open').onclick=()=>window.open('https://octopus-word-play.joeune.chatgpt.site/','_blank','noopener,noreferrer');
 $('records-open').setAttribute('aria-label','학생 기록 · 기존 사이트에서 열기');
 $('records-open').title='학생 기록은 기존 사이트에서 이용합니다. 새 탭으로 열립니다.';
 $('records-open').querySelector('span').textContent='학생 기록 ↗';
}
