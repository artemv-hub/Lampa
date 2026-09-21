(function () {
  'use strict';

  let manifest = {
    type: 'interface',
    version: '5.0.5',
    name: 'UI Badge',
    component: 'ui_badge'
  };
  Lampa.Manifest.plugins = manifest;

  // Уровни — единая палитра
  const LEVEL = {
    vgood: 'vgood',
    good: 'good',
    normal: 'normal',
    bad: 'bad',
    vbad: 'vbad'
  };

  // Соответствия
  const qualityMap = {
    '4K': LEVEL.vgood,
    'FHD': LEVEL.good,
    'HD': LEVEL.normal,
    'SD': LEVEL.bad,
    'TS': LEVEL.vbad
  };
  const statusMap = {
    ended: LEVEL.vgood,
    ongoing: LEVEL.good,
    canceled: LEVEL.normal
  };
  const voteMap = [
    { level: LEVEL.vgood, min: 9 },
    { level: LEVEL.good, min: 7 },
    { level: LEVEL.normal, min: 6 },
    { level: LEVEL.bad, min: 4 },
    { level: LEVEL.vbad, min: 0 }
  ];
  const pgMap = [
    { level: LEVEL.vbad, min: 18 },
    { level: LEVEL.bad, min: 16 },
    { level: LEVEL.normal, min: 12 },
    { level: LEVEL.good, min: 6 },
    { level: LEVEL.vgood, min: 0 }
  ];

  // Стили
  const style = document.createElement('style');
  const styleBadge = `
    position: absolute;
    font-size: 1.2em;
    font-weight: 800;
    padding: 0.2em 0.4em;
    color: #000;
    background: rgba(255, 255, 255, 0.8);
    line-height: 1;
    white-space: nowrap;
  `;
  style.textContent = `
    .card__type     { ${styleBadge} top: 0em; left: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__vote     { ${styleBadge} top: 0em; bottom: unset; right: 0em; border-radius: 0 0.8em 0 0.8em; }
    .card__age      { ${styleBadge} bottom: 0em; left: 0em; border-radius: 0 0.8em 0 0.8em; }
    .card__status   { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__duration { ${styleBadge} bottom: 0em; right: 0em; border-radius: 0.8em 0 0.8em 0; }
    .card__quality  { ${styleBadge} bottom: 2em; left: 0em; right: unset; border-radius: 0 0.8em 0.8em 0; }
    .card__watched  { ${styleBadge} bottom: 2em; right: 0em; border-radius: 0.8em 0 0 0.8em; }
    .card__icons    { left: 0em; right: unset; top: 50%; transform: translateY(-50%); }
    .card__icons-inner { flex-direction: column; }
    .card__marker   { top: 2em; bottom: unset; left: 50%; transform: translateX(-50%); }

    [data-level="vgood"]  { background: rgba(52, 152, 219, 0.8) !important; }
    [data-level="good"]   { background: rgba(46, 204, 113, 0.8) !important; }
    [data-level="normal"] { background: rgba(241, 196, 15, 0.8) !important; }
    [data-level="bad"]    { background: rgba(230, 126, 34, 0.8) !important; }
    [data-level="vbad"]   { background: rgba(231, 76, 60, 0.8) !important; }
  `;
  document.head.appendChild(style);

  // Кэш
  const CACHE_TTL = 24 * 60 * 60 * 1000;
  const CACHE_EMPTY_TTL = 6 * 60 * 60 * 1000;
  const CACHE_FAIL_TTL = 60 * 1000;
  const STORE_TV = 'co_tv';
  const STORE_MOVIE = 'co_movie';
  const STORE_QUALITY = 'co_quality';
  const QUALITY_API = 'jr.maxvol.pro';

  const cacheData = {};
  const cacheTimers = {};

  function getStore(name) {
    if (cacheData[name]) return cacheData[name];
    let stored = null;
    try { stored = Lampa.Storage.get(name, null); } catch (_) { }
    if (!stored || typeof stored !== 'object') stored = {};
    const now = Date.now();
    let changed = false;
    for (const key in stored) {
      const entry = stored[key];
      if (!entry || !entry.timestamp) { delete stored[key]; changed = true; continue; }
      const ttl = entry.failed ? CACHE_FAIL_TTL : (entry.empty ? CACHE_EMPTY_TTL : CACHE_TTL);
      if (now - entry.timestamp > ttl) { delete stored[key]; changed = true; }
    }
    cacheData[name] = stored;
    if (changed) saveStore(name);
    return cacheData[name];
  }
  function saveStore(name) {
    if (cacheTimers[name]) return;
    cacheTimers[name] = setTimeout(() => {
      cacheTimers[name] = 0;
      try { Lampa.Storage.set(name, cacheData[name]); } catch (_) { }
    }, 800);
  }
  function getCache(name, id) { return getStore(name)[id] || null; }
  function setCache(name, id, value) {
    value.timestamp = Date.now();
    getStore(name)[id] = value;
    saveStore(name);
    return value;
  }

  // TMDB
  function getTmdb(type, id, store, callback) {
    const idKey = String(id);
    const cached = getCache(store, idKey);
    if (cached) { callback(cached); return; }

    let url = '';
    try {
      if (Lampa.TMDB && Lampa.TMDB.api && Lampa.TMDB.key) {
        url = Lampa.TMDB.api(type + '/' + id + '?api_key=' + Lampa.TMDB.key());
      }
    } catch (_) { }
    if (!url) { callback(null); return; }

    const network = new Lampa.Reguest();
    network.timeout(7000);
    network.silent(url,
      (data) => {
        try { network.clear(); } catch (_) { }
        if (!data || typeof data !== 'object') { callback(null); return; }
        callback(setCache(store, idKey, data));
      },
      () => {
        try { network.clear(); } catch (_) { }
        callback(setCache(store, idKey, { failed: true }));
      },
      false
    );
  }

  // Качество
  function getVideo(data) {
    return {
      id: data.id,
      type: data.original_name || data.first_air_date ? 'tv' : 'movie',
      title: data.title || data.name || '',
      original_title: data.original_title || data.original_name || '',
      release_date: data.release_date || data.first_air_date || ''
    };
  }
  function convertQuality(res) {
    if (res === 2160) return '4K';
    if (res === 1080) return 'FHD';
    if (res === 720) return 'HD';
    if (res === 'TS') return 'TS';
    return res >= 720 ? 'HD' : 'SD';
  }
  const badTitles = ['camrip', 'камрип', 'ts', 'telecine', 'telesync', 'telesynch', 'upscale', 'tc', 'тс'];
  const badPatterns = badTitles.map(t => new RegExp('\\b' + t + '\\b', 'i'));
  function isBadTitle(title) {
    return title ? badPatterns.some(p => p.test(title.toLowerCase())) : false;
  }

  function getDate(video, callback) {
    const HIGHEST = 2160;
    let found = false;
    const year = (video.release_date || '').substring(0, 4);
    if (!year || isNaN(year)) { callback(null); return; }

    const uid = Lampa.Storage.get('lampac_unic_id', '');
    let url = 'https://' + QUALITY_API + '/api/v2.0/indexers/all/results?apikey=&uid=' + uid + '&year=' + year;
    let hasTitle = false;
    if (video.title && /[a-zа-яё0-9]/i.test(video.title)) {
      url += '&title=' + encodeURIComponent(video.title.trim());
      hasTitle = true;
    }
    if (video.original_title && /[a-zа-яё]/i.test(video.original_title)) {
      url += '&title_original=' + encodeURIComponent(video.original_title.trim());
      hasTitle = true;
    }
    if (!hasTitle) { callback(null); return; }

    const network = new Lampa.Reguest();
    network.timeout(15000);
    network.silent(url,
      (resp) => {
        try { network.clear(); } catch (_) { }
        if (!resp) { callback(null); return; }
        try {
          const data = typeof resp === 'string' ? JSON.parse(resp) : resp;
          const list = data.Results || [];
          if (!Array.isArray(list) || !list.length) { callback(null); return; }
          let bestRes = -1;
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
            if (isBadTitle(title)) { found = true; continue; }
            if (res === HIGHEST) { callback('4K'); return; }
            if (res > bestRes) bestRes = res;
          }
          if (bestRes > 0) callback(convertQuality(bestRes));
          else if (found) callback('TS');
          else callback(null);
        } catch (_) { callback(null); }
      },
      () => {
        try { network.clear(); } catch (_) { }
        callback(null);
      }
    );
  }
  function getQuality(card, callback) {
    const data = card.card_data;
    if (!data || !data.id) { callback(null); return; }
    const video = getVideo(data);
    const key = video.type + ':' + video.id;
    const cached = getCache(STORE_QUALITY, key);
    if (cached) { callback(cached.quality); return; }
    getDate(video, (quality) => {
      setCache(STORE_QUALITY, key, { quality: quality || null, empty: !quality });
      callback(quality);
    });
  }

  // Утилиты
  function moveAge(card) {
    const age = card.querySelector('.card__age');
    const view = card.querySelector('.card__view');
    if (age && view && age.parentNode !== view) view.appendChild(age);
  }

  // Отрисовка бейджей
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
  function renderType(card, isTV) {
    setBadge(card, 'card__type', isTV ? 'Сериал' : 'Фильм', isTV ? LEVEL.vgood : LEVEL.good);
  }
  function renderStatus(card, info) {
    const status = info && info.status;
    const last = info && info.last_episode_to_air;
    if (!last || !last.season_number || !last.episode_number) {
      setBadge(card, 'card__status', null);
      return;
    }

    let level = null;
    if (status === 'Ended') level = statusMap.ended;
    else if (status === 'Canceled') level = statusMap.canceled;
    else if (status === 'Returning Series') level = statusMap.ongoing;

    setBadge(card, 'card__status', 'S' + last.season_number + ':E' + last.episode_number, level);
  }
  function renderQuality(card, quality) {
    setBadge(card, 'card__quality', quality, quality ? qualityMap[quality] : null);
  }
  function renderDuration(card, info) {
    const data = card.card_data;
    if (!data) return;
    let progress = null;
    let total = null;
    if (data.original_title) {
      const t = Lampa.Timeline.view(Lampa.Utils.hash(data.original_title));
      if (t && t.time > 0 && t.duration > 0) {
        progress = Lampa.Utils.secondsToTime(t.time, true);
        total = Lampa.Utils.secondsToTime(t.duration, true);
      }
    }
    if (!total) {
      const runtime = info && info.runtime;
      if (!runtime) { setBadge(card, 'card__duration', null); return; }
      total = Lampa.Utils.secondsToTime(runtime * 60, true);
    }
    setBadge(card, 'card__duration', progress ? progress + '/' + total : total, LEVEL.good);
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
    setBadge(card, 'card__watched', getWatched(card, info), LEVEL.good);
  }

  // Оценка и возрастной рейтинг
  function findLevel(map, value) {
    const rule = map.find(r => value >= r.min);
    return rule ? rule.level : null;
  }
  function renderVote(el) {
    const value = parseFloat(el.textContent);
    if (isNaN(value)) return;
    const level = findLevel(voteMap, value);
    if (level) el.setAttribute('data-level', level);
  }
  function renderPG(el) {
    const m = (el.textContent.match(/\d+/) || [])[0];
    const value = parseInt(m, 10);
    if (isNaN(value)) return;
    const level = findLevel(pgMap, value);
    if (level) el.setAttribute('data-level', level);
  }

  // Обработка карточки
  function processCard(card) {
    if (!card || !card.card_data) return;
    const data = card.card_data;
    if (!data.id || (!data.original_name && !data.original_title)) return;
    const isTV = !!data.original_name;

    renderType(card, isTV);
    moveAge(card);

    const vote = card.querySelector('.card__vote');
    if (vote) renderVote(vote);

    if (isTV) {
      getTmdb('tv', data.id, STORE_TV, (info) => {
        if (!card.parentNode) return;
        renderStatus(card, info);
        renderWatched(card, info);
      });
    } else {
      getTmdb('movie', data.id, STORE_MOVIE, (info) => {
        if (!card.parentNode) return;
        renderDuration(card, info);
      });
    }
    getQuality(card, (quality) => {
      if (!card.parentNode) return;
      renderQuality(card, quality);
    });
  }

  // Детальная страница — качество
  function renderDetailQuality(movie, render) {
    if (!render) return;
    const video = getVideo(movie);
    const key = video.type + ':' + video.id;

    function apply(quality) {
      const line = $(render).find('.full-start-new__rate-line');
      if (!line.length) return;
      let el = line.find('.qualview-quality');
      if (!el.length) {
        el = $('<div class="full-start__status qualview-quality"></div>');
        line.append(el);
      }
      if (quality) {
        el.text(quality)
          .attr('data-level', qualityMap[quality] || LEVEL.normal)
          .css({ padding: '0.2em 0.4em', borderRadius: '0.3em', fontWeight: 'bold' });
      } else {
        el.remove();
      }
    }

    const cached = getCache(STORE_QUALITY, key);
    if (cached) { apply(cached.quality); return; }
    apply('...');
    getDate(video, (quality) => {
      setCache(STORE_QUALITY, key, { quality: quality || null, empty: !quality });
      apply(quality);
    });
  }

  // Сканирование
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

  let observer = null;
  function observeCard(card) {
    if (!observer || !card || card.nodeType !== 1) return;
    if (card.getAttribute('data-observed') === '1') return;
    card.setAttribute('data-observed', '1');
    try { observer.observe(card); } catch (_) { }
  }
  function scanContainer(target) {
    if (!target || !target.querySelectorAll) return;
    const cards = target.querySelectorAll('.card');
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      observeCard(card);
      if (card.card_data && card.card_data.id) {
        Lampa.Storage.set('activity', { movie: card.card_data, card: card.card_data });
        Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });
        processCard(card);
      }
    }
  }
  function scan() {
    let render = null;
    try {
      const a = Lampa.Activity && Lampa.Activity.active ? Lampa.Activity.active() : null;
      render = a && a.activity && a.activity.render ? a.activity.render() : null;
      if (render && render.nodeType !== 1 && render.length) render = render[0];
    } catch (_) { }
    scanContainer(render && render.nodeType === 1 ? render : document.body);
  }

  // Инициализация
  function init() {
    if (window.__ui_badge_initialized__) return;
    window.__ui_badge_initialized__ = true;

    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver((entries) => {
        for (let i = 0; i < entries.length; i++) {
          const card = entries[i].target;
          if (!card) continue;
          if (entries[i].isIntersecting && card.card_data && card.card_data.id) {
            processCard(card);
          }
        }
      }, { root: null, rootMargin: '250px 0px 250px 0px', threshold: 0.01 });
    }

    Lampa.Listener.follow('activity', (e) => {
      if (e.type === 'destroy' || e.type === 'archive') return;
      later(scan, 0, 'scan-0');
      later(scan, 150, 'scan-150');
      later(scan, 400, 'scan-400');
      later(scan, 900, 'scan-900');
    });
    Lampa.Listener.follow('line', (e) => {
      if (!e || (e.type !== 'append' && e.type !== 'create' && e.type !== 'visible')) return;
      let body = null;
      if (e.body) {
        if (e.body.nodeType === 1) body = e.body;
        else if (e.body.length && e.body[0] && e.body[0].nodeType === 1) body = e.body[0];
      }
      later(() => body ? scanContainer(body) : scan(), 30, 'scan-line');
    });
    Lampa.Listener.follow('card', (event) => {
      if (event.type === 'build' && event.object && event.object.card) {
        observeCard(event.object.card);
        processCard(event.object.card);
      }
    });
    Lampa.Listener.follow('full', (event) => {
      if (event.type === 'complite' && event.data && event.data.movie) {
        const r = event.object && event.object.activity && event.object.activity.render
          ? event.object.activity.render() : null;
        if (!r) return;
        renderDetailQuality(event.data.movie, r);
        $(r).find('.full-start__pg').each(function () { renderPG(this); });
        $(r).find('.full-start__rate').each(function () { renderVote(this); });
      }
    });

    window.addEventListener('scroll', () => later(scan, 120, 'scan-scroll'), { passive: true });
    window.addEventListener('touchend', () => later(scan, 200, 'scan-touch'), { passive: true });
    window.addEventListener('keydown', () => later(scan, 200, 'scan-key'), { passive: true });
    window.addEventListener('resize', () => later(scan, 150, 'scan-resize'), { passive: true });
    window.addEventListener('orientationchange', () => later(scan, 150, 'scan-orient'), { passive: true });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) later(scan, 0, 'scan-visible'); });

    later(scan, 200, 'boot-200');
    later(scan, 600, 'boot-600');
  }

  if (window.appready) init();
  else Lampa.Listener.follow('app', (e) => { if (e.type === 'ready') init(); });

})();