(function () {  
    'use strict';  
  
    // Получаем uid пользователя  
    function getAuthParams() {  
        let params = new URLSearchParams();  
          
        var unic_id = Lampa.Storage.get('lampac_unic_id', '');  
        if (!unic_id) {  
            unic_id = Lampa.Utils.uid(8).toLowerCase();  
            Lampa.Storage.set('lampac_unic_id', unic_id);  
        }  
          
        if (unic_id) {  
            params.append('uid', unic_id);  
        }  
          
        return params.toString();  
    }  
  
    // Функция получения прогресса из SQL  
    async function getContentProgress(card, callback) {  
        let card_id = card.id;  
        let authParams = getAuthParams();  
          
        let url = `/timecode/all?card_id=${card_id}`;  
        if (authParams) {  
            url += `&${authParams}`;  
        }  
          
        let response = await fetch(url);  
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
  
    // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Переопределяем базовую функцию Lampa  
    // Сохраняем оригинальную функцию  
    let originalCardRender = Lampa.Template.get;  
      
    // Переопределяем Template.get для перехвата рендеринга карточек  
    Lampa.Template.get = function(name, data) {  
        let result = originalCardRender.apply(this, arguments);  
          
        if (name === 'card' && data) {  
            // Добавляем наш прогресс после рендеринга карточки  
            setTimeout(() => {  
                let cardElement = $('.card').filter(function() {  
                    return $(this).data('card')?.id === data.id;  
                }).first();  
                  
                if (cardElement.length && !cardElement.data('progress-added')) {  
                    cardElement.data('progress-added', true);  
                      
                    // Удаляем базовый прогресс Lampa  
                    cardElement.find('.card__view').remove();  
                      
                    // Добавляем наш прогресс  
                    let progressElement = $('<div class="card-progress"></div>');  
                    cardElement.find('.card-img').append(progressElement);  
                      
                    getContentProgress(data, (progressText) => {  
                        if (progressText) {  
                            progressElement.text(progressText).show();  
                        } else {  
                            progressElement.remove();  
                        }  
                    });  
                }  
            }, 100);  
        }  
          
        return result;  
    };  
  
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
            z-index: 3;  
            display: none;  
        }  
        /* Скрываем базовый прогресс Lampa */  
        .card__view {  
            display: none !important;  
        }  
        </style>  
    `);  
      
    $('body').append(Lampa.Template.get('progress_style'));  
  
})();