(function () {  
    'use strict';  
  
    // Функция получения прогресса из SQL  
    async function getContentProgress(card, callback) {  
        let card_id = card.id;  
        let response = await fetch(`/timecode/all?card_id=${card_id}`);  
        let timecodes = await response.json();  
          
        // Сериал  
        if (card.original_name) {  
            let lastItem = null;  
            let lastUpdated = 0;  
              
            for (let item_id in timecodes) {  
                let data = JSON.parse(timecodes[item_id]);  
                if (data.updated && data.updated > lastUpdated) {  
                    lastUpdated = data.updated;  
                    lastItem = item_id;  
                }  
            }  
              
            if (lastItem) {  
                let match = lastItem.match(/s(\d+)e(\d+)/i);  
                if (match) {  
                    let currentSeason = parseInt(match[1]);  
                    let currentEpisode = parseInt(match[2]);  
                    let totalSeasons = card.number_of_seasons || 1;  
                      
                    Lampa.Timetable.get(card, (episodes) => {  
                        let seasonEpisodes = episodes.filter(ep => ep.season_number === currentSeason);  
                        let totalEpisodes = seasonEpisodes.length;  
                          
                        callback(`E${currentEpisode}/${totalEpisodes} S${currentSeason}/${totalSeasons}`);  
                    });  
                    return;  
                }  
            }  
            callback(null);  
        }  
        // Фильм  
        else if (card.original_title) {  
            let item_id = 'movie';  
              
            if (timecodes[item_id]) {  
                let data = JSON.parse(timecodes[item_id]);  
                let currentTime = data.time;  
                let totalTime = data.duration;  
                  
                if (currentTime && totalTime) {  
                    callback(`${Lampa.Utils.secondsToTimeHuman(currentTime)} / ${Lampa.Utils.secondsToTimeHuman(totalTime)}`);  
                    return;  
                }  
            }  
            callback(null);  
        }  
    }  
  
    // Добавляем CSS стили  
    Lampa.Template.add('progress_style', `  
        <style>  
        .card-progress {  
            position: absolute;  
            bottom: 5px;  
            right: 5px;  
            background: rgba(0, 0, 0, 0.8);  
            color: white;  
            padding: 3px 8px;  
            border-radius: 3px;  
            font-size: 12px;  
            z-index: 2;  
        }  
        </style>  
    `);  
      
    $('body').append(Lampa.Template.get('progress_style'));  
  
    // Функция добавления прогресса на карточку  
    function addProgressToCard(cardElement) {  
        let cardData = cardElement.data('card');  
          
        if (!cardData || cardElement.find('.card-progress').length > 0) {  
            return;  
        }  
          
        let progressElement = $('<div class="card-progress"></div>');  
        cardElement.find('.card-img').append(progressElement);  
          
        getContentProgress(cardData, (progressText) => {  
            if (progressText) {  
                progressElement.text(progressText);  
            } else {  
                progressElement.remove();  
            }  
        });  
    }  
  
    // Отслеживаем появление карточек  
    Lampa.Listener.follow('full', function(e) {  
        if (e.type == 'complite') {  
            $('.card').each(function() {  
                addProgressToCard($(this));  
            });  
        }  
    });  
  
    // Также обрабатываем динамически добавляемые карточки  
    let observer = new MutationObserver(function(mutations) {  
        mutations.forEach(function(mutation) {  
            mutation.addedNodes.forEach(function(node) {  
                if (node.nodeType === 1) {  
                    let cards = $(node).find('.card');  
                    if ($(node).hasClass('card')) {  
                        cards = cards.add(node);  
                    }  
                    cards.each(function() {  
                        addProgressToCard($(this));  
                    });  
                }  
            });  
        });  
    });  
  
    observer.observe(document.body, {  
        childList: true,  
        subtree: true  
    });  
  
})();