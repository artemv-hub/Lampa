(function() {  
    'use strict';  
  
    let manifest = {  
        type: 'other',  
        version: '1.0.0',  
        name: 'Custom Progress Display',  
        description: 'Отображает прогресс просмотра всегда'  
    };  
  
    Lampa.Manifest.plugins = manifest;  
  
    function startPlugin() {  
        // Проверяем версию Lampa  
        if (Lampa.Manifest.app_digital < 300) {  
            console.log('Плагин требует Lampa 3.0+');  
            return;  
        }  
  
        // Отключаем стандартное отображение  
        Lampa.Storage.set('card_episodes', false, true);  
  
        // CSS стили  
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
                }  
            </style>  
        `;  
  
        Lampa.Template.add('custom_progress_css', style);  
        $('body').append(Lampa.Template.get('custom_progress_css', {}, true));  
  
        // Функция получения прогресса  
        function getContentProgress(card, callback) {  
            if (card.original_name) {  
                // Сериал  
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
            } else if (card.original_title) {  
                // Фильм  
                let hash = Lampa.Utils.hash(card.original_title);  
                let time = Lampa.Timeline.view(hash);  
                  
                if (time.time && time.duration) {  
                    callback(Lampa.Utils.secondsToTimeHuman(time.time) + ' / ' +   
                            Lampa.Utils.secondsToTimeHuman(time.duration));  
                } else {  
                    callback(null);  
                }  
            } else {  
                callback(null);  
            }  
        }  
  
        // Переопределяем модуль Create для Card  
        let originalCreate = Lampa.Maker.map('Card').Create;  
          
        Lampa.Maker.map('Card').Create = {  
            onCreateAndAppend: function() {  
                // Вызываем оригинальный метод  
                if (originalCreate.onCreateAndAppend) {  
                    originalCreate.onCreateAndAppend.call(this);  
                }  
  
                // Добавляем свой прогресс  
                let addProgress = () => {  
                    getContentProgress(this.data, (progressText) => {  
                        if (progressText) {  
                            let oldProgress = this.card.querySelector('.card-progress-custom');  
                            if (oldProgress) oldProgress.remove();  
  
                            let progressElement = document.createElement('div');  
                            progressElement.className = 'card-progress-custom';  
                            progressElement.innerText = progressText;  
                              
                            let view = this.card.querySelector('.card__view');  
                            if (view) view.appendChild(progressElement);  
                        }  
                    });  
                };  
  
                setTimeout(addProgress, 100);  
            }  
        };  
    }  
  
    // Запуск плагина  
    if (window.appready) startPlugin();  
    else {  
        Lampa.Listener.follow('app', (e) => {  
            if (e.type === 'ready') startPlugin();  
        });  
    }  
})();