(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'other',  
    version: '1.0.0',  
    name: 'Custom Episodes',  
    component: 'custom_episodes'  
  };  
  
  Lampa.Manifest.plugins = manifest;  
  
  function renderEpisodeBadge(cardElement, data) {  
    const cardView = cardElement.querySelector('.card__view');  
    if (!cardView) return;  
  
    // Удаляем старый бейдж если есть  
    const oldBadge = cardView.querySelector('.card__watched');  
    if (oldBadge) oldBadge.remove();  
  
    const badge = document.createElement('div');  
    badge.className = 'card__watched';  
  
    // Используем полную логику из оригинального watched.js  
    function get(callback) {  
      if (data.original_name && Lampa.Timetable && typeof Lampa.Timetable.get === 'function') {  
        Lampa.Timetable.get(data, callback);  
      } else {  
        callback([]);  
      }  
    }  
  
    get((episodes, from_db) => {  
      let viewed = null;  
  
      const Draw = () => {  
        // Ищем просмотренные эпизоды в Timetable  
        if (data.original_name && episodes && episodes.length) {  
          episodes.forEach(ep => {  
            if (!ep || !ep.episode_number || !ep.season_number) return;  
              
            const hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title || data.original_name].join(''));  
            const view = Lampa.Timeline.view(hash);  
  
            if (view && view.percent) viewed = {ep, view};  
          });  
        }  
  
        // Fallback 1: online_watched_last storage  
        if (!viewed && data.original_name) {  
          const last = Lampa.Storage.get('online_watched_last', '{}');  
          const filed = last[Lampa.Utils.hash(data.original_title || data.original_name)];  
  
          if (filed && filed.episode) {  
            // Получаем информацию о сезонах и сериях  
            getSeasonInfo(data, (seasonInfo) => {  
              const currentEp = filed.episode;  
              const currentSeason = filed.season || 1;  
              const totalEpisodes = seasonInfo[currentSeason] || '?';  
              const totalSeasons = Object.keys(seasonInfo).length || '?';  
                
              badge.innerText = `E${currentEp}/${totalEpisodes} S${currentSeason}/${totalSeasons}`;  
              cardView.appendChild(badge);  
            });  
            return;  
          }  
        }  
  
        // Fallback 2: Timeline.watched для сериалов  
        if (!viewed && data.original_name) {  
          const any = Lampa.Timeline.watched(data, true).pop();  
  
          if (any) {  
            // Получаем информацию о сезонах и сериях  
            getSeasonInfo(data, (seasonInfo) => {  
              const currentEp = any.ep;  
              const currentSeason = any.season || 1;  
              const totalEpisodes = seasonInfo[currentSeason] || '?';  
              const totalSeasons = Object.keys(seasonInfo).length || '?';  
                
              badge.innerText = `E${currentEp}/${totalEpisodes} S${currentSeason}/${totalSeasons}`;  
              cardView.appendChild(badge);  
            });  
            return;  
          }  
        }  
  
        // Если нашли просмотренный эпизод через Timetable  
        if (viewed && viewed.ep) {  
          // Получаем информацию о сезонах и сериях  
          getSeasonInfo(data, (seasonInfo) => {  
            const currentEp = viewed.ep.episode_number;  
            const currentSeason = viewed.ep.season_number;  
            const totalEpisodes = seasonInfo[currentSeason] || '?';  
            const totalSeasons = Object.keys(seasonInfo).length || '?';  
              
            badge.innerText = `E${currentEp}/${totalEpisodes} S${currentSeason}/${totalSeasons}`;  
            cardView.appendChild(badge);  
          });  
        }  
      };  
  
      Draw();  
    });  
  
    // Для фильмов - используем Timeline напрямую с коротким форматом времени  
    if (!data.original_name) {  
      const hash = Lampa.Utils.hash([data.original_title || data.title || data.name].join(''));  
      const timeData = Lampa.Timeline.view(hash);  
  
      if (timeData && timeData.time && timeData.duration) {  
        // Используем короткий формат времени (без секунд)  
        const current = Lampa.Utils.secondsToTime(timeData.time, true);  
        const total = Lampa.Utils.secondsToTime(timeData.duration, true);  
        badge.innerText = current + '/' + total;  
        cardView.appendChild(badge);  
      }  
    }  
  }  
  
  // Функция для получения информации о сезонах и сериях  
  function getSeasonInfo(data, callback) {  
    const seasonInfo = {};  
      
    // Сначала пробуем получить из данных карточки  
    if (data.seasons && Array.isArray(data.seasons)) {  
      data.seasons.forEach(season => {  
        if (season.season_number && season.episode_count) {  
          seasonInfo[season.season_number] = season.episode_count;  
        }  
      });  
        
      if (Object.keys(seasonInfo).length > 0) {  
        callback(seasonInfo);  
        return;  
      }  
    }  
  
    // Если нет данных, делаем запрос к API  
    if (data.id && Lampa.Api) {  
      const totalSeasons = Utils.countSeasons(data) || 1;  
        
      // Получаем информацию о каждом сезоне  
      const seasonPromises = [];  
      for (let i = 1; i <= totalSeasons; i++) {  
        seasonPromises.push(new Promise((resolve) => {  
          Lampa.Api.seasons(data, [i], (seasonData) => {  
            if (seasonData[i] && seasonData[i].episodes) {  
              seasonInfo[i] = seasonData[i].episodes.length;  
            }  
            resolve();  
          });  
        }));  
      }  
  
      Promise.all(seasonPromises).then(() => {  
        callback(seasonInfo);  
      });  
    } else {  
      callback(seasonInfo);  
    }  
  }  
  
  function processCards() {  
    try {  
      document.querySelectorAll('.card:not([data-episodes-processed])').forEach(cardElement => {  
        const cardData = cardElement.card_data;  
        if (!cardData) return;  
  
        cardElement.setAttribute('data-episodes-processed', 'true');  
        renderEpisodeBadge(cardElement, cardData);  
      });  
    } catch (e) {  
      console.error('Custom Episodes: Error processing cards', e);  
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
  
  observer.observe(document.body, { childList: true, subtree: true });  
  
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
