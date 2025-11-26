(function() {  
    'use strict';  
      
    function safeFormatTime(seconds) {  
        if (!seconds || typeof seconds !== 'number' || seconds < 0) return '0:00';  
          
        try {  
            const hours = Math.floor(seconds / 3600);  
            const minutes = Math.floor((seconds % 3600) / 60);  
            const secs = Math.floor(seconds % 60);  
              
            return hours > 0   
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`  
                : `${minutes}:${secs.toString().padStart(2, '0')}`;  
        } catch (e) {  
            console.error('[Time Progress] Format error:', e);  
            return '0:00';  
        }  
    }  
      
    function initPlugin() {  
        try {  
            // Проверяем базовые зависимости  
            if (!window.Lampa || !Lampa.Card || !Lampa.Card.module || !Lampa.Card.module.watched) {  
                console.log('[Time Progress] Dependencies not ready, retrying...');  
                setTimeout(initPlugin, 1000);  
                return;  
            }  
              
            const watchedModule = Lampa.Card.module.watched;  
            const originalOnWatched = watchedModule.onWatched;  
              
            // Сохраняем оригинал для fallback  
            watchedModule._originalOnWatched = originalOnWatched;  
              
            watchedModule.onWatched = function() {  
                try {  
                    // Используем оригинальную логику с безопасным выполнением  
                    if (!Lampa.Storage.field('card_episodes')) return;  
                      
                    if (!this.watched_checked) {  
                        const data = this.data;  
                          
                        if (!data) {  
                            console.warn('[Time Progress] No card data');  
                            return;  
                        }  
                          
                        const get = (callback) => {  
                            try {  
                                if (data.original_name) {  
                                    Lampa.Timetable.get(data, callback);  
                                } else {  
                                    callback([]);  
                                }  
                            } catch (e) {  
                                console.error('[Time Progress] Timetable error:', e);  
                                callback([]);  
                            }  
                        };  
                          
                        get((episodes, from_db) => {  
                            try {  
                                let viewed;  
                                  
                                const Draw = () => {  
                                    try {  
                                        // Стандартная логика поиска  
                                        if (episodes && episodes.length > 0) {  
                                            episodes.forEach(ep => {  
                                                try {  
                                                    const hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title].join(''));  
                                                    const view = Lampa.Timeline.view(hash);  
                                                      
                                                    if (view && view.percent) viewed = {ep, view};  
                                                } catch (e) {  
                                                    console.error('[Time Progress] Episode processing error:', e);  
                                                }  
                                            });  
                                        }  
                                          
                                        // Для фильмов - главное изменение  
                                        if (!viewed && !data.original_name) {  
                                            try {  
                                                const time = Lampa.Timeline.watched(data, true);  
                                                  
                                                if (time && time.percent && typeof time.time === 'number' && typeof time.duration === 'number') {  
                                                    viewed = {  
                                                        ep: {  
                                                            name: Lampa.Lang.translate('title_viewed') + ' ' + safeFormatTime(time.time) + '/' + safeFormatTime(time.duration),  
                                                        },  
                                                        view: time  
                                                    };  
                                                }  
                                            } catch (e) {  
                                                console.error('[Time Progress] Timeline processing error:', e);  
                                                // Fallback к оригинальной логике  
                                                return originalOnWatched.call(this);  
                                            }  
                                        }  
                                          
                                        // Рендеринг с защитой  
                                        if (viewed) {  
                                            try {  
                                                const wrap = Lampa.Template.js('card_watched', {});  
                                                const div = document.createElement('div');  
                                                const span = document.createElement('span');  
                                                  
                                                div.addClass('card-watched__item');  
                                                div.append(span);  
                                                  
                                                if (viewed.ep && viewed.ep.name) {  
                                                    span.innerText = viewed.ep.name;  
                                                }  
                                                  
                                                if (viewed.view) {  
                                                    const timeline = Lampa.Timeline.render(viewed.view)[0];  
                                                      
                                                    if (!data.original_name && timeline) {  
                                                        const details = timeline.find('.time-line-details');  
                                                        if (details.length > 0 && viewed.view.time && viewed.view.duration) {  
                                                            details.text(safeFormatTime(viewed.view.time) + '/' + safeFormatTime(viewed.view.duration));  
                                                        }  
                                                    }  
                                                      
                                                    div.append(timeline);  
                                                }  
                                                  
                                                wrap.find('.card-watched__body').append(div);  
                                                  
                                                this.watched_wrap = wrap;  
                                                const view = this.html.find('.card__view');  
                                                if (view.length > 0) {  
                                                    view.insertBefore(wrap, view.firstChild);  
                                                }  
                                            } catch (e) {  
                                                console.error('[Time Progress] Render error:', e);  
                                            }  
                                        }  
                                    } catch (e) {  
                                        console.error('[Time Progress] Draw error:', e);  
                                    }  
                                };  
                                  
                                Draw();  
                            } catch (e) {  
                                console.error('[Time Progress] Callback error:', e);  
                            }  
                        });  
                          
                        this.watched_checked = true;  
                    }  
                } catch (e) {  
                    console.error('[Time Progress] onWatched error:', e);  
                    // В случае ошибки используем оригинальный метод  
                    if (watchedModule._originalOnWatched) {  
                        return watchedModule._originalOnWatched.call(this);  
                    }  
                }  
            };  
              
            console.log('[Time Progress] Plugin loaded safely');  
        } catch (e) {  
            console.error('[Time Progress] Init error:', e);  
            setTimeout(initPlugin, 2000);  
        }  
    }  
      
    // Запуск с проверкой  
    if (window.Lampa) {  
        setTimeout(initPlugin, 500);  
    } else {  
        window.addEventListener('lampa:ready', initPlugin);  
    }  
})();