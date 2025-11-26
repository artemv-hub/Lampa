(function() {  
    'use strict';  
      
    function startPlugin() {  
        if (!window.Lampa || !Lampa.Card) return;  
          
        // Используем Lampa.Maker для правильного переопределения модуля  
        if (Lampa.Maker && Lampa.Maker.map) {  
            let watchedModule = Lampa.Maker.map('Card').Watched;  
              
            if (watchedModule) {  
                // Переопределяем метод onWatched в модуле  
                watchedModule.onWatched = function() {  
                    if (!Lampa.Storage.field('card_episodes')) return;  
                      
                    if (!this.watched_checked) {  
                        let data = this.data;  
                          
                        function get(callback) {  
                            if (data.original_name) Lampa.Timetable.get(data, callback);  
                            else callback([]);  
                        }  
                          
                        get((episodes, from_db) => {  
                            let viewed;  
                              
                            let Draw = () => {  
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
                                  
                                // Главное изменение для фильмов  
                                if (!viewed && !data.original_name) {  
                                    let time = Lampa.Timeline.watched(data, true);  
                                      
                                    if (time.percent) {  
                                        viewed = {  
                                            ep: {  
                                                // Всегда используем формат времени  
                                                name: Lampa.Lang.translate('title_viewed') + ' ' + Lampa.Utils.secondsToTime(time.time, true) + '/' + Lampa.Utils.secondsToTime(time.duration, true),  
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
                                  
                                if (viewed) {  
                                    let wrap = Lampa.Template.js('card_watched', {});  
                                      
                                    let div = document.createElement('div');  
                                    let span = document.createElement('span');  
                                      
                                    div.addClass('card-watched__item');  
                                    div.append(span);  
                                      
                                    span.innerText = viewed.ep.name;  
                                      
                                    if (viewed.view) {  
                                        let timeline = Lampa.Timeline.render(viewed.view)[0];  
                                          
                                        // Обновляем текст в таймлайне  
                                        if (!data.original_name) {  
                                            let details = timeline.find('.time-line-details');  
                                            if (details.length > 0) {  
                                                details.text(Lampa.Utils.secondsToTime(viewed.view.time, true) + '/' + Lampa.Utils.secondsToTime(viewed.view.duration, true));  
                                            }  
                                        }  
                                          
                                        div.append(timeline);  
                                    }  
                                      
                                    wrap.find('.card-watched__body').append(div);  
                                      
                                    this.watched_wrap = wrap;  
                                    let view = this.html.find('.card__view');  
                                    view.insertBefore(wrap, view.firstChild);  
                                }  
                            };  
                              
                            Draw();  
                        });  
                          
                        this.watched_checked = true;  
                    }  
                };  
                  
                console.log('[Time Progress Fix] Module overridden successfully');  
            }  
        }  
    }  
      
    if (window.Lampa) {  
        startPlugin();  
    } else {  
        window.addEventListener('lampa:ready', startPlugin);  
    }  
})();