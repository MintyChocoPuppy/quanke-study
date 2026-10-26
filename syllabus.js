'use strict';
const STORAGE_KEY = 'quanke-syllabus-progress-v1';
const READING_KEY = 'quanke-textbook-reading-v1';
const $ = (id) => document.getElementById(id);
const escapeHTML = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let modules = [], progressState = {}, filter = 'all';
progressState = {};
function notify(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(notify.timer); notify.timer = setTimeout(() => $('toast').classList.remove('visible'), 3500); }
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progressState)); } catch { notify('当前浏览器无法保存进度，请使用“导出进度”备份。'); } }
function count(m) { return m.objectives.filter((_, i) => progressState[m.id + ':' + i] === true).length; }
function updateProgress() {
  const total = modules.reduce((n, m) => n + m.objectives.length, 0);
  const done = modules.reduce((n, m) => n + count(m), 0);
  $('progress').max = total; $('progress').value = done;
  $('progressText').textContent = '共 ' + total + ' 项学习目标（公开只读）';
  const full = modules.filter(m => count(m) === m.objectives.length).length;
  $('progressHint').textContent = '学习记录与编辑保留在原站账号中。';
  for (const m of modules) document.querySelectorAll('[data-count="' + m.id + '"]').forEach(el => el.textContent = count(m) + '/' + m.objectives.length);
}
function renderModules() {
  const kinds = {lecture:'课堂讲授',self:'自主学习',practice:'见习实践'};
  $('moduleList').innerHTML = modules.map((m,i) => `<details class="module" id="topic-${m.id}" ${i===0?'open':''} data-id="${m.id}"><summary><span class="module-code">${escapeHTML(m.code || m.id)}<small>${m.kind==='self'?'自学':''}</small></span><div><h3>${escapeHTML(m.title)}</h3><p class="module-summary">${escapeHTML(m.summary)}</p><div class="module-meta"><span class="tag">${(m.kinds || [m.kind]).map(k=>kinds[k]).join(" / ")} · ${escapeHTML(m.hoursLabel)}</span><span>${escapeHTML(m.books)}</span><span>已完成 <b data-count="${m.id}">0/${m.objectives.length}</b></span></div></div></summary><div class="module-body"><div class="source-line"><span>${escapeHTML(m.sourcePages)} · ${escapeHTML(m.pages)}</span><a class="text-link" href="./reader.html?topic=${encodeURIComponent(m.id)}">读对应教材 ↗</a></div><h4>学习目标 · 逐项勾选</h4><div class="goals">${m.objectives.map((g,j)=>`<label class="goal"><input type="checkbox" disabled aria-label="学习目标（只读）" data-key="${m.id}:${j}" ${progressState[m.id+':'+j]===true?'checked':''}><span>${escapeHTML(g)}</span></label>`).join('')}</div><details class="knowledge"><summary>完整学习要点 · ${m.dimensions.reduce((n,d)=>n+d.items.length,0)}项</summary>${m.dimensions.map(d=>`<section class="dimension"><h5>${escapeHTML(d.title)}</h5><ol>${d.items.map(t=>`<li>${escapeHTML(t)}</li>`).join('')}</ol></section>`).join('')}</details><h4>专业术语 · 中英对照</h4><div class="table-scroll"><table><thead><tr><th scope="col">英文</th><th scope="col">中文</th></tr></thead><tbody>${m.terms.map(t=>`<tr><td lang="en">${escapeHTML(t.en)}</td><td>${escapeHTML(t.zh)}${t.note?`<small class="small-note">${escapeHTML(t.note)}</small>`:''}</td></tr>`).join('')}</tbody></table></div><h4>课外阅读</h4><ul class="readings">${m.readings.map(t=>`<li>${escapeHTML(t)}</li>`).join('')}</ul>${m.correction?`<p class="correction">教材定位校对：${escapeHTML(m.correction)}</p>`:''}<details class="knowledge"><summary>查看本主题大纲原文</summary><pre class="source-raw">${escapeHTML(m.raw || "")}</pre></details></div></details>`).join('');
  $('topicIndex').innerHTML = modules.map(m => `<a href="#topic-${m.id}" data-topic="${m.id}"><small>${escapeHTML(m.id)} · </small>${escapeHTML(m.title)}</a>`).join('');
  updateProgress(); applyFilter();
}
function applyFilter() {
  const query = $('search').value.trim().toLowerCase(); let shown = 0;
  for (const m of modules) {
    const match = (filter === 'all' || (m.kinds || [m.kind]).includes(filter)) && (!query || JSON.stringify(m).toLowerCase().includes(query));
    $('topic-'+m.id).hidden = !match;
    const link = document.querySelector('[data-topic="'+m.id+'"]'); link.hidden = !match;
    if (match) shown++;
  }
  $('resultCount').textContent = '显示 ' + shown + ' / 11 个模块' + (query ? ' · 关键词：' + $('search').value.trim() : ' · 按大纲顺序');
  $('noResults').hidden = shown !== 0;
}
document.addEventListener('change', e => { if (false) { progressState[e.target.dataset.key] = e.target.checked; save(); updateProgress(); } });
$('search').addEventListener('input', applyFilter);
document.querySelectorAll('[data-kind]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.kind;document.querySelectorAll('[data-kind]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));applyFilter();}));
$('topicIndex').addEventListener('click',e=>{const a=e.target.closest('a[data-topic]');if(a) $('topic-'+a.dataset.topic).open=true;});
$('toggleAll').addEventListener('click',()=>{const visible=[...document.querySelectorAll('.module:not([hidden])')];const open=visible.some(d=>!d.open);visible.forEach(d=>d.open=open);$('toggleAll').textContent=open?'收起全部':'展开全部';});
$('exportProgress').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'quanke-progress-v1',exportedAt:new Date().toISOString(),progress:progressState},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='全科医学概论_学习进度.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('importProgress').addEventListener('change',async e=>{return;const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw new Error();const data=JSON.parse(await file.text());if(data.format!=='quanke-progress-v1'||!data.progress||typeof data.progress!=='object'||Array.isArray(data.progress))throw new Error();const next={};modules.forEach(m=>m.objectives.forEach((_,i)=>{const key=m.id+':'+i;if(typeof data.progress[key]==='boolean')next[key]=data.progress[key];}));progressState=next;save();renderModules();notify('已导入学习进度。');}catch{notify('未能导入，请选择由本网站导出的进度文件。');}finally{e.target.value='';}});
try{const pos=JSON.parse(localStorage.getItem(READING_KEY)||'null');if(pos?.page>0){$('readingPosition').textContent='上次读到 PDF 第 '+pos.page+' 页，打开教材可继续。';$('resumeReading').textContent='继续阅读 ↗';}}catch{}
fetch('./syllabus.json').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{modules=data.modules;renderModules();if(location.hash){const el=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(el?.classList.contains('module')){el.open=true;el.scrollIntoView();}}}).catch(()=>{$('loadError').hidden=false;$('progressText').textContent='课程大纲暂时未能载入';});

function syncReaderProgress(){return;try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))return;progressState=saved;document.querySelectorAll('input[data-key]').forEach(input=>{input.checked=progressState[input.dataset.key]===true;});updateProgress();}catch{}}
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)syncReaderProgress();});
window.addEventListener('pageshow',event=>{if(event.persisted)syncReaderProgress();});
window.addEventListener('focus',syncReaderProgress);
