(function() {  
    'use strict';  
      
    if (!window.Lampa) return;  
      
    // Функция форматирования времени в короткий формат  
    function formatTimeShort(seconds) {  
        if (!seconds) return '0:00';  
          
        const hours = Math.floor(seconds / 3600);  
        const minutes = Math.floor((seconds % 3600) / 60);  
        const secs = Math.floor(seconds % 60);  
          
        if (hours > 0) {  
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;  
        } else {  
            return `${minutes}:${secs.toString().padStart(2, '0')}`;  
        }  
    }  
      
    // Переопределяем функцию watched в Timeline для фильмов  
    if (Lampa.Timeline) {  
        const originalWatched = Lampa.Timeline.watched;  
          
        Lampa.Timeline.watched = function(card, return_time = false) {  
            const result = originalWatched.call(this, card, return_time);  
              
            // Для фильмов всегда возвращаем время вместо процентов  
            if (!card.original_name && return_time && result && result.percent) {  
                return {  
                    ...result,  
                    formatted_time: formatTimeShort(result.time) + '/' + formatTimeShort(result.duration)  
                };  
            }  
              
            return result;  
        };  
    }  
      
    // Переопределяем onWatched в карточках  
    if (Lampa.Card && Lampa.Card.module && Lampa.Card.module.watched) {  
        const originalOnWatched = Lampa.Card.module.watched.onWatched;  
          
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
                      
                    let Draw = () => {  
                        episodes.forEach(ep => {  
                            let hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title].join(''));  
                            let view = Lampa.Timeline.view(hash);  
                              
                            if (view.percent) viewed = {ep, view};  
                        });  
                          
                        // Для сериалов - последний просмотренный  
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
                          
                        // Для фильмов - всегда показываем время  
                        if (!viewed && !data.original_name) {  
                            let time = Lampa.Timeline.watched(data, true);  
                              
                            if (time.percent) {  
                                viewed = {  
                                    ep: {  
                                        name: Lampa.Lang.translate('title_viewed') + ' ' + formatTimeShort(time.time) + '/' + formatTimeShort(time.duration),  
                                    },  
                                    view: time  
                                };  
                            }  
                        }  
                          
                        // Для сериалов - любой просмотренный эпизод  
                        if (!viewed && data.original_name) {  
                            let any = Lampa.Timeline.watched(data, true).pop();  
                              
                            if (any) viewed = {ep: {  
                                name: Lampa.Lang.translate('full_episode') + ' ' + any.ep,  
                            }, view: any.view};  
                        }  
                          
                        if (viewed) {  
                            let soon = [];  
                            let next = episodes.slice(episodes.indexOf(viewed.ep)).filter(ep => ep.air_date).filter(ep => {  
                                let date = Lampa.Utils.parseToDate(ep.air_date).getTime();  
                                  
                                if (date > Date.now()) soon.push(ep);  
                                  
                                return date < Date.now();  
                            }).slice(0, 5);  
                              
                            if (next.length == 0) next = [viewed.ep];  
                              
                            if (soon.length && next.length < 5 && !next.find(n => n.episode_number == soon[0].episode_number)) next.push(soon[0]);  
                              
                            let wrap = Lampa.Template.js('card_watched', {});  
                              
                            next.forEach(ep => {  
                                let div = document.createElement('div');  
                                let span = document.createElement('span');  
                                let date = Lampa.Utils.parseToDate(ep.air_date);  
                                let now = Date.now();  
                                let days = Math.ceil((date.getTime() - now) / (24 * 60 * 60 * 1000));  
                                  
                                div.addClass('card-watched__item');  
                                div.append(span);  
                                  
                                span.innerText = (ep.episode_number ? ep.episode_number + ' - ' : '') + (days > 0 ? Lampa.Lang.translate('full_episode_days_left') + ': ' + days : (ep.name || Lampa.Lang.translate('noname')));  
                                  
                                if (ep == viewed.ep) {  
                                    let timeline = Lampa.Timeline.render(viewed.view)[0];  
                                      
                                    // Обновляем текст в таймлайне  
                                    let details = timeline.find('.time-line-details');  
                                    if (details.length > 0) {  
                                        details.text(formatTimeShort(viewed.view.time) + '/' + formatTimeShort(viewed.view.duration));  
                                    }  
                                      
                                    div.append(timeline);  
                                }  
                                  
                                wrap.find('.card-watched__body').append(div);  
                            });  
                              
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
    }  
      
    // Принудительное обновление карточек  
    setTimeout(() => {  
        $('.card').each(function() {  
            let card = $(this).data('card');  
            if (card && card.emit) {  
                card.emit('update');  
            }  
        });  
    }, 2000);  
      
    console.log('[Always Time Progress v2] Plugin loaded');  
})();