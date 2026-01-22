(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.7.6',
    name: 'Watched Badge',
    component: 'watched_badge'
  };

  Lampa.Manifest.plugins = manifest;

  function getData(cardData, callback) {
    if (cardData.original_name) {
      let seasons = Array.from({ length: cardData.number_of_seasons }, (_, i) => i + 1);
      Lampa.Api.seasons(cardData, seasons, (seasonsData) => {
        for (let season of seasons.reverse()) {
          let episodes = seasonsData[season]?.episodes || [];
          for (let { episode_number: episode } of episodes.reverse()) {
            let hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''));
            let timelineData = Lampa.Timeline.view(hash);
            if (timelineData?.time > 0 || timelineData?.percent > 0) {
              callback({ episode, season, seasonsData });
              return;
            }
          }
        }
        callback(null);
      });
    } else {
      const hash = Lampa.Utils.hash([cardData.original_title || cardData.title].join(''));
      callback(Lampa.Timeline.view(hash));
    }
  }

  function formatWatched(timeData, cardData, callback) {
    if (!timeData || (!timeData.episode && !timeData.time)) {
      callback(null);
      return;
    }

    if (timeData.episode && timeData.season) {
      const seasonsData = timeData.seasonsData || {};
      const totalSeasons = cardData.number_of_seasons || '?';
      const totalEpisodes = seasonsData[timeData.season]?.episodes?.length || '?';
      callback(`S${timeData.season}/${totalSeasons} E${timeData.episode}/${totalEpisodes}`);
    } else if (timeData.time && timeData.duration) {
      const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);
      const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);
      callback(`${currentTime}/${totalTime}`);
    }
  }

  function renderWatchedBadge(cardElement, data) {
    cardElement.querySelector('.card__view .card__watched')?.remove();

    getData(data, (timeData) => {
      formatWatched(timeData, data, (text) => {
        if (!text) return;

        const badge = document.createElement('div');
        badge.className = 'card__watched';
        badge.innerText = text;
        cardElement.querySelector('.card__view').appendChild(badge);
      });
    });
  }

  function processCards() {
    const cards = document.querySelectorAll('.card');
    const uniqueCards = [];
    const seen = new Set();

    cards.forEach(card => {
      const data = card.card_data;
      if (data && data.id && !seen.has(data.id)) {
        seen.add(data.id);
        uniqueCards.push(data);
      }
    });

    const loadPromises = uniqueCards.map((cardData) => {
      return new Promise((resolve) => {
        Lampa.Storage.set('activity', { movie: cardData, card: cardData });
        Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });
        setTimeout(resolve, 40);
      });
    });

    Promise.all(loadPromises).then(() => {
      document.querySelectorAll('.card').forEach(card => {
        card.setAttribute('data-watched-processed', 'true');
        if (card.card_data) renderWatchedBadge(card, card.card_data);
      });
    });
  }

  Lampa.Listener.follow('activity', function (e) {
    if (e.type == 'start' || e.type == 'page') {
      processCards();
    }
  });

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {
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
