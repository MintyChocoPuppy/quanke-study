'use strict';

window.setupReaderStudy = function setupReaderStudy(app, { book, data, navigate, topicId }) {
  const $ = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const modules = data.modules;
  const progressKey = 'quanke-syllabus-progress-v1';
  const visibilityKey = 'quanke-reader-outline-v1';
  const tabKey = 'quanke-reader-sidebar-tab-v1';
  let progress = {}, open = false, tab = 'textbook', ready = false, suppressNative = false;
  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch { return progress; }
  }
  progress = {};
  try {
    open = localStorage.getItem(visibilityKey) === 'open';
    tab = localStorage.getItem(tabKey) === 'teaching' ? 'teaching' : 'textbook';
  } catch {}
  const count = module => module.objectives.filter((_, i) => progress[module.id + ':' + i] === true).length;
  const validPage = page => Number.isInteger(Number(page)) && Number(page) >= 1 && Number(page) <= book.pages;
  const targets = (module) => (module.bookTargets?.length ? module.bookTargets :
    validPage(module.bookPage) ? [{ title: module.books, page: module.bookPage }] : []);

  $('teachingTopics').innerHTML = modules.map(module => `<details class="study-topic" data-topic="${escape(module.id)}">
    <summary><span class="study-code">${escape(module.code || module.id)}</span><strong>${escape(module.title)}</strong>
      <small data-topic-progress="${escape(module.id)}">${count(module)}/${module.objectives.length}</small></summary>
    <div class="study-topic-body"><p class="study-hours">${escape(module.hoursLabel)}</p>
      <div class="study-targets">${targets(module).map(target => `<button type="button" class="sidebar-jump" data-page="${Number(target.page)}" data-jump-topic="${escape(module.id)}">读对应教材 · PDF ${Number(target.page)}<small>${escape(target.title)}</small></button>`).join('')}</div>
      <h3>学习目标</h3>${module.objectives.map((goal, i) => `<label class="reader-goal"><input type="checkbox" disabled aria-label="学习目标（只读）" data-goal="${escape(module.id + ':' + i)}" ${progress[module.id + ':' + i] === true ? 'checked' : ''}><span>${escape(goal)}</span></label>`).join('')}
      <details class="study-more"><summary>完整学习要点</summary>${module.dimensions.map(dimension => `<h4>${escape(dimension.title)}</h4><ol>${dimension.items.map(item => `<li>${escape(item)}</li>`).join('')}</ol>`).join('')}</details>
      <details class="study-more"><summary>查看教学大纲原文</summary><pre>${escape(module.raw)}</pre></details>
    </div></details>`).join('');
  // Keep every PDF bookmark, nesting it beneath its nearest shallower ancestor.
  const tree = [], stack = [];
  book.outline.forEach((entry, index) => {
    const node = { entry, index, children: [] };
    while (stack.length && stack.at(-1).entry.level >= entry.level) stack.pop();
    (stack.length ? stack.at(-1).children : tree).push(node);
    stack.push(node);
  });
  function tocMarkup(nodes) {
    return nodes.map(node => {
      const button = `<button type="button" class="toc-entry" data-outline-index="${node.index}" data-page="${Number(node.entry.page)}"><span>${escape(node.entry.title)}</span><small>PDF ${Number(node.entry.page)}</small></button>`;
      return node.children.length ? `<details class="toc-branch" data-branch-index="${node.index}"><summary>${button}</summary><div class="toc-children">${tocMarkup(node.children)}</div></details>` : button;
    }).join('');
  }
  $('textbookTopics').innerHTML = tocMarkup(tree);
  let searchFoldState = null;


  function updateProgress() {
    let done = 0, total = 0;
    modules.forEach(module => { done += count(module); total += module.objectives.length; });
    $('readerGoalProgress').max = total;
    $('readerGoalProgress').value = done;
    $('readerProgressText').textContent = `已完成 ${done} / ${total} 项目标`;
    document.querySelectorAll('[data-topic-progress]').forEach(item => {
      const module = modules.find(m => m.id === item.dataset.topicProgress);
      item.textContent = count(module) + '/' + module.objectives.length;
    });
    document.querySelectorAll('[data-goal]').forEach(input => { input.checked = progress[input.dataset.goal] === true; });
  }

  function filter() {
    const query = $('sidebarSearch').value.trim().toLocaleLowerCase();
    let visible = 0;
    if (tab === 'teaching') {
      document.querySelectorAll('.study-topic').forEach(item => {
        const module = modules.find(m => m.id === item.dataset.topic);
        item.hidden = query !== '' && !JSON.stringify(module).toLocaleLowerCase().includes(query);
        if (!item.hidden) visible++;
      });
    } else {
      const branches = [...document.querySelectorAll('.toc-branch')];
      if (query && !searchFoldState) searchFoldState = new Map(branches.map(branch => [branch, branch.open]));
      document.querySelectorAll('.toc-entry').forEach(item => {
        const entry = book.outline[Number(item.dataset.outlineIndex)];
        item.hidden = query !== '' && !String(entry.title).toLocaleLowerCase().includes(query);
        if (!item.hidden) visible++;
      });
      // Search retains ancestor headings and expands only matching paths.
      [...branches].reverse().forEach(branch => {
        const matches = [...branch.querySelectorAll('.toc-entry')].some(item => !item.hidden);
        branch.hidden = !matches;
        if (query && matches) {
          branch.open = true;
          branch.querySelector('summary > .toc-entry').hidden = false;
        } else if (!query && searchFoldState) branch.open = searchFoldState.get(branch) || false;
      });
      if (!query) searchFoldState = null;
    }
    $('sidebarResultCount').textContent = `${visible} 个${tab === 'teaching' ? '主题' : '目录项'}`;
    $('sidebarEmpty').hidden = visible > 0;
  }

  function render() {
    $('studySidebar').hidden = !open;
    $('sidebarBackdrop').hidden = !open;
    $('outlineToggle').disabled = !ready;
    $('outlineToggle').textContent = open ? '收起目录' : '目录';
    document.querySelector('.reader-main').classList.toggle('sidebar-open', open);
    $('outlineToggle').setAttribute('aria-label', open ? '收起目录' : '展开目录');
    $('outlineToggle').setAttribute('aria-expanded', String(open));
    $('outlineToggle').title = open ? '收起侧栏，继续阅读正文' : '查看教学大纲或教材目录';
    $('teachingPanel').hidden = tab !== 'teaching';
    $('textbookPanel').hidden = tab !== 'textbook';
    $('sidebarProgress').hidden = tab !== 'teaching';
    for (const mode of ['teaching', 'textbook']) {
      const button = $(mode + 'Tab');
      button.setAttribute('aria-selected', String(tab === mode));
      button.tabIndex = tab === mode ? 0 : -1;
    }
    $('sidebarSearchLabel').textContent = tab === 'teaching' ? '搜索教学大纲' : '搜索教材目录';
    $('sidebarSearch').placeholder = tab === 'teaching' ? '主题、编号或学习目标' : '章节或疾病名称';
    document.querySelectorAll('[data-page]').forEach(button => { button.disabled = !ready || !validPage(button.dataset.page); });
    filter();
  }

  function closeNative() {
    if (app.viewsManager?.isOpen) {
      suppressNative = true;
      try { app.viewsManager.close(); } finally { suppressNative = false; }
    }
  }
  function saveView() {
    try {
      localStorage.setItem(visibilityKey, open ? 'open' : 'closed');
      localStorage.setItem(tabKey, tab);
    } catch {}
  }
  function setOpen(value, focus = false) {
    open = value;
    if (open) closeNative();
    saveView(); render();
    if (focus) (open ? $(tab + 'Tab') : $('outlineToggle')).focus({ preventScroll: true });
  }
  function setTab(mode, focus = false) {
    tab = mode;
    $('sidebarSearch').value = '';
    saveView(); render();
    if (focus) $(tab + 'Tab').focus({ preventScroll: true });
  }
  function selectTopic(id, scroll = false) {
    document.querySelectorAll('.study-topic').forEach(item => {
      const selected = item.dataset.topic === id;
      item.classList.toggle('is-current', selected);
      if (selected) {
        item.open = true;
        if (scroll && open && tab === 'teaching' && !item.hidden) item.scrollIntoView({ block: 'nearest' });
      }
    });
  }
  function pageChanged(page) {
    let selected = -1, closest = -1;
    book.outline.forEach((entry, index) => {
      if (entry.page <= page && entry.page >= closest) { selected = index; closest = entry.page; }
    });
    document.querySelectorAll('.toc-entry').forEach(item => {
      item.setAttribute('aria-current', Number(item.dataset.outlineIndex) === selected ? 'page' : 'false');
    });
  }

  $('outlineToggle').addEventListener('click', () => { if (ready) setOpen(!open, true); });
  $('sidebarClose').addEventListener('click', () => setOpen(false, true));
  $('sidebarBackdrop').addEventListener('click', () => setOpen(false, true));
  for (const mode of ['teaching', 'textbook']) {
    $(mode + 'Tab').addEventListener('click', () => setTab(mode));
    $(mode + 'Tab').addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      setTab(event.key === 'Home' ? 'teaching' : event.key === 'End' ? 'textbook' : tab === 'teaching' ? 'textbook' : 'teaching', true);
    });
  }
  $('studySidebar').addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
  });
  $('sidebarSearch').addEventListener('input', filter);
  for (const [id, value] of [['expandToc', true], ['collapseToc', false]]) {
    $(id).addEventListener('click', () => {
      $('sidebarSearch').value = ''; filter();
      document.querySelectorAll('.toc-branch').forEach(branch => { branch.open = value; });
    });
  }
  $('studySidebar').addEventListener('click', event => {
    const button = event.target.closest('button[data-page]');
    if (!button || !ready || button.disabled || !validPage(button.dataset.page)) return;
    event.preventDefault();
    navigate(Number(button.dataset.page));
    if (button.dataset.jumpTopic) {
      $('courseSelect').value = button.dataset.jumpTopic;
      selectTopic(button.dataset.jumpTopic);
    }
  });
  $('teachingTopics').addEventListener('change', event => {
    const input = event.target.closest('input[data-goal]');
    if (!input) return; return;
    const next = readProgress();
    next[input.dataset.goal] = input.checked;
    progress = next;
    try {
      localStorage.setItem(progressKey, JSON.stringify(progress));
      $('sidebarNotice').textContent = '';
    } catch { $('sidebarNotice').textContent = '当前浏览器无法保存进度，本次勾选仅在此页面有效。'; }
    updateProgress();
  });
  $('courseSelect').addEventListener('change', event => selectTopic(event.target.value, true));
  window.addEventListener('storage', event => {
    if (event.key === progressKey) { progress = {}; updateProgress(); }
  });
  window.addEventListener('focus', () => { progress = {}; updateProgress(); });
  app.eventBus.on('pagechanging', event => pageChanged(event.pageNumber));
  app.eventBus.on('documentinit', () => queueMicrotask(() => {
    ready = true; closeNative(); render(); pageChanged(app.pdfViewer.currentPageNumber);
    let ancestor = document.querySelector('.toc-entry[aria-current="page"]')?.parentElement;
    while (ancestor && ancestor !== $('textbookTopics')) {
      if (ancestor.matches('.toc-branch')) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
  }));
  app.eventBus.on('sidebarviewchanged', () => {
    if (ready && !suppressNative && app.viewsManager?.isOpen && open) setOpen(false);
  });
  updateProgress(); render();
  if (topicId) selectTopic(topicId);
};
