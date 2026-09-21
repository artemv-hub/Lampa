(function () {
  'use strict';

  let manifest = {
    type: 'interface',
    version: '5.0.0',
    name: 'UI Badge',
    component: 'ui_badge'
  };
  Lampa.Manifest.plugins = manifest;

  const LEVEL = {
    vgood: 'vgood',
    good: 'good',
    normal: 'normal',
    bad: 'bad',
    vbad: 'vbad'
  };

  const style = document.createElement('style');
  const styleBadge = `
    position: absolute;
    font-size: 1em;
    font-weight: 800;
    padding: 0.25em 0.45em;
    color: #FFF;
    background: rgba(0, 0, 0, 0.8);
    line-height: 1;
    white-space: nowrap;
  `;
  style.textContent = `
    .card__type     { ${styleBadge} top: 0em; left: 0em; border-radius: 0.75em 0 0.75em 0; }
    .card__vote     { ${styleBadge} top: 0em; bottom: unset; right: 0em; border-radius: 0 0.75em 0 0.75em; }
    .card__age      { ${styleBadge} bottom: 0em; left: 0em; border-radius: 0 0.75em 0 0.75em; }
    .card__status   { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.75em 0 0.75em 0; }
    .card__duration { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.75em 0 0.75em 0; }
    .card__quality  { ${styleBadge} bottom: 2em; left: 0em;	right: unset; border-radius: 0 0.75em 0.75em 0; }
    .card__watched  { ${styleBadge} bottom: 2em; right: 0em; border-radius: 0.75em 0 0 0.75em; }
    .card__icons    { left: 0em; right: unset; top: 50%; transform: translateY(-50%); }
    .card__icons-inner { flex-direction: column; }
    .card__marker { top: 2em; bottom: unset; left: 50%; transform: translateX(-50%); }

    [data-level="vgood"]  { background: rgba(52, 152, 219, 0.8); }
    [data-level="good"]   { background: rgba(46, 204, 113, 0.8); }
    [data-level="normal"] { background: rgba(241, 196, 15, 0.8); }
    [data-level="bad"]    { background: rgba(230, 126, 34, 0.8); }
    [data-level="vbad"]   { background: rgba(231, 76, 60, 0.8); }
  `;
  document.head.appendChild(style);

  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const CACHE_EMPTY_TTL = 6 * 60 * 60 * 1000;
  const CACHE_FAIL_TTL = 60 * 1000;
  const CACHE_TV = 'card_overlay_tv';
  const CACHE_MOVIE = 'card_overlay_movie';
  const CACHE_QUALITY = 'card_overlay_quality';
  const QUALITY_API = 'jr.maxvol.pro';
  const SCAN_DELAYS = [0, 150, 400, 900];

  const qualityLevels = {
    '4K': LEVEL.vgood,
    'FHD': LEVEL.good,
    'HD': LEVEL.normal,
    'SD': LEVEL.bad,
    'TS': LEVEL.vbad
  };

  const statusLevels = {
    ended: LEVEL.good,
    canceled: LEVEL.bad
  };

  const voteLevels = [
    { level: LEVEL.vgood, min: 9 },
    { level: LEVEL.good, min: 7 },
    { level: LEVEL.normal, min: 6 },
    { level: LEVEL.bad, min: 4 },
    { level: LEVEL.vbad, min: 0 }
  ];

  const pgLevels = [
    { level: LEVEL.vbad, min: 18 },
    { level: LEVEL.bad, min: 16 },
    { level: LEVEL.normal, min: 12 },
    { level: LEVEL.good, min: 6 },
    { level: LEVEL.vgood, min: 0 }
  ];

  const timers = {};
  function later(fn, delay, key) {
    const id = key || ('t' + Date.now() + Math.random());
    if (timers[id]) clearTimeout(timers[id]);
    timers[id] = setTimeout(() => {
      delete timers[id];
      try { fn(); } catch (_) { }
    }, delay || 0);
    return id;
  }

  const requestPool = [];
  function getRequest() { return requestPool.pop() || new Lampa.Reguest(); }
  function releaseRequest(req) { try { req.clear(); } catch (_) { } if (requestPool.length < 5) requestPool.push(req); }

  const requestQueue = { tasks: [], processing: false, interval: 200, batch: 2 };
  function processQueue() {
    if (requestQueue.processing || !requestQueue.tasks.length) return;
    requestQueue.processing = true;
    const batch = requestQueue.tasks.splice(0, requestQueue.batch);
    for (let i = 0; i < batch.length; i++) {
      try { batch[i](); } catch (_) { }
    }
    setTimeout(() => { requestQueue.processing = false; processQueue(); }, requestQueue.interval);
  }
  function addToQueue(task) {
    requestQueue.tasks.push(task);
    while (requestQueue.tasks.length > 100) requestQueue.tasks.shift();
    processQueue();
  }

  const cacheMem = {};
  const saveTimers = {};
  function loadCache(key) {
    if (cacheMem[key]) return cacheMem[key];
    let stored = null;
    try { stored = Lampa.Storage.get(key, null); } catch (_) { }
    if (!stored || typeof stored !== 'object') stored = {};
    const now = Date.now();
    let removed = false;
    for (const k in stored) {
      const entry = stored[k];
      if (!entry || !entry.timestamp) { delete stored[k]; removed = true; continue; }
      const ttl = entry._failed ? CACHE_FAIL_TTL : (entry._empty ? CACHE_EMPTY_TTL : CACHE_TTL);
      if (now - entry.timestamp > ttl) { delete stored[k]; removed = true; }
    }
    cacheMem[key] = stored;
    if (removed) saveCacheDebounced(key);
    return cacheMem[key];
  }
  function saveCacheDebounced(key) {
    if (saveTimers[key]) return;
    saveTimers[key] = setTimeout(() => {
      saveTimers[key] = 0;
      try { Lampa.Storage.set(key, cacheMem[key]); } catch (_) { }
    }, 800);
  }
  function getCache(key, id) { return loadCache(key)[id] || null; }
  function setCache(key, id, value) {
    value.timestamp = Date.now();
    loadCache(key)[id] = value;
    saveCacheDebounced(key);
    return value;
  }

  const pendingTmdb = {};
  const attemptsTmdb = {};
  function buildTmdbUrl(type, id) {
    try {
      if (Lampa.TMDB && Lampa.TMDB.api && Lampa.TMDB.key) return Lampa.TMDB.api(type + '/' + id + '?api_key=' + Lampa.TMDB.key());
    } catch (_) { }
    return '';
  }
  function fetchTmdb(type, id, cacheKey, callback) {
    const idKey = String(id);
    const cached = getCache(cacheKey, idKey);
    if (cached) { callback(cached); return; }
    if (pendingTmdb[cacheKey + idKey]) { pendingTmdb[cacheKey + idKey].push(callback); return; }
    const attemptKey = cacheKey + idKey;
    if (attemptsTmdb[attemptKey] && Date.now() - attemptsTmdb[attemptKey] < CACHE_TTL) { callback(null); return; }
    pendingTmdb[attemptKey] = [callback];

    function complete(result) {
      const cbs = pendingTmdb[attemptKey] || [];
      delete pendingTmdb[attemptKey];
      attemptsTmdb[attemptKey] = Date.now();
      for (let i = 0; i < cbs.length; i++) { try { cbs[i](result); } catch (_) { } }
    }

    addToQueue(() => {
      const url = buildTmdbUrl(type, id);
      if (!url) { complete(null); return; }
      const req = getRequest();
      req.timeout(7000);
      req.silent(url,
        (data) => {
          releaseRequest(req);
          if (!data || typeof data !== 'object') { complete(null); return; }
          complete(setCache(cacheKey, idKey, data));
        },
        () => {
          releaseRequest(req);
          complete(setCache(cacheKey, idKey, { _failed: true }));
        },
        false
      );
    });
  }

  const pendingQuality = {};
  function makeItem(data) {
    return {
      id: data.id,
      type: (data.original_name || data.first_air_date) ? 'tv' : 'movie',
      title: data.title || data.name || '',
      original_title: data.original_title || data.original_name || '',
      release_date: data.release_date || data.first_air_date || ''
    };
  }
  function qualityKey(item) { return item.type + ':' + item.id; }
  function getQualityCache(key) { return getCache(CACHE_QUALITY, key); }
  function setQualityCache(key, quality) {
    return setCache(CACHE_QUALITY, key, { quality: quality || null, _empty: !quality });
  }
  function convertQuality(res) {
    if (res === 2160) return '4K';
    if (res === 1080) return 'FHD';
    if (res === 720) return 'HD';
    if (res === 'TS') return 'TS';
    return res >= 720 ? 'HD' : 'SD';
  }
  const forbidden = ['camrip', 'камрип', 'ts', 'telecine', 'telesync', 'telesynch', 'upscale', 'tc', 'тс'];
  const forbiddenRe = forbidden.map(t => new RegExp('\\b' + t + '\\b', 'i'));
  function detectLowQuality(title) { return title ? forbiddenRe.some(p => p.test(title.toLowerCase())) : false; }

  function fetchJacRed(item, callback) {
    const HIGHEST = 2160;
    let found = false;
    const year = (item.release_date || '').substring(0, 4);
    if (!year || isNaN(year)) { callback(null); return; }
    const uid = Lampa.Storage.get('lampac_unic_id', '');
    let url = 'https://' + QUALITY_API + '/api/v2.0/indexers/all/results?apikey=&uid=' + uid + '&year=' + year;
    let hasTitle = false;
    if (item.title && /[a-zа-яё0-9]/i.test(item.title)) { url += '&title=' + encodeURIComponent(item.title.trim()); hasTitle = true; }
    if (item.original_title && /[a-zа-яё]/i.test(item.original_title)) { url += '&title_original=' + encodeURIComponent(item.original_title.trim()); hasTitle = true; }
    if (!hasTitle) { callback(null); return; }

    const req = getRequest();
    req.timeout(15000);
    req.silent(url,
      (resp) => {
        releaseRequest(req);
        if (!resp) { callback(null); return; }
        try {
          const data = typeof resp === 'string' ? JSON.parse(resp) : resp;
          const list = data.Results || [];
          if (!Array.isArray(list) || !list.length) { callback(null); return; }
          let bestRes = -1;
          let bestRelease = null;
          const ty = parseInt(year, 10);
          const py = ty - 1;
          for (let i = 0; i < list.length; i++) {
            const r = list[i];
            const info = r.info || r.Info || {};
            const res = info.quality;
            const yearVal = info.relased;
            const title = r.Title || '';
            if (typeof res !== 'number' || !res) continue;
            const y = parseInt(yearVal, 10);
            if (isNaN(y) || y < 1900) continue;
            if (y !== ty && y !== py) continue;
            if (detectLowQuality(title)) { found = true; continue; }
            if (res === HIGHEST) { callback({ quality: '4K', title }); return; }
            if (res > bestRes) { bestRes = res; bestRelease = { quality: res, title }; }
          }
          if (bestRelease) callback({ quality: convertQuality(bestRelease.quality), title: bestRelease.title });
          else if (found) callback({ quality: 'TS' });
          else callback(null);
        } catch (_) { callback(null); }
      },
      () => { releaseRequest(req); callback(null); }
    );
  }
  function requestQuality(item, key, callback) {
    if (pendingQuality[key]) { pendingQuality[key].push(callback); return; }
    pendingQuality[key] = [callback];
    fetchJacRed(item, (r) => {
      const q = r && r.quality && r.quality !== 'NO' ? r.quality : null;
      setQualityCache(key, q);
      const cbs = pendingQuality[key] || [];
      delete pendingQuality[key];
      for (let i = 0; i < cbs.length; i++) { try { cbs[i](q); } catch (_) { } }
    });
  }
  function getQuality(card, callback) {
    const data = card.card_data;
    if (!data || !data.id) { callback(null); return; }
    const item = makeItem(data);
    const key = qualityKey(item);
    const cached = getQualityCache(key);
    if (cached) { callback(cached.quality); return; }
    requestQuality(item, key, callback);
  }

  function setBadge(card, cls, text, level) {
    const view = card.querySelector('.card__view');
    if (!view) return;
    let el = view.querySelector('.' + cls);
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.className = cls;
      view.appendChild(el);
    }
    el.innerText = text;
    if (level) el.setAttribute('data-level', level);
    else el.removeAttribute('data-level');
  }
  function formatHM(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function moveAge(card) {
    const age = card.querySelector('.card__age');
    const view = card.querySelector('.card__view');
    if (age && view && age.parentNode !== view) view.appendChild(age);
  }
  function markLevel(el, rules, value, attr) {
    if (isNaN(value)) return;
    const rule = rules.find(r => value >= r.min);
    if (rule) el.setAttribute(attr, rule.level);
  }
  function markVote(el) {
    markLevel(el, voteLevels, parseFloat(el.textContent), 'data-level');
  }
  function markPG(el) {
    const m = (el.textContent.match(/\d+/) || [])[0];
    markLevel(el, pgLevels, parseInt(m, 10), 'data-level');
  }

  function renderType(card, isTV) {
    setBadge(card, 'card__type', isTV ? 'Сериал' : 'Фильм', isTV ? LEVEL.vgood : LEVEL.good);
  }
  function renderStatus(card, info) {
    const status = info && info.status;
    const last = info && info.last_episode_to_air;
    if (status === 'Ended' || status === 'Canceled') {
      setBadge(card, 'card__status',
        status === 'Canceled' ? 'Отменено' : 'Завершено',
        statusLevels[status === 'Canceled' ? 'canceled' : 'ended']);
    } else if (last && last.season_number && last.episode_number) {
      setBadge(card, 'card__status', 'S' + last.season_number + ':E' + last.episode_number, LEVEL.normal);
    } else {
      setBadge(card, 'card__status', null);
    }
  }
  function renderDuration(card, info) {
    const data = card.card_data;
    if (!data) return;
    let progress = null;
    let total = null;
    if (data.original_title) {
      const t = Lampa.Timeline.view(Lampa.Utils.hash(data.original_title));
      if (t && t.time > 0 && t.duration > 0) {
        progress = formatHM(t.time);
        total = formatHM(t.duration);
      }
    }
    if (!total) {
      const runtime = info && info.runtime;
      if (!runtime) { setBadge(card, 'card__duration', null); return; }
      total = formatHM(runtime * 60);
    }
    setBadge(card, 'card__duration', progress ? progress + '/' + total : total, LEVEL.normal);
  }
  function renderQuality(card, quality) {
    setBadge(card, 'card__quality', quality, quality ? qualityLevels[quality] : null);
  }
  function getWatched(card, info) {
    const data = card.card_data;
    if (!data || !data.original_name) return null;
    const last = info && info.last_episode_to_air;
    if (!last) return null;
    const name = data.original_name;
    const seasonMap = {};
    (info.seasons || []).forEach(s => { if (s.season_number > 0) seasonMap[s.season_number] = s.episode_count; });
    for (let season = last.season_number; season >= 1; season--) {
      const maxEp = season === last.season_number ? last.episode_number : (seasonMap[season] || 0);
      for (let episode = maxEp; episode >= 1; episode--) {
        const hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, name].join(''));
        const t = Lampa.Timeline.view(hash);
        if (t.time > 0 || t.percent > 0) return 'S' + season + ':E' + episode;
      }
    }
    return null;
  }
  function renderWatched(card, info) {
    setBadge(card, 'card__watched', getWatched(card, info), LEVEL.normal);
  }

  function processCard(card) {
    if (!card || !card.card_data) return;
    const data = card.card_data;
    if (!data.id || (!data.original_name && !data.original_title)) return;
    const isTV = !!data.original_name;
    renderType(card, isTV);
    moveAge(card);
    if (isTV) {
      fetchTmdb('tv', data.id, CACHE_TV, (info) => {
        if (!card.parentNode) return;
        renderStatus(card, info);
        renderWatched(card, info);
      });
    } else {
      fetchTmdb('movie', data.id, CACHE_MOVIE, (info) => {
        if (!card.parentNode) return;
        renderDuration(card, info);
      });
    }
    getQuality(card, (q) => {
      if (!card.parentNode) return;
      renderQuality(card, q);
    });
  }

  function loadDetailQuality(movie, render) {
    if (!render) return;
    const item = makeItem(movie);
    const key = qualityKey(item);
    function apply(q) {
      const line = $(render).find('.full-start-new__rate-line');
      if (!line.length) return;
      let el = line.find('.qualview-quality');
      if (!el.length) {
        el = $('<div class="full-start__status qualview-quality"></div>');
        line.append(el);
      }
      if (q) {
        el.text(q)
          .attr('data-level', qualityLevels[q] || LEVEL.normal)
          .css({ padding: '0.2em 0.4em', borderRadius: '0.3em', fontWeight: 'bold' });
      } else {
        el.remove();
      }
    }
    const cached = getQualityCache(key);
    if (cached) { apply(cached.quality); return; }
    apply('...');
    requestQuality(item, key, apply);
  }

  function init() {
    if (window.__card_overlay_v5_initialized__) return;
    window.__card_overlay_v5_initialized__ = true;

    let observer = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const card = entries[i].target;
          if (!card) continue;
          if (entries[i].isIntersecting && card.card_data && card.card_data.id) {
            processCard(card);
            const vote = card.querySelector('.card__vote');
            if (vote) markVote(vote);
          }
        }
      }, { root: null, rootMargin: '250px 0px 250px 0px', threshold: 0.01 });
    }

    function observe(card) {
      if (!observer || !card || card.nodeType !== 1) return;
      if (card.getAttribute('data-observed') === '1') return;
      card.setAttribute('data-observed', '1');
      try { observer.observe(card); } catch (_) { }
    }
    function scan(target) {
      if (!target || !target.querySelectorAll) return;
      const cards = target.querySelectorAll('.card');
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        observe(card);
        if (card.card_data && card.card_data.id) {
          Lampa.Storage.set('activity', { movie: card.card_data, card: card.card_data });
          Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });
          processCard(card);
          const vote = card.querySelector('.card__vote');
          if (vote) markVote(vote);
        }
      }
    }
    function scanActive() {
      let render = null;
      try {
        const a = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
        render = a && a.activity && a.activity.render ? a.activity.render() : null;
        if (render && render.nodeType !== 1 && render.length) render = render[0];
      } catch (_) { }
      scan(render && render.nodeType === 1 ? render : document.body);
    }

    Lampa.Listener.follow('activity', (e) => {
      if (e.type === 'destroy' || e.type === 'archive') return;
      SCAN_DELAYS.forEach(d => later(scanActive, d, 'scan-' + d));
    });
    Lampa.Listener.follow('line', (e) => {
      if (!e || (e.type !== 'append' && e.type !== 'create' && e.type !== 'visible')) return;
      let body = null;
      if (e.body) {
        if (e.body.nodeType === 1) body = e.body;
        else if (e.body.length && e.body[0] && e.body[0].nodeType === 1) body = e.body[0];
      }
      later(() => body ? scan(body) : scanActive(), 30, 'scan-line');
    });
    Lampa.Listener.follow('card', (event) => {
      if (event.type === 'build' && event.object && event.object.card) {
        observe(event.object.card);
        processCard(event.object.card);
      }
    });
    Lampa.Listener.follow('full', (event) => {
      if (event.type === 'complite' && event.data && event.data.movie) {
        const r = event.object && event.object.activity && event.object.activity.render
          ? event.object.activity.render() : null;
        if (!r) return;
        loadDetailQuality(event.data.movie, r);
        $(r).find('.full-start__pg').each(function () { markPG(this); });
        $(r).find('.full-start__rate').each(function () { markVote(this); });
      }
    });

    window.addEventListener('scroll', () => later(scanActive, 120, 'scan-scroll'), { passive: true });
    window.addEventListener('touchend', () => later(scanActive, 200, 'scan-touch'), { passive: true });
    window.addEventListener('keydown', () => later(scanActive, 200, 'scan-key'), { passive: true });
    window.addEventListener('resize', () => later(scanActive, 150, 'scan-resize'), { passive: true });
    window.addEventListener('orientationchange', () => later(scanActive, 150, 'scan-orient'), { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) later(scanActive, 0, 'scan-visible'); });

    later(scanActive, 200, 'boot-200');
    later(scanActive, 600, 'boot-600');
  }

  if (window.appready) init();
  else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();