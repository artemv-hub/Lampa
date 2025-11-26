(function() {  
    'use strict';  
      
    // Простая функция форматирования времени  
    function formatTime(seconds) {  
        if (!seconds) return '0:00';  
          
        const hours = Math.floor(seconds / 3600);  
        const minutes = Math.floor((seconds % 3600) / 60);  
        const secs = Math.floor(seconds % 60);  
          
        return hours > 0   
            ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`  
            : `${minutes}:${secs.toString().padStart(2, '0')}`;  
    }  
      
    // Ждём загрузки Lampa  
    function init() {  
        if (window.Lampa && Lampa.Card && Lampa.Card.module && Lampa.Card.module.watched) {  
            // Сохраняем оригинальную функцию  
            const originalOnWatched = Lampa.Card.module.watched.onWatched;  
              
            // Переопределяем только нужную часть  
            Lampa.Card.module.watched.onWatched = function() {  
                if (!Lampa.Storage.field('card_episodes')) return;  
                  
                if (!this.watched_checked) {  
                    let data = this.data;  
                      
                    function get(callback) {  
                        if (data.original_name) Lampa.Timetable.get(data, callback);  
                        else callback([]);  
                    }  
                      
                    get((episodes, from_db) => {  
                        let viewed;  
                          
                        // Стандартная логика поиска просмотренного  
                        episodes.forEach(ep => {  
                            let hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title].join(''));  
                            let view = Lampa.Timeline.view(hash);  
                              
                            if (view.percent) viewed = {ep, view};  
                        });  
                          
                        if (!viewed && data.original_name) {  
                            let last = Lampa.Storage.get('online_watched_last', '{}');  
                            let filed = last[Lampa.Utils.hash(data.original_title)];  
                              
                            if (filed && filed.episode) {  
                                viewed = {  
                                    ep: {  
                                        episode_number: filed.episode,  
                                        name: Lampa.Lang.translate('full_episode') + ' ' + filed.episode,  
                                    },  
                                    view: Lampa.Timeline.view(Lampa.Utils.hash([filed.season, filed.season > 10 ? ':' : '', filed.episode, data.original_title].join('')))  
                                };  
                            }  
                        }  
                          
                        // Главное изменение: для фильмов всегда время  
                        if (!viewed && !data.original_name) {  
                            let time = Lampa.Timeline.watched(data, true);  
                              
                            if (time.percent) {  
                                viewed = {  
                                    ep: {  
                                        // Вместо условия time.time ? ... : time.percent всегда используем время  
                                        name: Lampa.Lang.translate('title_viewed') + ' ' + formatTime(time.time) + '/' + formatTime(time.duration),  
                                    },  
                                    view: time  
                                };  
                            }  
                        }  
                          
                        if (!viewed && data.original_name) {  
                            let any = Lampa.Timeline.watched(data, true).pop();  
                              
                            if (any) viewed = {ep: {  
                                name: Lampa.Lang.translate('full_episode') + ' ' + any.ep,  
                            }, view: any.view};  
                        }  
                          
                        // Дальше стандартный код рендеринга  
                        if (viewed) {  
                            let wrap = Lampa.Template.js('card_watched', {});  
                              
                            // Создаем элемент для просмотренного  
                            let div = document.createElement('div');  
                            let span = document.createElement('span');  
                              
                            div.addClass('card-watched__item');  
                            div.append(span);  
                              
                            span.innerText = viewed.ep.name;  
                              
                            if (viewed.view) {  
                                let timeline = Lampa.Timeline.render(viewed.view)[0];  
                                  
                                // Обновляем текст в таймлайне для фильмов  
                                if (!data.original_name) {  
                                    let details = timeline.find('.time-line-details');  
                                    if (details.length > 0) {  
                                        details.text(formatTime(viewed.view.time) + '/' + formatTime(viewed.view.duration));  
                                    }  
                                }  
                                  
                                div.append(timeline);  
                            }  
                              
                            wrap.find('.card-watched__body').append(div);  
                              
                            this.watched_wrap = wrap;  
                            let view = this.html.find('.card__view');  
                            view.insertBefore(wrap, view.firstChild);  
                        }  
                    });  
                      
                    this.watched_checked = true;  
                }  
            };  
              
            console.log('[Simple Time Format] Plugin loaded');  
        } else {  
            setTimeout(init, 100);  
        }  
    }  
      
    init();  
})();