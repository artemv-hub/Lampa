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
  
    // Для сериалов - формат E7S2  
    if (data.original_name) {  
      Lampa.Timetable.get(data, (episodes) => {  
        if (!episodes.length) return;  
  
        let viewed = null;  
  
        episodes.forEach((ep) => {  
          const hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_name].join(''));  
          const view = Lampa.Timeline.view(hash);  
  
          if (view.percent) viewed = {ep, view};  
        });  
  
        if (viewed) {  
          badge.innerText = 'E' + viewed.ep.episode_number + 'S' + viewed.ep.season_number;  
          cardView.appendChild(badge);  
        }  
      });  
    }  
    // Для фильмов - формат 0:50/1:40  
    else {  
      const hash = Lampa.Utils.hash([data.original_title].join(''));  
      const timeData = Lampa.Timeline.view(hash);  
  
      if (timeData && timeData.time && timeData.duration) {  
        const current = Lampa.Utils.secondsToTime(timeData.time);  
        const total = Lampa.Utils.secondsToTime(timeData.duration);  
        badge.innerText = current + '/' + total;  
        cardView.appendChild(badge);  
      }  
    }  
  }  
  
  function processCards() {  
    document.querySelectorAll('.card:not([data-episodes-processed])').forEach(cardElement => {  
      const cardData = cardElement.card_data;  
      if (!cardData) return;  
  
      cardElement.setAttribute('data-episodes-processed', 'true');  
      renderEpisodeBadge(cardElement, cardData);  
    });  
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
