(function() {    
    'use strict';    
        
    function init() {    
        if (!window.Lampa || !Lampa.Utils || !Lampa.Lang) {    
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
          
        // Переопределяем secondsToTimeHuman  
        const originalSecondsToTimeHuman = Lampa.Utils.secondsToTimeHuman;  
        Lampa.Utils.secondsToTimeHuman = function(seconds) {  
            if (typeof seconds === 'number' && seconds > 0) {  
                return formatTime(seconds);  
            }  
            return originalSecondsToTimeHuman.apply(this, arguments);  
        };  
          
        // Переопределяем Lang.translate для удаления "Просмотрено"  
        const originalTranslate = Lampa.Lang.translate;  
        Lampa.Lang.translate = function(name) {  
            if (name === 'title_viewed' || name === 'time_viewed') {  
                return '';  
            }  
            return originalTranslate.apply(this, arguments);  
        };  
          
        // Функция добавления кастомного watched  
        const addCustomWatched = (card) => {  
            if (card.dataset.customWatched) return;  
              
            const data = card.data;  
            if (!data || data.original_name) return;  
              
            const time = Lampa.Timeline.watched(data, true);  
            if (!time.percent || !time.duration > 0) return;  
              
            const watched = document.createElement('div');  
            watched.className = 'card-watched-custom';  
            watched.innerHTML = `  
                <div class="card-watched-custom__time">  
                    ${formatTime(time.time)}/${formatTime(time.duration)}  
                </div>  
            `;  
              
            const view = card.querySelector('.card__view');  
            if (view) {  
                view.insertBefore(watched, view.firstChild);  
                card.dataset.customWatched = 'true';  
            }  
        };  
          
        // Наблюдатель за изменениями DOM  
        const observer = new MutationObserver((mutations) => {  
            mutations.forEach((mutation) => {  
                mutation.addedNodes.forEach((node) => {  
                    if (node.classList && node.classList.contains('card')) {  
                        setTimeout(() => addCustomWatched(node), 100);  
                    }  
                });  
            });  
        });  
          
        // Начинаем наблюдение  
        observer.observe(document.body, {  
            childList: true,  
            subtree: true  
        });  
          
        // Обрабатываем уже существующие карточки  
        document.querySelectorAll('.card').forEach(card => {  
            setTimeout(() => addCustomWatched(card), 100);  
        });  
          
        // CSS стили  
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
          
        console.log('[Custom Watched] Plugin loaded - DOM observer method');    
    }    
        
    init();    
})();