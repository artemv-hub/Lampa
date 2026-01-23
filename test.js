(function () {  
  "use strict";  
  
  let manifest = {  
    type: 'other',  
    version: '3.7.12',  
    name: 'Watched Badge',  
    component: 'watched_badge'  
  };  
  
  Lampa.Manifest.plugins = manifest;  
  
  function getData(cardData) {  
    if (cardData.original_name) {  
      const totalSeasons = cardData.number_of_seasons;  
      for (let season = totalSeasons; season >= 1; season--) {  
        // Используем точное количество эпизодов из cardData.seasons  
        const episodeCount = cardData.seasons?.[season - 1]?.episode_count || 120;  
        for (let episode = episodeCount; episode >= 1; episode--) {  
          let hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''))  
          let timelineData = Lampa.Timeline.view(hash)  
          if (timelineData?.time > 0 || (timelineData?.percent > 0)) {  
            return { episode, season };  
          }  
        }  
      }  
    } else {  
      const hash = Lampa.Utils.hash([cardData.original_title || cardData.title].join(''));  
      return Lampa.Timeline.view(hash);  
    }  
    return null;  
  }  
  
  function formatWatched(timeData, cardData) {  
    if (!timeData || (!timeData.episode && !timeData.time)) {  
      return null;  
    }  
  
    if (timeData.episode && timeData.season) {  
      const totalSeasons = cardData.number_of_seasons || '?';  
      const totalEpisodes = cardData.seasons?.[timeData.season - 1]?.episode_count || '?';  
      return `S${timeData.season}/${totalSeasons} E${timeData.episode}/${totalEpisodes}`;  
    } else if (timeData.time && timeData.duration) {  
      const currentTime = Lampa.Utils.secondsToTime(timeData.time, true);  
      const totalTime = Lampa.Utils.secondsToTime(timeData.duration, true);  
      return `${currentTime}/${totalTime}`;  
    }  
    return null;  
  }  
  
  function renderWatchedBadge(cardElement, data) {  
    let badge = cardElement.querySelector('.card__view .card__watched');  
    const text = formatWatched(getData(data), data);  
      
    if (text) {  
      if (!badge) {  
        badge = document.createElement('div');  
        badge.className = 'card__watched';  
        cardElement.querySelector('.card__view').appendChild(badge);  
      }  
      badge.innerText = text;  
    } else if (badge) {  
      badge.remove();  
    }  
  }  
  
function processCards() {  
  // Получаем уникальные карточки с данными  
  const cardsWithData = Array.from(document.querySelectorAll('.card'))  
    .map(card => ({ card, data: card.card_data }))  
    .filter(({ data }) => data?.id && !card.hasAttribute('data-watched-processed'));  
    
  // Обрабатываем каждую карточку  
  const processCard = ({ card, data }) => {  
    // Устанавливаем активность и получаем таймкоды  
    Lampa.Storage.set('activity', { movie: data, card: data });  
    Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });  
      
    // Загружаем данные о сезонах для сериалов если нужно  
    if (data.original_name && !data.seasons && data.number_of_seasons) {  
      return new Promise(resolve => {  
        const seasonNumbers = Array.from({ length: data.number_of_seasons }, (_, i) => i + 1);  
          
        Lampa.Api.seasons(data, seasonNumbers, seasonsData => {  
          data.seasons = seasonNumbers.map(seasonNum => ({  
            season_number: seasonNum,  
            episode_count: seasonsData[seasonNum]?.episodes?.length || 0  
          }));  
            
          card.card_data = data;  
          setTimeout(resolve, 80);  
        });  
      });  
    }  
      
    return Promise.resolve();  
  };  
    
  // Обрабатываем все карточки и рендерим значки  
  Promise.all(cardsWithData.map(processCard))  
    .then(() => {  
      cardsWithData.forEach(({ card, data }) => {  
        card.setAttribute('data-watched-processed', 'true');  
        renderWatchedBadge(card, data);  
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






