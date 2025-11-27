(function () {
  "use strict";

  let manifest = {
    type: 'other',
    version: '1.0.0',
    name: 'Custom Episodes Sync v2',
    component: 'custom_episodes_sync_v2'
  };

  Lampa.Manifest.plugins = manifest;

  function renderEpisodeBadge(cardElement, data) {
    const cardView = cardElement.querySelector('.card__view');
    if (!cardView)
      return;

    // Удаляем старый бейдж если есть
    const oldBadge = cardView.querySelector('.card__watched');
    if (oldBadge)
      oldBadge.remove();

    const badge = document.createElement('div');
    badge.className = 'card__watched';

    // Для фильмов используем рабочую логику из оригинала
    if (!data.original_name) {
      const hash = Lampa.Utils.hash([data.original_title || data.title || data.name].join(''));
      const timeData = Lampa.Timeline.view(hash);

      if (timeData && timeData.percent) {
        const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);
        const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);
        badge.innerText = `${currentTime}/${totalTime}`;
        cardView.appendChild(badge);
      }
      return;
    }

    // Для сериалов используем cache из timecode.js
    getWatchedEpisodesFromCache(data, (episodes) => {
      let viewed = null;

      // Ищем просмотренные эпизоды в cache
      if (episodes && episodes.length) {
        episodes.forEach(ep => {
          if (!ep || !ep.episode_number || !ep.season_number)
            return;

          if (ep.time && ep.time > 0) {
            viewed = {
              episode: {
                season_number: ep.season_number,
                episode_number: ep.episode_number
              },
              view: ep
            };
          }
        });
      }

      // Fallback: используем online_watched_last storage
      if (!viewed) {
        const last = Lampa.Storage.get('online_watched_last', '{}');
        const filed = last[Lampa.Utils.hash(data.original_title || data.original_name)];
        if (filed && filed.episode && filed.season) {
          viewed = {
            episode: {
              season_number: filed.season,
              episode_number: filed.episode
            },
            view: {
              percent: 100
            }
          };
        }
      }

      if (viewed) {
        getSeasonInfo(data, (seasonInfo) => {
          const currentEp = viewed.episode.episode_number;
          const currentSeason = viewed.episode.season_number;

          // Простой формат без общего количества
          badge.innerText = `E${currentEp} S${currentSeason}`;
          cardView.appendChild(badge);
        });
      }
    });
  }

  // Функция получения данных из cache как в timecode.js
  function getWatchedEpisodesFromCache(data, callback) {
    // Используем тот же формат card_id что и timecode.js
    const cardId = (data.id || 0) + '_' + (data.original_name ? 'tv' : 'movie');

    // Используем тот же filename что и timecode.js
    const acc = Lampa.Storage.get('account', '{}');
    const filename = 'file_view' + (acc.profile ? '_' + acc.profile.id : '');

    // Получаем данные из cache
    const viewed = Lampa.Storage.cache(filename, 10000, {});
    const cardData = viewed[cardId] || {};

    // Ищем эпизоды с форматом s#e#
    let episodes = [];

    for (const [itemId, timeData] of Object.entries(cardData)) {
      const match = itemId.match(/s(\d+)e(\d+)/i);
      if (match && timeData.time && timeData.time > 0) {
        episodes.push({
          season_number: parseInt(match[1]),
          episode_number: parseInt(match[2]),
          time: timeData.time,
          percent: timeData.percent || 0
        });
      }
    }

    callback(episodes);
  }

  function getSeasonInfo(data, callback) {
    const seasonInfo = {};

    if (data.seasons && data.seasons.length) {
      data.seasons.forEach(season => {
        seasonInfo[season.season_number] = season.episode_count;
      });
      callback(seasonInfo);
    } else {
      callback(seasonInfo);
    }
  }

  function processCards() {
    try {
      document.querySelectorAll('.card:not([data-episodes-processed])').forEach(cardElement => {
        const cardData = cardElement.card_data;
        if (!cardData)
          return;

        cardElement.setAttribute('data-episodes-processed', 'true');
        renderEpisodeBadge(cardElement, cardData);
      });
    } catch (e) {
      console.error('Custom Episodes Sync v2: Error processing cards', e);
    }
  }

  // Следим за активностью
  Lampa.Listener.follow('activity', function (e) {
    if (e.type == 'start' || e.type == 'page') {
      setTimeout(processCards, 100);
    }
  });

  // Следим за новыми карточками
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {
          node.addEventListener('visible', function () {
            if (!node.hasAttribute('data-episodes-processed')) {
              processCards();
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // CSS стили
  Lampa.Template.add('custom_episodes_css', `
    <style>    
    .card__watched {    
      position: absolute;    
      bottom: 5px;    
      right: 5px;    
      background: rgba(0, 0, 0, 0.8);    
      color: white;    
      padding: 2px 6px;    
      border-radius: 3px;    
      font-size: 11px;    
      z-index: 10;    
    }    
    </style>    
  `);

  $('body').append(Lampa.Template.get('custom_episodes_css', {}, true));

  // Запускаем обработку
  processCards();
})();
