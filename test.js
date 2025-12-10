(function() {
    'use strict';
    
    if (typeof Lampa === 'undefined') return;

    // 1. Добавляем в настройки
    Lampa.Settings.main(function(call) {
        call.push({
            title: '⭐ Категории закладок',
            html: getCategoriesHtml(),
            onclick: categoriesMenu
        });
    });

    function getCategoriesHtml() {
        const cats = Lampa.Storage.get('custom_categories', []);
        return cats.length ? cats.map(c => `${c.title}`).join('<br>') : '👆 Создайте категории';
    }

    function categoriesMenu() {
        const cats = Lampa.Storage.get('custom_categories', []);
        Lampa.Select.show({
            title: 'Категории',
            items: [
                {title: '➕ Создать', onclick: createCat},
                {title: '✏️ Переименовать', onclick: renameCat, separator: !cats.length},
                {title: '🗑️ Удалить', onclick: deleteCat, separator: !cats.length},
                {title: '🔄 Обновить', onclick: updateMenu}
            ]
        });
    }

    function createCat() {
        Lampa.Input.edit({
            title: 'Название категории',
            onReturn: name => {
                if (name) {
                    const cats = Lampa.Storage.get('custom_categories', []);
                    const id = 'cat_' + Date.now();
                    cats.push({id, title: name});
                    Lampa.Storage.set('custom_categories', cats);
                    Lampa.Noty.show('✅ ' + name);
                }
            }
        });
    }

    function renameCat() {
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
                            if (newName) {
                                cat.title = newName;
                                Lampa.Storage.set('custom_categories', cats);
                                Lampa.Noty.show('✅ Обновлено');
                            }
                        }
                    });
                }
            }))
        });
    }

    function deleteCat() {
        const cats = Lampa.Storage.get('custom_categories', []);
        if (!cats.length) return;
        
        Lampa.Select.show({
            title: 'Удалить',
            items: cats.map(cat => ({
                title: `🗑️ ${cat.title}`,
                onclick: () => {
                    if (confirm('Удалить?')) {
                        Lampa.Storage.set('custom_categories', cats.filter(c => c.id !== cat.id));
                        // Очищаем favorites этой категории
                        const favs = Lampa.Storage.get('favorite', []);
                        Lampa.Storage.set('favorite', favs.filter(f => !f.category || f.category !== cat.id));
                        Lampa.Noty.show('🗑️ Удалено');
                    }
                }
            }))
        });
    }

    function updateMenu() {
        Lampa.Menu.open();
        Lampa.Noty.show('🔄 Меню обновлено');
    }

})();
