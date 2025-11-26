function startPlugin() {  
    'use strict';  
      
    window.plugin_custom_episodes_ready = true;  
  
    const manifest = {  
        type: 'modification',  
        version: '1.0.0',  
        name: 'Custom Episodes',  
        description: 'Кастомное отображение прогресса на карточках',  
        component: 'custom_episodes',  
    };  
      
    Lampa.Manifest.plugins = manifest;  
  
    // Сохраняем оригинальные функции  
    const originalCreate = Lampa.Card.prototype.create;  
    const originalUpdate = Lampa.Card.prototype.update;  
      
    Lampa.Card.prototype.create = function() {  
        'use strict';  
          
        const result = originalCreate.call(this);  
          
        // Переопределяем watched функцию  
        this.watched = function() {  
            'use strict';  
              
            if (this.watched_checked) return;  
              
            this.watched_checked = true;  
              
            const data = this.data; // ИСПРАВЛЕНО: this.object -> this.data  
              
            if (!data) return;  
              
            // Для сериалов  
            if (data.original_name) {  
                Timetable.get(data, (episodes) => { // ИСПРАВЛЕНО: Lampa.TimeTable -> Timetable  
                    'use strict';  
                      
                    if (!episodes.length) return;  
                      
                    let viewed = null;  
                      
                    episodes.forEach((ep) => {  
                        const hash = Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title].join(''));  
                        const view = Timeline.view(hash);  
                          
                        if (view.percent) viewed = {ep, view};  
                    });  
                      
                    if (viewed) {  
                        const span = document.createElement('span');  
                        span.className = 'card__watched';  
                          
                        span.innerText = 'E' + viewed.ep.episode_number + 'S' + viewed.ep.season_number;  
                          
                        const view_elem = this.render().find('.card__view');  
                          
                        if (view_elem.find('.card__watched').length === 0) {  
                            view_elem.append(span);  
                        }  
                    }  
                });  
            }  
            // Для фильмов  
            else {  
                const hash = Utils.hash([data.original_title].join(''));  
                const timeData = Timeline.view(hash);  
                  
                if (timeData && timeData.time && timeData.duration) {  
                    const span = document.createElement('span');  
                    span.className = 'card__watched';  
                      
                    const current = Utils.secondsToTime(timeData.time);  
                    const total = Utils.secondsToTime(timeData.duration);  
                    span.innerText = current + '/' + total;  
                      
                    const view_elem = this.render().find('.card__view');  
                      
                    if (view_elem.find('.card__watched').length === 0) {  
                        view_elem.append(span);  
                    }  
                }  
            }  
        };  
          
        // Вызываем watched сразу при создании карточки  
        this.watched();  
          
        return result;  
    };  
  
    Lampa.Card.prototype.update = function() {  
        'use strict';  
          
        // Восстанавливаем оригинальную логику для parser  
        if (this.params.isparser) return;  
  
        this.watched_checked = false;  
  
        if (this.watched_wrap) {  
            const remove = (elem) => {  
                if (elem) elem.remove();  
            };  
            remove(this.watched_wrap);  
        }  
  
        this.favorite();  
          
        // Вызываем watched сразу для постоянного отображения  
        this.watched();  
    };  
  
    // CSS стили  
    Lampa.Template.add('custom_episodes_css', `  
        <style>  
        .card__watched {  
            position: absolute;  
            bottom: 5px;  
            right: 5px;  
            background: rgba(0, 0, 0, 0.8);  
            color: white;  
            padding: 2px 6px;  
            border-radius: 3px;  
            font-size: 11px;  
            z-index: 10;  
        }  
        </style>  
    `);  
  
    $('body').append(Lampa.Template.get('custom_episodes_css', {}, true));  
}  
  
// Запускаем плагин  
if (!window.plugin_custom_episodes_ready && Lampa.Manifest.app_digital >= 242) {  
    'use strict';  
      
    if (window.appready) {  
        startPlugin();  
    } else {  
        Lampa.Listener.follow('app', function (e) {  
            'use strict';  
              
            if (e.type === 'ready') startPlugin();  
        });  
    }  
}
