(function() {
    'use strict';
    
    Lampa.Params.select('favorite_extend', 'custom_favs', {
        title: 'Категории закладок',
        items: [
            {title: 'Создать', separator: true},
            {title: 'Переименовать'},
            {title: 'Удалить'}
        ],
        onclick: manageCategories
    });

    // Кнопка в меню "Избранное"
    Lampa.Listener.follow('menu', function(e) {
        if(e.type == 'add' && Array.from(e.object).find(item => item.page == 'favorite')){
            const cats = Lampa.Storage.get('custom_categories', []);
            cats.forEach(cat => {
                e.object.unshift({
                    title: cat.title,
                    subtitle: getCount(cat.id),
                    page: 'favorite',
                    filter: cat.id,
                    role: 'category'
                });
            });
        }
    });

    function manageCategories() {
        const cats = Lampa.Storage.get('custom_categories', []);
        Lampa.Select.show({
            title: 'Категории',
            items: [
                {
                    title: '➕ Создать',
                    onclick: () => {
                        Lampa.Input.edit({
                            title: 'Название',
                            onReturn: name => {
                                if(name){
                                    const cats = Lampa.Storage.get('custom_categories', []);
                                    cats.push({id: Date.now(), title: name});
                                    Lampa.Storage.set('custom_categories', cats);
                                    Lampa.Noty.show('Создано');
                                }
                            }
                        });
                    }
                },
                {
                    title: '✏️ Переименовать',
                    onclick: () => renameCategory(cats)
                },
                {
                    title: '🗑️ Удалить', 
                    onclick: () => deleteCategory(cats)
                }
            ]
        });
    }

    function renameCategory(cats) {
        Lampa.Select.show({
            title: 'Выберите',
            items: cats.map(cat => ({
                title: cat.title,
                onclick: () => {
                    Lampa.Input.edit({
                        title: 'Новое название',
                        value: cat.title,
                        onReturn: name => {
                            if(name) {
                                cat.title = name;
                                Lampa.Storage.set('custom_categories', cats);
                            }
                        }
                    });
                }
            }))
        });
    }

    function deleteCategory(cats) {
        Lampa.Select.show({
            title: 'Удалить',
            items: cats.map(cat => ({
                title: cat.title,
                onclick: () => {
                    if(confirm('Удалить?')){
                        Lampa.Storage.set('custom_categories', cats.filter(c => c.id !== cat.id));
                    }
                }
            }))
        });
    }

    function getCount(cat_id) {
        const favs = Lampa.Storage.get('favorite','[]');
        return favs.filter(fav => fav.category == cat_id).length;
    }

    // Контекстное меню при добавлении в избранное
    const originalAdd = Lampa.Storage.field('favorite_add');
    Lampa.Storage.field('favorite_add', function(item){
        const cats = Lampa.Storage.get('custom_categories', []);
        if(cats.length){
            Lampa.Select.show({
                title: 'Категория',
                items: cats.map(cat => ({
                    title: cat.title,
                    onclick: () => {
                        item.category = cat.id;
                        originalAdd(item);
                    }
                })),
                onBack: () => originalAdd(item)
            });
        } else {
            originalAdd(item);
        }
    });
})();
