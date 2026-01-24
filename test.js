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
    const seasonCount = cardData.number_of_seasons;  
    for (let season = seasonCount; season >= 1; season--) {  
      const episodeCount = cardData.seasons?.find(s => s.season_number === season)?.episode_count;  
      for (let episode = episodeCount; episode >= 1; episode--) {  
        let hash = Lampa.Utils.hash([season, season > 10 ? ':' : '', episode, cardData.original_title].join(''));  
        let timelineData = Lampa.Timeline.view(hash);  
          
        if (timelineData?.time > 0 || timelineData?.percent > 0) {  
          return { season, seasonCount, episode, episodeCount };  
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
    return `S${timeData.season}/${timeData.seasonCount} E${timeData.episode}/${timeData.episodeCount}`;  
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
  const cards = Array.from(document.querySelectorAll('.card'))  
  Promise.all(cards.map(card => {  
    const data = card.card_data;  
    Lampa.Storage.set('activity', { movie: data, card: data });  
    Lampa.Listener.send('lampac', { type: 'timecode_pullFromServer' });  
      
if (data.original_name && !data.seasons && data.number_of_seasons) {  
  return new Promise(resolve => {  
    const seasons = Array.from({ length: data.number_of_seasons }, (_, i) => i + 1);  
    Lampa.Api.seasons(data, seasons, seasonsData => {  
      data.seasons = seasons.map(num => ({      
        season_number: num,      
        episode_count: seasonsData[num]?.episodes?.length || 0      
      }));  
      setTimeout(resolve, 20);  
    });  
  });  
}  
  
// Во всех остальных случаях - сразу resolved Promise  
return Promise.resolve();
  })).then(() => cards.forEach(card => renderWatchedBadge(card, card.card_data)));
}
  
Lampa.Listener.follow('activity', function (e) {  
  if (e.type == 'start' || e.type == 'page') {  
    processCards();  
  }  
});  
  
var observer = new MutationObserver(function (mutations) {    
  mutations.forEach(function (mutation) {    
    mutation.addedNodes.forEach(function (node) {    
      if (node.nodeType === 1 && node.classList?.contains('card')) {  
        //processCards();    
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









