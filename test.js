(function() {  
    'use strict';  
  
    // Манифест плагина  
    let manifest = {  
        type: 'other',  
        version: '1.0.0',  
        name: 'Custom Progress Display',  
        description: 'Отображает прогресс просмотра всегда, а не только при наведении'  
    };  
  
    Lampa.Manifest.plugins = manifest;  
  
    function startPlugin() {  
        // Отключаем стандартное отображение  
        Lampa.Storage.set('card_episodes', false, true);  
  
        // Добавляем CSS для постоянного отображения  
        let style = `  
            <style>  
                .card-progress-custom {  
                    position: absolute;  
                    bottom: 0.5em;  
                    left: 0.5em;  
                    right: 0.5em;  
                    background: rgba(0, 0, 0, 0.9);  
                    padding: 0.5em 0.8em;  
                    border-radius: 0.5em;  
                    color: #fff;  
                    font-size: 0.9em;  
                    z-index: 2;  
                    pointer-events: none;  
                    white-space: nowrap;  
                    overflow: hidden;  
                    text-overflow: ellipsis;  
                }  
            </style>  
        `;  
  
        Lampa.Template.add('custom_progress_css', style);  
        $('body').append(Lampa.Template.get('custom_progress_css', {}, true));  
  
        // Функция получения прогресса  
        function getContentProgress(card, callback) {  
            // Сериал  
            if (card.original_name) {  
                let last = Lampa.Storage.get('online_watched_last', '{}');  
                let filed = last[Lampa.Utils.hash(card.original_title)];  
                  
                if (filed && filed.episode && filed.season) {  
                    let totalSeasons = card.number_of_seasons || 1;  
                      
                    Lampa.Timetable.get(card, (episodes) => {  
                        let currentSeasonEpisodes = episodes.filter(ep => ep.season_number === filed.season);  
                        let totalEpisodes = currentSeasonEpisodes.length || '?';  
                          
                        callback(`E${filed.episode}/${totalEpisodes} S${filed.season}/${totalSeasons}`);  
                    });  
                } else {  
                    callback(null);  
                }  
            }  
            // Фильм  
            else if (card.original_title) {  
                let hash = Lampa.Utils.hash(card.original_title);  
                let time = Lampa.Timeline.view(hash);  
                  
                if (time.time && time.duration) {  
                    callback(Lampa.Utils.secondsToTimeHuman(time.time) + ' / ' +   
                            Lampa.Utils.secondsToTimeHuman(time.duration));  
                } else {  
                    callback(null);  
                }  
            }  
            else {  
                callback(null);  
            }  
        }  
  
        // Сохраняем оригинальный конструктор Card  
        let OriginalCard = Lampa.Card;  
  
        // Переопределяем конструктор Card  
        Lampa.Card = function(data, params) {  
            let card = new OriginalCard(data, params);  
              
            // Добавляем свой прогресс после создания карточки  
            let addCustomProgress = () => {  
                getContentProgress(data, (progressText) => {  
                    if (progressText) {  
                        // Удаляем старый элемент, если есть  
                        let oldProgress = card.card.querySelector('.card-progress-custom');  
                        if (oldProgress) oldProgress.remove();  
  
                        // Создаем новый элемент  
                        let progressElement = document.createElement('div');  
                        progressElement.className = 'card-progress-custom';  
                        progressElement.innerText = progressText;  
                          
                        let view = card.card.querySelector('.card__view');  
                        if (view) view.appendChild(progressElement);  
                    }  
                });  
            };  
  
            // Добавляем прогресс при создании  
            card.card.addEventListener('visible', () => {  
                setTimeout(addCustomProgress, 100);  
            });  
  
            // Обновляем при изменении Timeline  
            let updateListener = (e) => {  
                if (e.target === 'timeline' && (e.reason === 'read' || e.reason === 'update')) {  
                    addCustomProgress();  
                }  
            };  
  
            Lampa.Listener.follow('state:changed', updateListener);  
  
            // Сохраняем оригинальный destroy  
            let originalDestroy = card.destroy;  
            card.destroy = function() {  
                Lampa.Listener.remove('state:changed', updateListener);  
                if (originalDestroy) originalDestroy.call(card);  
            };  
  
            return card;  
        };  
  
        // Копируем все свойства оригинального конструктора  
        for (let key in OriginalCard) {  
            if (OriginalCard.hasOwnProperty(key)) {  
                Lampa.Card[key] = OriginalCard[key];  
            }  
        }  
        Lampa.Card.prototype = OriginalCard.prototype;  
    }  
  
    // Запускаем плагин  
    if (window.appready) startPlugin();  
    else {  
        Lampa.Listener.follow('app', (e) => {  
            if (e.type === 'ready') startPlugin();  
        });  
    }  
})();