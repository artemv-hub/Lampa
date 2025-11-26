(function() {    
    'use strict';    
        
    function init() {    
        if (!window.Lampa || !Lampa.Utils || !Lampa.Listener) {    
            setTimeout(init, 500);    
            return;    
        }    
            
        // Форматирование времени в HH:MM:SS  
        const formatTime = (seconds) => {  
            if (typeof seconds !== 'number' || seconds <= 0) return '00:00';  
              
            const hours = Math.floor(seconds / 3600);  
            const minutes = Math.floor((seconds % 3600) / 60);  
            const secs = Math.floor(seconds % 60);  
              
            return hours > 0     
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`    
                : `${minutes}:${secs.toString().padStart(2, '0')}`;  
        };  
          
        // Отключаем стандартный watched  
        Lampa.Storage.set('card_episodes', false);  
          
        // Функция добавления кастомного watched  
        const addCustomWatched = (card) => {  
            const data = card.data;  
              
            // Только для фильмов  
            if (data.original_name) return;  
              
            // Удаляем стандартный watched если есть  
            const oldWatched = card.querySelector('.card-watched');  
            if (oldWatched) oldWatched.remove();  
              
            // Получаем прогресс просмотра  
            const time = Lampa.Timeline.watched(data, true);  
              
            if (time.percent && time.duration > 0) {  
                // Создаем простой watched элемент  
                const watched = document.createElement('div');  
                watched.className = 'card-watched-custom';  
                watched.innerHTML = `  
                    <div class="card-watched-custom__time">  
                        ${formatTime(time.time)}/${formatTime(time.duration)}  
                    </div>  
                `;  
                  
                // Добавляем в карточку  
                const view = card.querySelector('.card__view');  
                view.insertBefore(watched, view.firstChild);  
            }  
        };  
          
        // Слушаем создание всех карточек  
        Lampa.Listener.follow('card', (e) => {  
            if (e.type === 'create') {  
                addCustomWatched(e.card);  
            }  
        });  
          
        // CSS стили - всегда виден  
        const style = document.createElement('style');  
        style.textContent = `  
            .card-watched-custom {  
                position: absolute;  
                top: auto;  
                left: 1em;  
                right: 1em;  
                bottom: 3em;  
                z-index: 1;  
                background: rgba(0,0,0,0.9);  
                padding: 0.6em;  
                border-radius: 0.8em;  
                display: block !important;  
            }  
              
            .card-watched-custom__time {  
                color: #fff;  
                font-size: 0.85em;  
                font-weight: 600;  
                text-align: center;  
            }  
        `;  
        document.head.appendChild(style);  
          
        console.log('[Custom Watched] Plugin loaded - always visible time only');    
    }    
        
    init();    
})();