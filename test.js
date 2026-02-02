(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.9.7',
    name: 'Watched Badge',
    component: 'watched_badge'
  };

  Lampa.Manifest.plugins = manifest;

  function getData(cardData) {
    if (cardData.original_name) {
      const seasonCount = cardData.number_of_seasons;
      for (let season = seasonCount; season >= 1; season--) {
        const episodeCount = cardData.seasons?.find(s => s.season_number === season)?.episode_count;
        for (let episode = episodeCount; episode >= 1; episode--) {
          let hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''));
          let timelineData = Lampa.Timeline.view(hash);
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

  function renderWatchedBadge(cardElement, data) {
    let badge = cardElement.querySelector('.card__view .card__watched');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'card__watched';
      cardElement.querySelector('.card__view').appendChild(badge);
    }
    badge.innerText = formatWatched(getData(data));
  }

  function processCards() {
  // 1️⃣ Фильтр ТОЛЬКО по истории (все потенциальные)
  const allHistoryCards = Array.from(document.querySelectorAll('.card'))
    .filter(card => Lampa.Favorite.check(card.card_data).history);
  
  if (allHistoryCards.length === 0) return;

  // 2️⃣ Разделяем: готовые vs новые
  const processedCards = allHistoryCards.filter(card => card.hasAttribute('data-watched-processed'));
  const unprocessedCards = allHistoryCards.filter(card => !card.hasAttribute('data-watched-processed'));

  // 3️⃣ Сразу рендерим готовые (синхронно)
  processedCards.forEach(card => renderWatchedBadge(card, card.card_data));

  // 4️⃣ Если есть новые — обрабатываем асинхронно
  if (unprocessedCards.length === 0) return;

  Promise.all(unprocessedCards.map(card => {
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
          resolve();
        });
      });
    }
    return Promise.resolve();
  })).then(() => {
    // 5️⃣ Финальный рендер ТОЛЬКО новых
    unprocessedCards.forEach(card => {
      card.setAttribute('data-watched-processed', 'true');
      const text = formatWatched(getData(card.card_data));
      if (text) renderWatchedBadge(card, card.card_data);
    });
  });
}

  Lampa.Listener.follow('activity', (e) => {
    if (e.type === 'start') {
      processCards();
    }
  });

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList?.contains('card') && !node.hasAttribute('data-watched-processed')) {
          processCards();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });

  if (window.appready) { processCards(); }
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") { processCards(); }
    });
  }
})();
