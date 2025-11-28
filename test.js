(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '3.0.0',
    name: 'Watched Badge',
    component: 'watched_badge'
  };

  Lampa.Manifest.plugins = manifest;

  // === 1. ПОЛУЧЕНИЕ ДАННЫХ ===
  function getData(cardData) {
    // Загружаем данные для карточки
    Lampa.Storage.set('activity', {
      movie: cardData,
      card: cardData
    });

    Lampa.Listener.send('lampac', {
      type: 'timecode_pullFromServer'
    });

    // Получаем данные из хранилища
    if (cardData.original_name) {
      const hash = Lampa.Utils.hash([cardData.original_name || cardData.name].join(''));
      return Lampa.Storage.get('online_watched_last', {})[hash];
    } else {
      const hash = Lampa.Utils.hash([cardData.original_title || cardData.title || cardData.name].join(''));
      return Lampa.Timeline.view(hash);
    }
  }

  // === 2. ФОРМАТ ОТОБРАЖЕНИЯ ===
  function formatWatched(timeData, cardData, callback) {
    if (!timeData)
      return null;

    if (timeData.episode && timeData.season) {
      // Получаем данные о сезоне через API
      Lampa.Api.seasons(cardData, [timeData.season], (seasonsData) => {
        const seasonData = seasonsData[timeData.season];
        const episodesInSeason = seasonData && seasonData.episodes ? seasonData.episodes.length : '?';
        const totalSeasons = cardData.number_of_seasons || '?';

        const displayText = `E${timeData.episode}/${episodesInSeason} S${timeData.season}/${totalSeasons}`;
        callback(displayText);
      });

      return null; // Возвращаем null, так как текст будет получен асинхронно
    } else if (timeData.time && timeData.duration) {
      const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);
      const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);
      return `${currentTime}/${totalTime}`;
    }
    return null;
  }

  // === 3. РЕНДЕР БЕЙДЖА ===
  function renderWatchedBadge(cardElement, data) {
    const cardView = cardElement.querySelector('.card__view');
    if (!cardView)
      return;

    const oldBadge = cardView.querySelector('.card__watched');
    if (oldBadge)
      oldBadge.remove();

    const timeData = getData(data);

    if (timeData && timeData.episode && timeData.season) {
      // Для сериалов используем асинхронный вызов
      formatWatched(timeData, data, (displayText) => {
        if (displayText) {
          const badge = document.createElement('div');
          badge.className = 'card__watched';
          badge.innerText = displayText;
          cardView.appendChild(badge);
        }
      });
    } else {
      // Для фильмов используем синхронный вызов
      const displayText = formatWatched(timeData, data);
      if (displayText) {
        const badge = document.createElement('div');
        badge.className = 'card__watched';
        badge.innerText = displayText;
        cardView.appendChild(badge);
      }
    }
  }

  // === ИНИЦИАЛИЗАЦИЯ ===
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

    // Создаем массив Promise для отслеживания загрузки
    const loadPromises = uniqueCards.map((cardData, index) => {
      return new Promise((resolve) => {
        Lampa.Storage.set('activity', {
          movie: cardData,
          card: cardData
        });

        Lampa.Listener.send('lampac', {
          type: 'timecode_pullFromServer'
        });

        // Небольшая задержка для инициализации загрузки
        setTimeout(resolve, 50);
      });
    });

    // Ждем завершения всех загрузок перед отображением
    Promise.all(loadPromises).then(() => {
      document.querySelectorAll('.card:not([data-watched-processed])').forEach(card => {
        card.setAttribute('data-watched-processed', 'true');
        if (card.card_data)
          renderWatchedBadge(card, card.card_data);
      });
    });
  }

  // События
  Lampa.Listener.follow('activity', function (e) {
    if (e.type == 'start' || e.type == 'page') {
      setTimeout(processCards);
    }
  });

  processCards();
})();
