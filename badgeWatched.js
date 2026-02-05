(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.11.4',
    name: 'Badge Watched',
    component: 'badge_watched'
  };

  Lampa.Manifest.plugins = manifest;

  const CONFIG = {
    CACHE_KEY: 'badge_watched_cache',
    CACHE_TTL_MS: 30 * 24 * 60 * 60 * 1000
  };

  function setCache(key, seasons) {
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 400, {});
    cache[key] = { seasons, ts: Date.now() };
    Lampa.Storage.set(CONFIG.CACHE_KEY, cache);
  }
  function getCache(key) {
    const cache = Lampa.Storage.cache(CONFIG.CACHE_KEY, 400, {});
    const item = cache[key];
    return (item && Date.now() - item.ts < CONFIG.CACHE_TTL_MS) ? item.seasons : null;
  }

  function getData(cardData) {
    if (cardData.original_name) {
      const cached = getCache(cardData.id);
      if (cached) cardData.seasons = cached;
      const seasonCount = cardData.number_of_seasons;
      for (let season = seasonCount; season >= 1; season--) {
        const episodeCount = cardData.seasons?.find(s => s.season_number === season)?.episode_count;
        for (let episode = episodeCount; episode >= 1; episode--) {
          const hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''));
          const timelineData = Lampa.Timeline.view(hash);
          if (timelineData?.time > 0 || timelineData?.percent > 0) {
            return { season, seasonCount, episode, episodeCount };
          }
        }
      }
    } else {
      const hash = Lampa.Utils.hash([cardData.original_title || cardData.title].join(''));
      return Lampa.Timeline.view(hash);
    }
    return null;
  }

  function formatWatched(timeData) {
    if (!timeData) return null;
    if (timeData.season && timeData.episode) {
      return `S ${timeData.season}/${timeData.seasonCount} • E ${timeData.episode}/${timeData.episodeCount}`;
    } else if (timeData.time && timeData.duration) {
      return `${Lampa.Utils.secondsToTime(timeData.time, true)}/${Lampa.Utils.secondsToTime(timeData.duration, true)}`;
    }
    return null;
  }

  function renderWatchedBadge(card, data) {
    const text = formatWatched(getData(data));
    let badge = card.querySelector('.card__view .card__watched');
    if (!text) return badge?.remove();
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'card__watched';
      card.querySelector('.card__view').appendChild(badge);
    }
    badge.innerText = text;
  }

  function processCards() {
    const cards = Array.from(document.querySelectorAll('.card')).filter(card => Lampa.Favorite.check(card.card_data).history);
    const oldCards = cards.filter(card => processedCard.has(card.card_data.id));
    const newCards = cards.filter(card => !processedCard.has(card.card_data.id));

    oldCards.forEach(card => renderWatchedBadge(card, card.card_data));
    Promise.all(newCards.map(card => {
      const data = card.card_data;

      Lampa.Storage.set('activity', { movie: data, card: data });
      Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });

      if (data.original_name && data.number_of_seasons && !data.seasons) {
        return new Promise(resolve => {
          const seasons = Array.from({ length: data.number_of_seasons }, (_, i) => i + 1);
          Lampa.Api.seasons(data, seasons, seasonsData => {
            data.seasons = seasons.map(season => ({
              season_number: season,
              episode_count: seasonsData[season]?.episodes?.length || 0
            }));
            setCache(data.id, data.seasons);
            resolve();
          });
        });
      }
      return Promise.resolve();
    })).then(() => {
      newCards.forEach(card => {
        renderWatchedBadge(card, card.card_data);
        processedCard.add(card.card_data.id);
      });
    });
  }
  const processedCard = new Set();

  Lampa.Listener.follow('activity', (e) => {
    if (e.type === 'start') {
      setTimeout(processCards, 100);
    }
  });

  var observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList?.contains('card')) {
          processCards();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (window.appready) { processCards(); }
  else {
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") { processCards(); }
    });
  }
})();