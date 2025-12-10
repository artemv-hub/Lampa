(function() {
    'use strict';
    
    // Ждем Lampa
    const waitLampa = setInterval(() => {
        if (typeof Lampa !== 'undefined') {
            clearInterval(waitLampa);
            initPlugin();
        }
    }, 500);

    function initPlugin() {
        // ✅ ПРЯМОЕ добавление в DOM настроек (как делают плагины Lampa)
        addToSettings();
    }

    function addToSettings() {
        // Хук на открытие настроек
        Lampa.Listener.follow('settings', function(e) {
            if (e.type == 'open') {
                setTimeout(() => {
                    // Ищем контейнер настроек и добавляем
                    const container = $('.settings-panel .layer--wheight .selector');
                    if (container.length && !container.find('.custom-categories').length) {
                        container.append(`
                            <div class="selector-item custom-categories selector" onclick="showCategoriesMenu()">
                                <div class="selector-item__title">⭐ Категории закладок</div>
                                <div class="selector-item__descr">${getCategoriesCount()} категорий</div>
                            </div>
                        `);
                    }
                }, 300);
            }
        });

        // Открытие меню категорий
        window.showCategoriesMenu = function() {
            const cats = Lampa.Storage.get('custom_categories', []);
            Lampa.Select.show({
                title: 'Категории закладок',
                items: [
                    {title: '➕ Создать', onclick: createCategory},
                    {title: '✏️ Переименовать', onclick: renameCategory, separator: !cats.length},
                    {title: '🗑️ Удалить', onclick: deleteCategory, separator: !cats.length},
                    {title: '🔄 Обновить', onclick: () => {Lampa.Noty.show('✅ Готово');}}
                ]
            });
        };
    }

    function getCategoriesCount() {
        return Lampa.Storage.get('custom_categories', []).length;
    }

    window.createCategory = function() {
        Lampa.Input.edit({
            title: 'Название категории',
            onReturn: name => {
                if (name.trim()) {
                    const cats = Lampa.Storage.get('custom_categories', []);
                    cats.push({id: 'cat_' + Date.now(), title: name.trim()});
                    Lampa.Storage.set('custom_categories', cats);
                    Lampa.Noty.show('✅ ' + name);
                }
            }
        });
    };

    window.renameCategory = function() {
        const cats = Lampa.Storage.get('custom_categories', []);
        if (!cats.length) return Lampa.Noty.show('Нет категорий');
        
        Lampa.Select.show({
            title: 'Переименовать',
            items: cats.map(cat => ({
                title: cat.title,
                onclick: () => {
                    Lampa.Input.edit({
                        title: 'Новое название',
                        value: cat.title,
                        onReturn: newName => {
                            if (newName.trim()) {
                                cat.title = newName.trim();
                                Lampa.Storage.set('custom_categories', cats);
                                Lampa.Noty.show('✅ Сохранено');
                            }
                        }
                    });
                }
            }))
        });
    };

    window.deleteCategory = function() {
        const cats = Lampa.Storage.get('custom_categories', []);
        if (!cats.length) return;
        
        Lampa.Select.show({
            title: 'Удалить',
            items: cats.map(cat => ({
                title: `🗑️ ${cat.title}`,
                onclick: () => {
                    if (confirm('Удалить категорию?')) {
                        const newCats = cats.filter(c => c.id !== cat.id);
                        Lampa.Storage.set('custom_categories', newCats);
                        Lampa.Noty.show('🗑️ Удалено');
                    }
                }
            }))
        });
    };
})();
