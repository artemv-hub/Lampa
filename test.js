(function() {  
    console.log('=== DEBUG: Starting plugin debug ===');  
      
    // Проверяем загрузку Lampa  
    if (!window.Lampa) {  
        console.error('DEBUG: Lampa not loaded');  
        return;  
    }  
      
    console.log('DEBUG: Lampa version:', Lampa.Manifest?.app_version || 'unknown');  
    console.log('DEBUG: Lampa modules available:', Object.keys(Lampa));  
      
    // Проверяем нужные модули  
    if (!Lampa.Utils) {  
        console.error('DEBUG: Lampa.Utils not available');  
        return;  
    }  
      
    if (!Lampa.Maker) {  
        console.error('DEBUG: Lampa.Maker not available - not Lampa 3.0?');  
        return;  
    }  
      
    if (!Lampa.ModuleMap) {  
        console.error('DEBUG: Lampa.ModuleMap not available');  
        return;  
    }  
      
    if (!Lampa.ModuleMap.Watched) {  
        console.error('DEBUG: Lampa.ModuleMap.Watched not available');  
        return;  
    }  
      
    console.log('DEBUG: All required modules found');  
      
    // Проверяем Timeline  
    if (!Lampa.Timeline) {  
        console.error('DEBUG: Lampa.Timeline not available');  
        return;  
    }  
      
    // Тестируем форматирование времени  
    const testFormat = (seconds) => {  
        try {  
            if (typeof seconds !== 'number' || seconds <= 0) return '00:00';  
              
            const hours = Math.floor(seconds / 3600);  
            const minutes = Math.floor((seconds % 3600) / 60);  
            const secs = Math.floor(seconds % 60);  
              
            return hours > 0     
                ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`    
                : `${minutes}:${secs.toString().padStart(2, '0')}`;  
        } catch (e) {  
            console.error('DEBUG: formatTime error:', e);  
            return '00:00';  
        }  
    };  
      
    console.log('DEBUG: Time format test:', testFormat(3661)); // Should be "1:01:01"  
      
    // Проверяем Storage  
    if (!Lampa.Storage) {  
        console.error('DEBUG: Lampa.Storage not available');  
        return;  
    }  
      
    try {  
        Lampa.Storage.set('card_episodes', false);  
        console.log('DEBUG: card_episodes disabled');  
    } catch (e) {  
        console.error('DEBUG: Storage.set error:', e);  
    }  
      
    // Создаем тестовый модуль с отладкой  
    const originalWatched = Lampa.ModuleMap.Watched;  
    console.log('DEBUG: Original Watched module:', originalWatched);  
      
    Lampa.ModuleMap.Watched = {  
        onCreate: function(){  
            console.log('DEBUG: Watched.onCreate called for:', this.data?.title || 'unknown');  
        },  
          
        onUpdate: function(){  
            console.log('DEBUG: Watched.onUpdate called for:', this.data?.title || 'unknown');  
            try {  
                this.watched_checked = false;  
                if (this.watched_wrap) {  
                    console.log('DEBUG: Removing old watched_wrap');  
                    this.watched_wrap.remove();  
                }  
                this.onWatched();  
            } catch (e) {  
                console.error('DEBUG: onUpdate error:', e);  
            }  
        },  
          
        onWatched: function(){  
            console.log('DEBUG: Watched.onWatched called for:', this.data?.title || 'unknown');  
              
            try {  
                if(this.watched_checked) {  
                    console.log('DEBUG: Already checked, skipping');  
                    return;  
                }  
                  
                const data = this.data;  
                console.log('DEBUG: Card data:', data);  
                  
                if (data.original_name || !data) {  
                    console.log('DEBUG: Skipping - series or no data');  
                    this.watched_checked = true;  
                    return;  
                }  
                  
                console.log('DEBUG: Getting timeline data...');  
                const time = Lampa.Timeline.watched(data, true);  
                console.log('DEBUG: Timeline data:', time);  
                  
                if (time.percent && time.duration > 0) {  
                    console.log('DEBUG: Creating custom watched element...');  
                      
                    const watched = document.createElement('div');  
                    watched.className = 'card-watched-custom';  
                    watched.innerHTML = `  
                        <div class="card-watched-custom__time">  
                            ${testFormat(time.time)}/${testFormat(time.duration)}  
                        </div>  
                    `;  
                      
                    console.log('DEBUG: Looking for .card__view...');  
                    const view = this.html.find('.card__view')[0];  
                    console.log('DEBUG: Found view:', view);  
                      
                    if (view) {  
                        view.insertBefore(watched, view.firstChild);  
                        this.watched_wrap = watched;  
                        console.log('DEBUG: Custom watched added successfully');  
                    } else {  
                        console.error('DEBUG: Could not find .card__view');  
                    }  
                } else {  
                    console.log('DEBUG: No timeline data to display');  
                }  
                  
                this.watched_checked = true;  
            } catch (e) {  
                console.error('DEBUG: onWatched error:', e);  
                console.error('DEBUG: Stack:', e.stack);  
            }  
        },  
          
        onDestroy: function(){  
            console.log('DEBUG: Watched.onDestroy called');  
        }  
    };  
      
    console.log('DEBUG: Watched module replaced successfully');  
    console.log('DEBUG: ModuleMap.Watched is now:', Lampa.ModuleMap.Watched);  
      
    // Добавляем CSS для визуальной отладки  
    const style = document.createElement('style');  
    style.textContent = `  
        .card-watched-custom {  
            position: absolute !important;  
            top: auto !important;  
            left: 1em !important;  
            right: 1em !important;  
            bottom: 3em !important;  
            z-index: 9999 !important;  
            background: red !important;  
            padding: 0.6em !important;  
            border-radius: 0.8em !important;  
            display: block !important;  
            border: 2px solid yellow !important;  
        }  
          
        .card-watched-custom__time {  
            color: white !important;  
            font-size: 0.85em !important;  
            font-weight: 600 !important;  
            text-align: center !important;  
        }  
    `;  
    document.head.appendChild(style);  
      
    console.log('DEBUG: Debug CSS added (red background for visibility)');  
    console.log('=== DEBUG: Plugin setup complete ===');  
      
    // Тестируем на существующих карточках  
    setTimeout(() => {  
        console.log('DEBUG: Testing on existing cards...');  
        const cards = document.querySelectorAll('.card');  
        console.log('DEBUG: Found cards:', cards.length);  
          
        cards.forEach((card, index) => {  
            console.log(`DEBUG: Card ${index}:`, card.data || 'no data');  
        });  
    }, 2000);  
})();