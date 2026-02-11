(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.13.0',
    name: 'Badge Watched',
    component: 'badge_watched'
  };

  Lampa.Manifest.plugins = manifest;

  const key = 'badge_watched_cache';
  function setCache(card, seasons) {
    const cache = Lampa.Storage.cache(key, 400, {});
    cache[card] = { seasons };
    Lampa.Storage.set(key, cache);
  }
  function getCache(card) {
    const cache = Lampa.Storage.cache(key, 400, {});
    const item = cache[card];
    return item ? item.seasons : null;
  }
  Lampa.Storage.set(key, '{}');

  function getData(card) {
    if (card.original_name) {
      const cached = getCache(card.id);
      if (cached) card.seasons = cached;

      const seasonCount = card.number_of_seasons;
      for (let season = seasonCount; season >= 1; season--) {
        const episodeCount = card.seasons.find(s => s.season_number === season).episode_count;
        for (let episode = episodeCount; episode >= 1; episode--) {
          const hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, card.original_title].join(''));
          const timelineData = Lampa.Timeline.view(hash);
          if (timelineData?.time > 0 || timelineData?.percent > 0) {
            return { season, seasonCount, episode, episodeCount };
          }
        }
      }
    } else {
      const hash = Lampa.Utils.hash([card.original_title || card.title].join(''));
      return Lampa.Timeline.view(hash);
    }
    return null;
  }

  function formatBadge(card) {
    if (!card) return null;
    if (card.season && card.episode) {
      return `S ${card.season}/${card.seasonCount} • E ${card.episode}/${card.episodeCount}`;
    } else if (card.time && card.duration) {
      return `${Lampa.Utils.secondsToTime(card.time, true)}/${Lampa.Utils.secondsToTime(card.duration, true)}`;
    }
    return null;
  }

  function renderBadge(card, data) {
    const text = formatBadge(getData(data));
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
    const cards = Array.from(document.querySelectorAll('.card'))
      .map(card => ({ card, data: card.card_data }))
      .filter(({ data }) => Lampa.Favorite.check(data).history || Lampa.Timeline.watched(data));

    const oldCards = cards.filter(({ data }) => getCache(data.id));
    const newCards = cards.filter(({ data }) => !getCache(data.id));

    oldCards.forEach(({ card, data }) => renderBadge(card, data));
    Promise.all(newCards.map(({ data }) => {
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
      setCache(data.id);
      return Promise.resolve();
    })).then(() => {
      newCards.forEach(({ card, data }) => renderBadge(card, data));
    });
  }

  Lampa.Listener.follow('activity', (e) => {
    if (e.type === 'start') {
      setTimeout(processCards, 80);
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
})();
