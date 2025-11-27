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
    if (!cardView) return;    
    
    const oldBadge = cardView.querySelector('.card__watched');    
    if (oldBadge) oldBadge.remove();    
    
    const badge = document.createElement('div');    
    badge.className = 'card__watched';    
    
    // Фильмы - работающий Timeline    
    if (!data.original_name) {    
      const hash = Lampa.Utils.hash([data.original_title || data.title || data.name].join(''));    
      const timeData = Lampa.Timeline.view(hash);    
    
      if (timeData && timeData.percent) {    
        const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);    
        const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);    
        badge.innerText = `${currentTime}/${totalTime}`;    
        cardView.appendChild(badge);    
      }    
    }    
    // Сериалы - работающий fallback storage    
    else {    
      const hash = Lampa.Utils.hash([data.original_name || data.name].join(''));    
      const watched = Lampa.Storage.get('online_watched_last', {})[hash];    
    
      if (watched && watched.episode) {    
        const currentEp = watched.episode;    
        const currentSeason = watched.season || 1;    
        badge.innerText = `E${currentEp} S${currentSeason}`;    
        cardView.appendChild(badge);    
      }    
    }    
  }    
    
  function processCards() {    
    const cards = document.querySelectorAll('.card:not([data-episodes-processed])');    
    console.log(`[Processing cards:] ${cards.length}`);    
      
    cards.forEach(card => {    
      card.setAttribute('data-episodes-processed', 'true');    
      const data = card.card_data;    
      if (data) renderEpisodeBadge(card, data);    
    });    
  }    
    
  // Инициализация    
  Lampa.Listener.follow('activity', (e) => {    
    if (e.type == 'start' || e.type == 'page') {    
      setTimeout(processCards, 100);    
    }    
  });    
    
  const observer = new MutationObserver(() => processCards());    
  observer.observe(document.body, { childList: true, subtree: true });    
    
  // CSS    
  Lampa.Template.add('custom_episodes_css', `    
    <style>    
    .card__watched {    
      position: absolute; bottom: 5px; right: 5px;    
      background: rgba(0, 0, 0, 0.8); color: white;    
      padding: 2px 6px; border-radius: 3px;    
      font-size: 11px; z-index: 10;    
    }    
    </style>    
  `);    
  $('body').append(Lampa.Template.get('custom_episodes_css', {}, true));    
  processCards();    
})();
