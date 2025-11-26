function startPlugin() {  
    window.plugin_custom_episodes_ready = true  
  
    let manifest = {  
        type: 'modification',  
        version: '1.0.0',  
        name: 'Custom Episodes',  
        description: 'Кастомное отображение прогресса на карточках',  
        component: 'custom_episodes',  
    }  
      
    Lampa.Manifest.plugins = manifest  
  
    // Переопределяем функцию watched в карточках  
    let originalCreate = Lampa.Card.prototype.create  
      
    Lampa.Card.prototype.create = function() {  
        let result = originalCreate.call(this)  
          
        // Переопределяем watched функцию - убираем проверку на фокус  
        this.watched = function(){  
            if(this.watched_checked) return  
              
            this.watched_checked = true  
              
            let data = this.object  
              
            if(!data) return  
              
            // Для сериалов  
            if(data.original_name) {  
                Lampa.TimeTable.get(data, (episodes)=>{  
                    if(!episodes.length) return  
                      
                    let viewed = null  
                      
                    // Ищем последний просмотренный эпизод  
                    episodes.forEach(ep => {  
                        let hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '', ep.episode_number, data.original_title].join(''))  
                        let view = Lampa.Timeline.view(hash)  
                          
                        if(view.percent) viewed = {ep, view}  
                    })  
                      
                    if(viewed) {  
                        let span = document.createElement('span')  
                        span.className = 'card__watched'  
                          
                        // Формат E7S2  
                        span.innerText = 'E' + viewed.ep.episode_number + 'S' + viewed.ep.season_number  
                          
                        let view_elem = this.render().find('.card__view')  
                          
                        if(view_elem.find('.card__watched').length === 0) {  
                            view_elem.append(span)  
                        }  
                    }  
                })  
            }  
            // Для фильмов  
            else {  
                let hash = Lampa.Utils.hash([data.original_title].join(''))  
                let timeData = Lampa.Timeline.view(hash)  
                  
                if(timeData && timeData.time && timeData.duration) {  
                    let span = document.createElement('span')  
                    span.className = 'card__watched'  
                      
                    // Формат 0:50/1:40  
                    let current = Lampa.Utils.secondsToTime(timeData.time)  
                    let total = Lampa.Utils.secondsToTime(timeData.duration)  
                    span.innerText = current + '/' + total  
                      
                    let view_elem = this.render().find('.card__view')  
                      
                    if(view_elem.find('.card__watched').length === 0) {  
                        view_elem.append(span)  
                    }  
                }  
            }  
        }  
          
        // Вызываем watched сразу при создании карточки (без проверки фокуса)  
        this.watched()  
          
        return result  
    }  
  
    // Переопределяем update функцию чтобы не сбрасывать watched при потере фокуса  
    let originalUpdate = Lampa.Card.prototype.update  
      
    Lampa.Card.prototype.update = function(){  
        // Не сбрасываем watched_checked при обновлении  
        this.favorite()  
    }  
  
    // Также переопределяем для модульной системы  
    if(Lampa.Maker && Lampa.Maker.module) {  
        let cardModule = Lampa.Maker.module('Card')  
          
        if(cardModule && cardModule.moduleNames && cardModule.moduleNames.indexOf('Watched') >= 0) {  
            Lampa.Maker.map('Card').Watched = {  
                onCreate: function(){  
                    // Убираем обработчики наведения  
                },  
                  
                onUpdate: function(){  
                    // Не сбрасываем watched_checked  
                    this.watched_wrap?.remove()  
                    // Вызываем onWatched сразу без проверки фокуса  
                    this.emit('watched')  
                },  
                  
                onWatched: function(){  
                    // Убираем проверку Storage.field('card_episodes')  
                    if(!this.watched_checked){  
                        let data = this.data  
  
                        function get(callback){  
                            if(data.original_name) Lampa.Timetable.get(data, callback)  
                            else callback([])  
                        }  
  
                        get((episodes, from_db)=>{  
                            let viewed  
  
                            let Draw = ()=>{  
                                episodes.forEach(ep=>{  
                                    let hash = Lampa.Utils.hash([ep.season_number, ep.season_number > 10 ? ':' : '',ep.episode_number,data.original_title].join(''))  
                                    let view = Lampa.Timeline.view(hash)  
  
                                    if(view.percent) viewed = {ep, view}  
                                })  
  
                                // Для фильмов  
                                if(!viewed && !data.original_name){  
                                    let time = Lampa.Timeline.view(Lampa.Utils.hash([data.original_title].join('')))  
  
                                    if(time.time && time.duration) {  
                                        viewed = {  
                                            ep: {  
                                                name: Lampa.Utils.secondsToTime(time.time) + '/' + Lampa.Utils.secondsToTime(time.duration),  
                                            },  
                                            view: time  
                                        }  
                                    }  
                                }  
  
                                if(viewed){  
                                    let span = document.createElement('span')  
                                    span.className = 'card__watched'  
                                      
                                    if(data.original_name) {  
                                        // Формат E7S2 для сериалов  
                                        span.innerText = 'E' + viewed.ep.episode_number + 'S' + viewed.ep.season_number  
                                    } else {  
                                        // Формат 0:50/1:40 для фильмов  
                                        span.innerText = viewed.ep.name  
                                    }  
  
                                    let view_elem = this.html.find('.card__view')  
                                      
                                    if(view_elem.find('.card__watched').length === 0) {  
                                        view_elem.append(span)  
                                    }  
                                }  
                            }  
  
                            Draw()  
                        })  
  
                        this.watched_checked = true  
                    }  
                }  
            }  
        }  
    }  
  
    // CSS стили для отображения  
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
    `)  
  
    // Добавляем стили на страницу  
    $('body').append(Lampa.Template.get('custom_episodes_css', {}, true))  
}  
  
// Запускаем плагин  
if(!window.plugin_custom_episodes_ready && Lampa.Manifest.app_digital >= 242) {  
    if(window.appready) startPlugin()  
    else {  
        Lampa.Listener.follow('app', function (e) {  
            if (e.type == 'ready') startPlugin()  
        })  
    }  
}
