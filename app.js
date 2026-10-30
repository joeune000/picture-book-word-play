'use strict';
const $=id=>document.getElementById(id);
const state={book:'octopus',category:'all',mode:'choose',optionCount:3,blankCount:1,fontSize:34,selected:new Set(['집','지붕','앉아','싫구나','않을래','않았어요','맑은','없는','문어','친구','낙엽','함박눈']),deck:[],index:0,active:0,results:[],round:0};
function eligible(w){return state.selected.has(w)&&(state.category==='all'||state.category==='key'&&KEY_WORDS.has(w)||wordKind(w)===state.category);}
function buildDeck(){
 const remaining=new Set(WORDS.filter(eligible)),deck=[];
 const frequency=w=>PASSAGES.filter(p=>p.words.includes(w)).length;
 while(remaining.size){let changed=false;PASSAGES.forEach((p,order)=>{const slots=[];for(const word of p.words.filter(w=>remaining.has(w)).sort((a,b)=>frequency(a)-frequency(b))){let start=p.text.indexOf(word);while(start!==-1&&slots.some(s=>start<s.start+s.word.length&&start+word.length>s.start))start=p.text.indexOf(word,start+1);if(start!==-1)slots.push({word,start,done:false,helped:false});if(slots.length===state.blankCount)break;}if(!slots.length)return;slots.forEach(s=>remaining.delete(s.word));deck.push({passage:p,order,slots:slots.sort((a,b)=>a.start-b.start)});changed=true;});if(!changed)break;}
 return deck.sort((a,b)=>a.order-b.order);
}
function start(){state.round++;state.deck=buildDeck();state.index=0;state.active=0;state.results=[];render();}
function current(){return state.deck[state.index];}
function message(text,good=false){$('feedback').textContent=text;$('feedback').className='feedback'+(good?' good':'');}
function codaText(word){const cs=codas(word),kind=wordKind(word),target=cs.filter(c=>kind==='double'?DOUBLE.has(c.coda):SINGLE.has(c.coda));return target.map(c=>c.letter+'의 받침 '+c.coda).join(', ');}
function renderPassage(){
 const q=current(),root=$('passage');root.replaceChildren();let pos=0;
 q.slots.forEach((slot,i)=>{root.append(document.createTextNode(q.passage.text.slice(pos,slot.start)));const b=document.createElement('button');b.type='button';b.className='blank'+(slot.done?' completed'+(slot.helped?' helped':''):i===state.active?' active':'');b.dataset.slot=i;b.style.minWidth=Math.max(2,slot.word.length)*.98+'em';b.setAttribute('aria-label',slot.done?`${i+1}번 빈칸, ${slot.word}, 완성`:`${i+1}번 빈칸 선택`);b.setAttribute('aria-pressed',String(i===state.active&&!slot.done));b.disabled=slot.done;b.textContent=slot.done?slot.word:String(i+1);if(!slot.done){b.classList.add('unfilled');b.addEventListener('click',()=>{state.active=i;renderPassage();renderAnswer();if(state.mode==='type')$('typed').focus();});}root.append(b);pos=slot.start+slot.word.length;});root.append(document.createTextNode(q.passage.text.slice(pos)));
}
function shuffled(items){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function options(word){const preferred=DISTRACTORS[word]||WORDS.filter(w=>w!==word&&Math.abs(w.length-word.length)<=1);const wrong=[...new Set([...preferred,...WORDS])].filter(w=>w!==word).slice(0,state.optionCount-1);return shuffled([word,...wrong]);}
function renderAnswer(){
 const q=current(),complete=q.slots.every(s=>s.done),slot=q.slots[state.active];
 $('previous').disabled=state.index===0;$('next').disabled=false;$('next').innerHTML=state.index===state.deck.length-1?'활동 마치기 <span aria-hidden="true">✓</span>':'다음 문장 <span aria-hidden="true">→</span>';
 $('hint').hidden=complete;$('reveal').hidden=complete;$('hint-text').hidden=true;$('choices').replaceChildren();$('choices').hidden=state.mode!=='choose'||complete;$('typing-form').hidden=state.mode!=='type'||complete;$('typed').value=complete?'':slot.draft||'';
 $('answer-label').textContent=complete?'문장이 완성됐어요!':`${q.slots.length>1?state.active+1+'번 ':''}빈칸에 들어갈 낱말은?`;
 message(complete?'완성한 문장을 한 번 읽고 넘어가요.':state.mode==='choose'?'알맞은 낱말을 눌러 주세요.':'낱말을 쓴 뒤 ‘넣기’를 눌러 주세요.',complete);
 if(!complete&&state.mode==='choose')options(slot.word).forEach(word=>{const b=document.createElement('button');b.type='button';b.className='choice';b.textContent=word;b.addEventListener('click',()=>answer(word));$('choices').append(b);});
}
function render(){
 document.documentElement.style.setProperty('--reading-size',state.fontSize+'px');
 const empty=state.deck.length===0,finished=!empty&&state.index>=state.deck.length;
 $('game').hidden=empty||finished;$('finished').hidden=!finished;$('empty').hidden=!empty;$('retry-skipped').hidden=!state.deck.some(q=>q.skipped&&q.slots.some(s=>!s.done));
 const labels={all:'받침과 핵심 낱말',single:'홑받침 낱말',double:'겹받침 낱말',key:'핵심 단어'};
 $('stage-label').textContent=labels[state.category];$('progress-label').textContent=empty?'선택한 낱말 없음':finished?'활동 마침':`${state.index+1} / ${state.deck.length} 문장`;
 $('progress').max=Math.max(1,state.deck.length);$('progress').value=state.index;
 $('mode-help').textContent=state.mode==='choose'?'보기를 눌러 빈칸을 채워요.':'키보드로 낱말을 써서 채워요.';
 if(empty)return;
 if(finished){const independent=state.results.filter(r=>!r.helped).length;$('result').textContent=`${state.results.length}개 낱말을 연습했어요. 스스로 완성 ${independent}개 · 힌트나 정답과 함께 ${state.results.length-independent}개`;$('practiced').replaceChildren();state.results.forEach(r=>{const span=document.createElement('span');span.textContent=r.word;$('practiced').append(span);});return;}
 const q=current();$('scene-title').textContent=q.passage.title;$('page-ref').textContent=`원문 · PDF ${q.passage.page}쪽`;state.active=Math.max(0,q.slots.findIndex(s=>!s.done));renderPassage();renderAnswer();
}
function answer(value,show=false){
 const q=current();if(!q)return {ok:false,reason:'no_active_question'};const slot=q.slots[state.active];if(!slot||slot.done)return {ok:false,reason:'already_completed'};
 if(typeof value!=='string')throw new TypeError('낱말은 문자열이어야 합니다.');
 const normalized=value.normalize('NFC').trim();if(!normalized){message('낱말을 먼저 써 주세요.');return {ok:false,reason:'empty'};}
 if(!show&&normalized!==slot.word){message('문장을 다시 읽어 볼까요? 다른 낱말을 골라 보거나 힌트를 눌러 주세요.');if(state.mode==='type'){message('조금 달라요. 글자와 받침을 다시 살펴볼까요?');$('typed').select();}return {ok:false,reason:'try_again'};}
 slot.done=true;slot.helped=slot.helped||show;state.results.push({word:slot.word,helped:slot.helped});const prev=slot.word;const next=q.slots.findIndex(s=>!s.done);if(next>=0)state.active=next;else q.skipped=false;renderPassage();renderAnswer();
 message((show?'정답을 보며 연습했어요. ': '알맞게 넣었어요! ')+prev+(codaText(prev)?' · '+codaText(prev):'')+(next>=0?' — 다음 빈칸도 채워 봐요.':''),!show);
 if(next<0)$('next').focus();else if(state.mode==='type')$('typed').focus();else $('choices').querySelector('button')?.focus();return {ok:true,word:prev,sentenceComplete:next<0};
}
function next(){const q=current();if(!q)return false;q.skipped=q.slots.some(s=>!s.done);state.index++;state.active=0;render();if(state.index>=state.deck.length)$('finished').focus();else $('activity').focus();return true;}
function previous(){if(!state.deck.length||state.index<=0)return false;state.index=Math.min(state.index-1,state.deck.length-1);state.active=0;render();$('activity').focus();return true;}
function retrySkipped(){const index=state.deck.findIndex(q=>q.skipped&&q.slots.some(s=>!s.done));if(index<0)return false;state.index=index;state.active=0;render();$('activity').focus();return true;}
function hint(){const slot=current()?.slots[state.active];if(!slot||slot.done)return;slot.helped=true;const info=codaText(slot.word);$('hint-text').textContent=`${slot.word.length}글자 낱말이에요. `+(info?info+'을 살펴봐요.':`첫 글자는 ‘${slot.word[0]}’예요.`);$('hint-text').hidden=false;}
function openSettings(){
 $('option-count').value=state.optionCount;$('blank-count').value=state.blankCount;$('font-size').value=state.fontSize;
 const groups=[['double','겹받침이 있는 낱말'],['single','홑받침이 있는 낱말'],['none','받침 없는 낱말']];$('word-list').replaceChildren();
 groups.forEach(([kind,title])=>{const words=WORDS.filter(w=>wordKind(w)===kind);if(!words.length)return;const section=document.createElement('section');section.className='word-group';const h=document.createElement('h4');h.textContent=title;section.append(h);const items=document.createElement('div');items.className='word-items';words.forEach(w=>{const label=document.createElement('label');label.className='word-item';const input=document.createElement('input');input.type='checkbox';input.value=w;input.name='word';input.checked=state.selected.has(w);input.addEventListener('change',updateCount);label.append(input,document.createTextNode(w));const small=document.createElement('small');small.textContent=kind==='double'?[...new Set(codas(w).filter(c=>DOUBLE.has(c.coda)).map(c=>c.coda))].join('·'):KEY_WORDS.has(w)?'핵심':'';label.append(small);items.append(label);});section.append(items);$('word-list').append(section);});updateCount();$('teacher').showModal();
}
function updateCount(){const n=$('word-list').querySelectorAll('input:checked').length;$('selected-count').textContent=`${n}개 낱말 선택`;}
document.querySelectorAll('input[name="category"]').forEach(r=>r.addEventListener('change',()=>{state.category=r.value;start();}));
document.querySelectorAll('input[name="mode"]').forEach(r=>r.addEventListener('change',()=>{state.mode=r.value;render();}));
$('typing-form').addEventListener('submit',e=>{e.preventDefault();answer($('typed').value);});$('typed').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.isComposing)e.preventDefault();});
$('typed').addEventListener('input',()=>{const slot=current()?.slots[state.active];if(slot&&!slot.done)slot.draft=$('typed').value;});
$('previous').addEventListener('click',previous);$('finished-previous').addEventListener('click',previous);$('retry-skipped').addEventListener('click',retrySkipped);
$('hint').addEventListener('click',hint);$('reveal').addEventListener('click',()=>answer(current().slots[state.active].word,true));$('next').addEventListener('click',next);$('restart').addEventListener('click',start);$('again').addEventListener('click',()=>{start();$('activity').focus();});$('teacher-open').addEventListener('click',openSettings);$('empty-settings').addEventListener('click',openSettings);$('teacher-close').addEventListener('click',()=>$('teacher').close());
$('select-all').addEventListener('click',()=>{$('word-list').querySelectorAll('input').forEach(i=>i.checked=true);updateCount();});$('select-none').addEventListener('click',()=>{$('word-list').querySelectorAll('input').forEach(i=>i.checked=false);updateCount();});
$('settings-form').addEventListener('submit',e=>{e.preventDefault();state.optionCount=Number($('option-count').value);state.blankCount=Number($('blank-count').value);state.fontSize=Number($('font-size').value);state.selected=new Set([...$('word-list').querySelectorAll('input:checked')].map(i=>i.value));$('teacher').close();start();$('activity').focus();});
start();
// Structured actions reuse the same UI state. Unsupported browsers use the normal UI.
function registerModelTools(){const context=document.modelContext;if(!context?.registerTool)return;const lifecycle=new AbortController();const register=t=>{try{Promise.resolve(context.registerTool(t,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
 register({name:'read_word_activity',description:'Read the visible exercise, selected category and completion state without revealing hidden answers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(){const q=current();return {category:state.category,mode:state.mode,sentenceIndex:state.index+1,total:state.deck.length,text:$('passage').textContent,activeBlank:state.active+1,complete:!!q&&q.slots.every(s=>s.done),finished:state.deck.length>0&&!q};}});
 register({name:'submit_word_answer',description:'Put a word into the active blank using the same checking action as the visible activity.',inputSchema:{type:'object',properties:{word:{type:'string',maxLength:30}},required:['word'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.word!=='string'||input.word.length>30||Object.keys(input).some(k=>k!=='word'))throw new Error('유효한 낱말 한 개가 필요합니다.');return answer(input.word);}});
 register({name:'next_word_sentence',description:'Go to the next sentence, skipping any unfinished blanks without marking them correct or completed.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute(){return {advanced:next(),sentenceIndex:state.index+1,finished:state.deck.length>0&&state.index>=state.deck.length};}});
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
registerModelTools();
