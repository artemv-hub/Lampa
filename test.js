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
  
    // Для сериалов - формат E7S2 с расширенной проверкой  
    if (data.original_name) {  
      try {  
        // Расширенная проверка данных  
        const hasValidId = typeof data.id === 'number';  
        const hasValidSource = data.source === 'tmdb' || data.source === 'cub';  
        const timetableAvailable = Lampa.Timetable && typeof Lampa.Timetable.get === 'function';  
  
        console.log('Custom Episodes: Serial check:', {  
          id: data.id,  
          source: data.source,  
          hasValidId,  
          hasValidSource,  
          timetableAvailable,  
          title: data.title || data.name  
        });  
  
        if (timetableAvailable && hasValidId && hasValidSource) {  
          Lampa.Timetable.get(data, (episodes) => {  
            try {  
              if (!episodes || !Array.isArray(episodes) || !episodes.length) {  
                console.log('Custom Episodes: No episodes found for:', data.title || data.name);  
                return;  
              }  
  
              let viewed = null;  
  
              episodes.forEach((ep) => {  
                if (!ep || !ep.episode_number || !ep.season_number) return;  
                  
                const hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title || data.original_name].join(''));  
                const view = Lampa.Timeline.view(hash);  
  
                if (view && view.percent) viewed = {ep, view};  
              });  
  
              if (viewed && viewed.ep) {  
                badge.innerText = 'E' + viewed.ep.episode_number + 'S' + viewed.ep.season_number;  
                cardView.appendChild(badge);  
                console.log('Custom Episodes: Rendered badge for:', data.title || data.name);  
              } else {  
                console.log('Custom Episodes: No viewed episodes found for:', data.title || data.name);  
              }  
            } catch (e) {  
              console.error('Custom Episodes: Error processing episodes', e);  
            }  
          });  
        } else {  
          console.log('Custom Episodes: Skipping serial - requirements not met:', {  
            title: data.title || data.name,  
            reasons: [  
              !timetableAvailable ? 'Timetable unavailable' : null,  
              !hasValidId ? 'Invalid ID (not number)' : null,  
              !hasValidSource ? 'Invalid source (not tmdb/cub)' : null  
            ].filter(Boolean)  
          });  
        }  
      } catch (e) {  
        console.error('Custom Episodes: Error with Timetable', e);  
      }  
    }  
    // Для фильмов - формат 0:50/1:40  
    else {  
      try {  
        const hash = Lampa.Utils.hash([data.original_title || data.title || data.name].join(''));  
        const timeData = Lampa.Timeline.view(hash);  
  
        if (timeData && timeData.time && timeData.duration) {  
          const current = Lampa.Utils.secondsToTime(timeData.time);  
          const total = Lampa.Utils.secondsToTime(timeData.duration);  
          badge.innerText = current + '/' + total;  
          cardView.appendChild(badge);  
        }  
      } catch (e) {  
        console.error('Custom Episodes: Error processing movie', e);  
      }  
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
