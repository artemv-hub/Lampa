(function() {
    'use strict';
    
    if (typeof Lampa !== 'undefined') {
        let categories = [];
        let bookmarks = [];
        
        // Инициализация при запуске
        Lampa.Listener.follow('app', function(e) {
            if (e.type == 'ready') {
                initBookmarks();
                addSettingsMenu();
                addMenuItems();
                overrideFavorites();
            }
        });
        
        function initBookmarks() {
            categories = Lampa.Storage.get('custom_bookmarks_categories', []);
            bookmarks = Lampa.Storage.get('custom_bookmarks_items', []);
            // НЕ создаем предустановленные категории - список пустой
        }
        
        function addSettingsMenu() {
            const settings = Lampa.Settings.main();
            settings.params(items => {
                items.push({
                    title: '📁 Категории закладок',
                    html: createCategoriesHtml(),
                    onclick: () => showCategoriesMenu()
                });
            });
        }
        
        function createCategoriesHtml() {
            if (!categories.length) {
                return '<div style="padding:10px;color:#888">Категории не созданы<br>Нажмите для добавления</div>';
            }
            return categories.map(cat => 
                `<div style="padding:5px;border-bottom:1px solid #333">
                    ${cat.title} 
                    <span style="float:right;color:#666">[${getItemsCount(cat.id)}]</span>
                </div>`
            ).join('');
        }
        
        function showCategoriesMenu() {
            Lampa.Select.show({
                title: 'Категории закладок',
                items: [
                    {title: '➕ Добавить новую категорию', onSelect: addCategoryDialog},
                    ...(categories.length ? [{
                        title: '🗑️ Управление категориями',
                        separator: true,
                        onSelect: manageCategoriesDialog
                    }] : []),
                    ...(categories.length ? categories.map(cat => ({
                        title: `📂 ${cat.title} [${getItemsCount(cat.id)}]`,
                        subtitle: 'Открыть категорию',
                        onSelect: () => openCategory(cat.id)
                    })) : []),
                    {title: '🔄 Обновить меню', onSelect: () => {addMenuItems(); Lampa.Noty.show('Меню обновлено');}}
                ]
            });
        }
        
        function addCategoryDialog() {
            Lampa.Input.edit({
                title: 'Название новой категории',
                value: '',
                free: true,
                onReturn: (name) => {
                    if (name && name.trim()) {
                        const id = 'cat_' + Date.now();
                        categories.push({id, title: name.trim()});
                        Lampa.Storage.set('custom_bookmarks_categories', categories);
                        Lampa.Noty.show(`✅ Создана категория: ${name}`);
                        addMenuItems();
                        showCategoriesMenu(); // Обновляем диалог
                    }
                }
            });
        }
        
        function manageCategoriesDialog() {
            Lampa.Select.show({
                title: 'Управление категориями',
                items: categories.map(cat => ({
                    title: `🗑️ Удалить "${cat.title}" [${getItemsCount(cat.id)}]`,
                    subtitle: getItemsCount(cat.id) ? 'Закладки будут удалены' : 'Категория пуста',
                    onSelect: () => {
                        if (confirm(`Удалить категорию "${cat.title}"?\nВсе закладки (${getItemsCount(cat.id)}) будут удалены.`)) {
                            categories = categories.filter(c => c.id !== cat.id);
                            bookmarks = bookmarks.filter(item => item.category_id !== cat.id);
                            Lampa.Storage.set('custom_bookmarks_categories', categories);
                            Lampa.Storage.set('custom_bookmarks_items', bookmarks);
                            Lampa.Noty.show(`🗑️ Удалена: ${cat.title}`);
                            addMenuItems();
                        }
                    }
                }))
            });
        }
        
        function getItemsCount(catId) {
            return bookmarks.filter(item => item.category_id === catId).length;
        }
        
        function openCategory(catId) {
            Lampa.Activity.push({
                url: '',
                title: categories.find(c => c.id === catId)?.title || 'Категория',
                component: 'full',
                page: 'custom_bookmarks',
                filter: catId
            });
        }
        
        // Добавление категорий в главное меню "Закладки"
        function addMenuItems() {
            // Удаляем старые наши пункты
            $('.menu--bookmarks .menu__title').nextAll().filter('[data-role="custom-category"]').remove();
            
            categories.forEach(cat => {
                const menuItem = $(`
                    <div class="menu__item selector" data-role="custom-category" data-filter="${cat.id}">
                        <div class="menu__title">${cat.title}</div>
                        <div class="menu__descr">${getItemsCount(cat.id)}</div>
                    </div>
                `);
                $('.menu--bookmarks .menu__title').after(menuItem);
            });
        }
        
        // Кастомная страница для отображения закладок категории
        Lampa.Template.add('page_custom_bookmarks', function(params) {
            const catId = params.filter;
            const cat = categories.find(c => c.id === catId);
            const catItems = bookmarks.filter(item => item.category_id === catId);
            
            let html = `<div class="category-full">`;
            html += `<div class="category-full__title selector" onclick="Lampa.Activity.back()">
                <svg class="selector-icon svg-icon-back" viewBox="0 0 30 30"><path d="M19 7l-7 6.9v1.2l7 6.9M10 24h10c2.8 0 5-2.2 5-5V11c0-2.8-2.2-5-5-5H10C7.2 6 5 7.2 5 10v10c0 2.8 2.2 5 5 5z"/></svg>
                <div>${cat ? cat.title : 'Закладки'}</div>
            </div>`;
            
            html += `<div class="full-start__head selector" style="margin:0">`;
            html += `<div class="full-start__title">${catItems.length} закладок</div>`;
            html += `</div>`;
            
            html += `<div class="full-chain__items">`;
            catItems.forEach(item => {
                html += `
                    <div class="full-chain__item selector" onclick="Lampa.Activity.push('${item.href || ''}')">
                        <div class="full-chain__cover" style="background-image:url('${item.poster || ''}')"></div>
                        <div class="full-chain__title">${item.title}</div>
                        <div class="full-chain__text">${item.subtitle}</div>
                    </div>
                `;
            });
            html += `</div></div>`;
            
            return html;
        });
        
        // Перехват стандартного добавления в favorites
        function overrideFavorites() {
            const originalAdd = Lampa.Storage.field('favorite_add');
            Lampa.Storage.field('favorite_add', function(item) {
                // Показываем выбор категории
                if (categories.length) {
                    selectCategoryForItem(item);
                } else {
                    Lampa.Noty.show('⚠️ Создайте категории в настройках');
                    if (originalAdd) originalAdd(item);
                }
            });
        }
        
        function selectCategoryForItem(item) {
            const selectItems = categories.map(cat => ({
                title: cat.title,
                id: cat.id
            }));
            selectItems.unshift({title: '⏭️ Пропустить (без категории)', id: ''});
            
            Lampa.Select.show({
                title: 'Выберите категорию для закладки',
                items: selectItems,
                onSelect: (selected) => {
                    const bookmark = {
                        id: item.id || Date.now().toString(),
                        title: item.title || item.name || 'Без названия',
                        subtitle: item.original_title || item.original_name || '',
                        href: item.href || '',
                        poster: item.poster || item.poster_shape || '',
                        category_id: selected.id,
                        data: item
                    };
                    bookmarks.push(bookmark);
                    Lampa.Storage.set('custom_bookmarks_items', bookmarks);
                    
                    Lampa.Noty.show(`✅ Добавлено в "${selected.title || 'без категории'}"`);
                    
                    // Также добавляем в стандартные favorites
                    if (typeof window.favorite_add === 'function') {
                        window.favorite_add(item);
                    }
                },
                onBack: () => {
                    Lampa.Noty.show('Добавление отменено');
                }
            });
        }
        
        // Обработчики кликов по меню
        $(document).on('click', '[data-role="custom-category"]', function(e) {
            e.stopPropagation();
            const catId = $(this).data('filter');
            openCategory(catId);
        });
    }
})();
