(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.7.0',
    name: 'Watched Badge',
    component: 'watched_badge'
  };

  Lampa.Manifest.plugins = manifest;

  function getData(cardData) {
    if (cardData.original_name) {
      const totalSeasons = cardData.number_of_seasons;
      for (let season = totalSeasons; season >= 1; season--) {
        for (let episode = 400; episode >= 1; episode--) {
          let hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''))
          let timelineData = Lampa.Timeline.view(hash)
          if (timelineData?.time > 0) return { episode, season }
        }
      }
    } else {
      const hash = Lampa.Utils.hash([cardData.original_title || cardData.title].join(''));
      return Lampa.Timeline.view(hash);
    }
  }

  function formatWatched(timeData, cardData, callback) {
    if (!timeData)
      return null;

    if (timeData.episode && timeData.season) {
      Lampa.Api.seasons(cardData, [timeData.season], (seasonsData) => {
        const totalSeasons = cardData.number_of_seasons || '?';
        const totalEpisodes = seasonsData[timeData.season]?.episodes.length || '?';
        const displayText = `S${timeData.season}/${totalSeasons} E${timeData.episode}/${totalEpisodes}`;
        callback(displayText);
      });
      return null;
    } else if (timeData.time && timeData.duration) {
      const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);
      const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);
      return `${currentTime}/${totalTime}`;
    }
    return null;
  }

  function renderWatchedBadge(cardElement, data) {
    const cardView = cardElement.querySelector('.card__view');
    if (!cardView) return;

    const oldBadge = cardView.querySelector('.card__watched');
    if (oldBadge) oldBadge.remove();

    const timeData = getData(data);

    if (timeData && timeData.episode && timeData.season) {
      formatWatched(timeData, data, (displayText) => {
        if (displayText) {
          const badge = document.createElement('div');
          badge.className = 'card__watched';
          badge.innerText = displayText;
          cardView.appendChild(badge);
        }
      });
    } else {
      const displayText = formatWatched(timeData, data);
      if (displayText) {
        const badge = document.createElement('div');
        badge.className = 'card__watched';
        badge.innerText = displayText;
        cardView.appendChild(badge);
      }
    }
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
        setTimeout(resolve, 80);
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
