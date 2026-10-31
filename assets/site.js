'use strict';
(() => {
  let selectedStatus = 'All';
  let selectedView = 'index';
  let publicationData;
  let citationURL;
  let citationOpener;
  let toastTimer;
  const $ = selector => document.querySelector(selector);
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function closeMenu() {
    $('.menu-toggle')?.setAttribute('aria-expanded', 'false');
    $('#site-nav')?.classList.remove('open');
  }
  function toast(message) {
    const element = $('.toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add('visible');
    toastTimer = setTimeout(() => element.classList.remove('visible'), 2600);
  }
  function applyPublicationView() {
    const reading = selectedView === 'reading';
    $('#publications')?.classList.toggle('is-reading', reading);
    document.querySelectorAll('#publications .abstract-details').forEach(details => {
      details.open = reading;
    });
    document.querySelectorAll('.view-button').forEach(button => {
      const active = button.dataset.view === selectedView;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function updatePublicationURL(query, topic) {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (topic !== 'All') params.set('area', topic);
    if (selectedStatus !== 'All') params.set('status', selectedStatus);
    if (selectedView === 'reading') params.set('view', 'reading');
    const suffix = params.size ? '?' + params.toString() : '';
    if (window.PALCOUX_PREVIEW) {
      const route = new URL(location.hash.startsWith('#!') ? location.hash.slice(2) : '/works/', 'https://sebastienpalcoux.github.io');
      window.PALCOUX_ROUTE_QUERY = suffix;
      // Some file-preview hosts disallow history writes; the controls still work there.
      try { history.replaceState(null, '', '#!' + route.pathname + suffix + route.hash); }
      catch (_) { /* Preserve the current page instead of triggering a hash rerender. */ }
    } else if (location.protocol !== 'file:') {
      history.replaceState(null, '', location.pathname + suffix + location.hash);
    }
  }
  function filterPublications(updateURL = true) {
    const rows = document.querySelectorAll('#publications .publication');
    if (!rows.length) return;
    const query = $('#pub-search')?.value.trim() || '';
    const selectedTopic = $('#topic-filter')?.value || 'All';
    const words = normalize(query).split(/\s+/).filter(Boolean);
    let count = 0;
    rows.forEach(row => {
      const matches = (selectedStatus === 'All' || row.dataset.status === selectedStatus)
        && (selectedTopic === 'All' || row.dataset.topic === selectedTopic)
        && words.every(word => normalize(row.dataset.search).includes(word));
      row.hidden = !matches;
      if (matches) count++;
    });
    document.querySelectorAll('#publications .publication-year').forEach(group => {
      const visibleCount = Array.from(group.querySelectorAll('.publication')).filter(row => !row.hidden).length;
      group.hidden = visibleCount === 0;
      const counter = group.querySelector('.year-count');
      if (counter) counter.textContent = `${visibleCount} ${visibleCount === 1 ? 'paper' : 'papers'}`;
      document.querySelectorAll('.publication-index a[data-year]').forEach(anchor => {
        if (anchor.dataset.year === group.dataset.year) anchor.hidden = group.hidden;
      });
    });
    $('.results-count').textContent = `${count} ${count === 1 ? 'paper' : 'papers'}`;
    $('#no-results').hidden = count !== 0;
    $('#reset-filters').hidden = !query && selectedStatus === 'All' && selectedTopic === 'All';
    document.querySelectorAll('.filter-tab').forEach(tab => {
      const active = tab.dataset.filter === selectedStatus;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    if (updateURL) updatePublicationURL(query, selectedTopic);
  }
  function init() {
    document.documentElement.classList.add('js');
    selectedStatus = 'All';
    selectedView = 'index';
    closeMenu();
    const params = new URLSearchParams(window.PALCOUX_PREVIEW ? (window.PALCOUX_ROUTE_QUERY || '') : location.search);
    if ($('#pub-search')) {
      $('#pub-search').value = params.get('q') || '';
      const value = params.get('area') || 'All';
      $('#topic-filter').value = Array.from($('#topic-filter').options).some(option => option.value === value) ? value : 'All';
      const status = params.get('status');
      if (['Published','Preprint'].includes(status)) selectedStatus = status;
      if (params.get('view') === 'reading') selectedView = 'reading';
      applyPublicationView();
      filterPublications(false);
    }
    if ($('#fusion-power')) {
      $('.math-demo-controls').hidden = false;
      updateFusion();
    }
  }
  async function papers() {
    if (window.PALCOUX_PUBLICATIONS) return window.PALCOUX_PUBLICATIONS;
    if (!publicationData) {
      publicationData = fetch('/assets/publications.json').then(response => {
        if (!response.ok) throw new Error('Citation data unavailable');
        return response.json();
      }).catch(error => { publicationData = undefined; throw error; });
    }
    return publicationData;
  }
  async function showCitation(button) {
    button.disabled = true;
    try {
      const record = (await papers()).find(item => item.arxiv === button.dataset.arxiv);
      if (!record?.bibtex) throw new Error('Citation unavailable');
      const dialog = $('.citation-dialog');
      $('.citation-paper-title').textContent = record.title;
      $('.citation-text').value = record.bibtex;
      if (citationURL) URL.revokeObjectURL(citationURL);
      citationURL = URL.createObjectURL(new Blob([record.bibtex + '\n'], {type:'application/x-bibtex;charset=utf-8'}));
      $('#download-citation').href = citationURL;
      $('#download-citation').download = 'Palcoux-' + record.arxiv + '.bib';
      citationOpener = button;
      dialog.showModal();
      $('#copy-citation').focus();
    } catch (error) {
      toast('The complete BibTeX file is available on the Publications page.');
    } finally { button.disabled = false; }
  }
  function fusionPower(n) {
    let a = 1, b = 0;
    for (let i=0; i<n; i++) [a,b] = [b,a+b];
    return [a,b];
  }
  function updateFusion() {
    const n = Number($('#fusion-power').value);
    const [a,b] = fusionPower(n);
    $('#power-value').value = String(n);
    const superscript = String(n).split('').map(digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]).join('');
    const terms = [];
    if (a) terms.push(a === 1 ? '1' : `${a} · 1`);
    if (b) terms.push(b === 1 ? 'τ' : `${b} · τ`);
    $('#fusion-result').value = `τ${superscript} = ${terms.join(' + ')}`;
    $('#fusion-result').setAttribute('aria-label', `${n} tensor copies of tau decompose as ${a} copies of the unit and ${b} copies of tau`);
  }
  document.addEventListener('click', async event => {
    const menu = event.target.closest('.menu-toggle');
    if (menu) {
      const expanded = menu.getAttribute('aria-expanded') === 'true';
      menu.setAttribute('aria-expanded', String(!expanded));
      $('#site-nav').classList.toggle('open', !expanded);
    } else if (!event.target.closest('#site-nav')) {
      closeMenu();
    }
    if (event.target.closest('#site-nav a')) closeMenu();
    const filter = event.target.closest('.filter-tab');
    if (filter) { selectedStatus = filter.dataset.filter; filterPublications(); }
    const view = event.target.closest('.view-button');
    if (view && ['index', 'reading'].includes(view.dataset.view)) {
      selectedView = view.dataset.view;
      applyPublicationView();
      filterPublications();
    }
    if (event.target.closest('#reset-filters')) {
      selectedStatus = 'All'; $('#pub-search').value = ''; $('#topic-filter').value = 'All';
      filterPublications(); $('#pub-search').focus();
    }
    const citation = event.target.closest('.cite-button');
    if (citation) await showCitation(citation);
    if (event.target.closest('#copy-citation')) {
      try { await navigator.clipboard.writeText($('.citation-text').value); toast('BibTeX citation copied'); }
      catch (error) { $('.citation-text').focus(); $('.citation-text').select(); toast('Citation selected. Copy it or download the .bib file.'); }
    }
    if (event.target.closest('.print-button')) window.print();
  });
  document.addEventListener('input', event => {
    if (event.target.matches('#pub-search')) filterPublications();
    if (event.target.matches('#fusion-power')) updateFusion();
  });
  document.addEventListener('change', event => { if (event.target.matches('#topic-filter')) filterPublications(); });
  document.addEventListener('close', event => {
    if (event.target.matches('.citation-dialog') && citationOpener?.isConnected) citationOpener.focus();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && $('#site-nav')?.classList.contains('open')) { closeMenu(); $('.menu-toggle').focus(); }
  });
  window.addEventListener('popstate', init);
  window.PalcouxSite = {init, fusionPower};
  init();
})();
