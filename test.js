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
  function loadAndGetData(cardData) {  
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
  function formatTimeDisplay(timeData) {  
    if (!timeData) return null;  
      
    if (timeData.episode && timeData.season) {  
      return `E${timeData.episode} S${timeData.season || 1}`;  
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
    if (!cardView) return;  
  
    const oldBadge = cardView.querySelector('.card__watched');  
    if (oldBadge) oldBadge.remove();  
  
    const timeData = loadAndGetData(data);  
    const displayText = formatTimeDisplay(timeData);  
      
    if (displayText) {  
      const badge = document.createElement('div');  
      badge.className = 'card__watched';  
      badge.innerText = displayText;  
      cardView.appendChild(badge);  
    }  
  }  
  
  // === ИНИЦИАЛИЗАЦИЯ ===  
  function init() {  
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
  
    // Загрузка данных для всех карточек  
    uniqueCards.forEach((cardData, index) => {  
      setTimeout(() => {  
        Lampa.Storage.set('activity', {  
          movie: cardData,  
          card: cardData  
        });  
          
        Lampa.Listener.send('lampac', {  
          type: 'timecode_pullFromServer'  
        });  
      }, index * 100);  
    });  
  
    // Отображение бейджей после загрузки  
    setTimeout(() => {  
      document.querySelectorAll('.card:not([data-watched-processed])').forEach(card => {  
        card.setAttribute('data-watched-processed', 'true');  
        if (card.card_data) renderWatchedBadge(card, card.card_data);  
      });  
    }, uniqueCards.length * 100 + 200);  
  }  
  
  // События  
  Lampa.Listener.follow('activity', function (e) {  
    if (e.type == 'start' || e.type == 'page') {  
      setTimeout(init, 100);  
    }  
  });  
  
  var observer = new MutationObserver(function (mutations) {  
    mutations.forEach(function (mutation) {  
      mutation.addedNodes.forEach(function (node) {  
        if (node.nodeType === 1 && node.classList && node.classList.contains('card')) {  
          node.addEventListener('visible', function () {  
            if (!node.hasAttribute('data-watched-processed')) {  
              init();  
            }  
          });  
        }  
      });  
    });  
  });  
  
  observer.observe(document.body, { childList: true, subtree: true });  
  
  const style = document.createElement('style');  
  style.textContent = `  
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
  `;  
  document.head.appendChild(style);  
  
  init();  
})();