'use strict';
const bookAsset=path=>window.BOOK_ASSETS?.[path]||(path.startsWith('scenes/')?window.OCTOPUS_SCENES?.[path.slice(7,-5)]:null)||path;
const savedBookSelections={octopus:new Set(state.selected)};
for(const id of ['book-select','record-book']){
 const select=$(id);const old=select.value;select.replaceChildren();
 if(id==='record-book')select.append(new Option('모든 책','all'));
 Object.entries(BOOKS).forEach(([key,b])=>select.append(new Option(b.title,key)));
 select.value=old;
}
function updateBookUI(){
 const b=BOOKS[state.book],clozeOnly=state.book!=='octopus';
 document.querySelector('.intro .eyebrow').textContent=b.title;
 document.querySelector('.book img').src=bookAsset(b.cover);document.querySelector('.book img').alt=b.title+' 책 표지';document.querySelector('.book strong').textContent=b.title;
 $('finished').querySelector('img').src=bookAsset(b.finish);$('finished').querySelector('img').alt=b.title+' 마지막 장면';
 const examples={all:'받침 + 핵심 낱말',single:b.words.filter(w=>wordKind(w)==='single').slice(0,3).join(' · '),double:b.words.filter(w=>wordKind(w)==='double').slice(0,3).join(' · ')||'이 책에서 확인한 낱말 없음',key:[...b.keys].slice(0,3).join(' · ')};
 document.querySelectorAll('input[name="category"]').forEach(r=>r.closest('label').querySelector('small').textContent=examples[r.value]);
 document.querySelectorAll('[data-activity]').forEach(el=>{el.hidden=clozeOnly&&el.dataset.activity!=='cloze';});
 $('book-note').textContent=b.note||(clozeOnly?'원문 낱말 빈칸 활동':'낱말 빈칸 · 중심문장 · 사실과 의견');
 document.querySelector('.footnote').textContent='『'+b.title+'』에서 확인한 원문 '+PASSAGES.length+'개 · '+WORDS.length+'개 목표 낱말 · 학생 기록은 기존 사이트에서 이용할 수 있습니다.';
 const detail=$('teacher').querySelector('details');detail.querySelectorAll('p')[0].textContent='홑받침은 자음 하나, 겹받침은 서로 다른 두 자음으로 된 받침입니다. ㄲ·ㅆ은 쌍받침으로 구별합니다. 이 책의 겹받침 목표: '+WORDS.filter(w=>wordKind(w)==='double').map(w=>w+' ('+[...new Set(codas(w).filter(c=>DOUBLE.has(c.coda)).map(c=>c.coda))].join('·')+')').join(', ')+'.';detail.querySelectorAll('p')[1].textContent='한 낱말에 홑받침과 겹받침이 함께 있으면 겹받침 목록에 표시합니다. 선택한 책의 원문 '+PASSAGES.length+'개 대목으로 구성했습니다. 조사는 빈칸 밖에 남을 수 있습니다. 쪽수는 제공된 PDF 기준입니다.';
 $('paper-word').replaceChildren();WORDS.forEach(w=>$('paper-word').append(new Option(w,w)));
 // Paper comprehension activities exist only for the original book.
 paperActivitySelect.value='cloze';[...paperActivitySelect.options].forEach(o=>o.disabled=clozeOnly&&o.value!=='cloze');paperActivitySelect.onchange();
}
$('book-select').onchange=()=>{
 savedBookSelections[state.book]=new Set(state.selected);state.book=$('book-select').value;const b=BOOKS[state.book];PASSAGES=b.passages;KEY_WORDS=b.keys;WORDS=b.words;DISTRACTORS=b.distractors;
 state.selected=new Set(savedBookSelections[state.book]||b.defaults);drawing.active=null;readingStroke=null;switchActivity('cloze');updateBookUI();start();
};
// Keep image and target selection scoped to the book while preserving existing records.
updateBookUI();
