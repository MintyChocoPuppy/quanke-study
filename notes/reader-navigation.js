(() => {
 const params=new URLSearchParams(location.search),embedded=window.parent!==window,validId=value=>/^[-a-zA-Z0-9]{1,160}$/.test(value||'');
 let catalog=[],queued=false,lastContext='';const knownPage=value=>Number.isInteger(Number(value))&&Number(value)>0&&Number(value)<=306?Number(value):null;
 function currentId(){const query=new URLSearchParams(location.search).get('id');if(validId(query))return query;const filename=decodeURIComponent(location.pathname.split('/').at(-1)).replace(/\.html$/,'');return filename!=='index'&&validId(filename)?filename:null;}
 function readerURL(page,id){const url=new URL('../reader.html',location.href);if(page)url.searchParams.set('page',page);if(id){url.searchParams.set('notes','1');url.searchParams.set('note',id);}return url;}
 function link(id,text){let a=document.getElementById(id);if(!a){a=document.createElement('a');a.id=id;a.textContent=text;}return a;}
 function update(){queued=false;const id=currentId(),note=catalog.find(n=>n.id===id);let previous=knownPage(params.get('fromPage'));try{previous||=knownPage(JSON.parse(localStorage.getItem('quanke-textbook-reading-v1')||'null')?.page);}catch{}const back=readerURL(previous,id),mapped=knownPage(note?.textbookPage),target=readerURL(mapped,id);if(!mapped)target.searchParams.set('outline','1');
 if(!embedded){let nav=document.getElementById('notesReaderNav');if(!nav){nav=document.createElement('nav');nav.id='notesReaderNav';nav.className='notes-reader-nav';nav.setAttribute('aria-label','笔记与教材导航');document.body.prepend(nav);}const a=link('notesBackToReader','← 返回教材');if(a.href!==back.href)a.href=back.href;if(a.parentElement!==nav)nav.append(a);const b=link('notesOpenCorresponding','');const label=mapped?'查看对应教材 · PDF '+mapped+' 页':'教材目录（本篇无对应页）';if(b.textContent!==label)b.textContent=label;if(b.href!==target.href)b.href=target.href;if(b.parentElement!==nav)nav.append(b);}
 const bar=document.querySelector('.note-document-top');if(bar){const a=link('noteCorrespondingPage','');const label=mapped?'查看对应教材 · PDF '+mapped+' 页':'教材目录';if(a.textContent!==label)a.textContent=label;if(a.href!==target.href)a.href=target.href;a.target=embedded?'_top':'_self';if(a.parentElement!==bar)bar.append(a);}
 // Existing small source references share the same stable context-preserving destination.
 if(mapped)for(const a of document.querySelectorAll('.note-reading-meta a[href*="reader.html?page="],.static-note-title a[href*="reader.html?page="]')){if(a.href!==target.href)a.href=target.href;a.target=embedded?'_top':'_self';}
 if(embedded&&id&&id!==lastContext){lastContext=id;parent.postMessage({type:'quanke:note-context',id},location.origin);}
 }
 function schedule(){if(!queued){queued=true;requestAnimationFrame(update);}}
 new MutationObserver(schedule).observe(document.getElementById('root')||document.querySelector('main')||document.body,{subtree:true,childList:true});window.addEventListener('popstate',schedule);window.addEventListener('pageshow',schedule);
 fetch('./data/notes.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{catalog=data.notes||[];update();}).catch(()=>update());update();
})();
