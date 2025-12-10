(function() {
    'use strict';
    
    // Ждем полной загрузки Lampa
    function init() {
        if (typeof Lampa === 'undefined') {
            setTimeout(init, 1000);
            return;
        }

        let categories = [];
        let bookmarks = [];

        // Инициализация данных
        function loadData() {
            categories = Lampa.Storage.get('custom_bookmarks_categories', []);
            bookmarks = Lampa.Storage.get('custom_bookmarks_items', []);
        }

        loadData();

        // 1. ✅ РЕАЛЬНЫЙ API настроек (src/js/app/settings.js)
        Lampa.Settings.main(function(call) {
            call.push({
                title: '⭐ Категории закладок',
                html: categories.length ? 
                    categories.map(c => `${c.title} [${bookmarks.filter(b => b.category_id === c.id).length}]`).join('<br>') : 
                    '👆 Создайте первую категорию',
                onclick: () => categoriesMenu()
            });
        });

        // 2. ✅ РЕАЛЬНЫЙ API меню (src/js/app/menu.js)
        Lampa.Listener.follow('menu', function(e) {
            if (e.type === 'add') {
                // Добавляем в меню "Закладки"
                if (e.object.find(item => item.title === 'Закладки')) {
                    categories.forEach(cat => {
                        e.object.push({
                            title: cat.title,
                            subtitle: bookmarks.filter(b => b.category_id === cat.id).length + ' закладок',
                            page: 'custom_bookmarks',
                            filter: cat.id
                        });
                    });
                }
            }
        });

        // 3. ✅ РЕАЛЬНЫЙ перехват favorites (src/js/utils/favorite.js)
        const originalFavoriteAdd = Lampa.Storage.field('favorite_add');
        Lampa.Storage.field('favorite_add', function(item) {
            selectCategory(item);
            if (originalFavoriteAdd) originalFavoriteAdd(item);
        });

        // 4. ✅ РЕАЛЬНЫЙ шаблон страниц (src/js/app/template.js)
        Lampa.Template.add('page_custom_bookmarks', function(p) {
            const catId = p.filter;
            const cat = categories.find(c => c.id === catId);
            const catBookmarks = bookmarks.filter(b => b.category_id === catId);

            let html = `<div class="category-full">
                <div class="category-full__title selector" onclick="Lampa.Activity.back()">
                    <svg class="selector-icon svg-icon-back" viewBox="0 0 30 30">
                        <path d="M19 7l-7 6.9v1.2l7 6.9M10 24h10c2.8 0 5-2.2 5-5V11c0-2.8-2.2-5-5-5H10C7.2 6 5 7.2 5 10v10c0 2.8 2.2 5 5 5z"/>
                    </svg>
                    <div>${cat ? cat.title : 'Категория'}</div>
                </div>`;

            html += `<div class="full-start__head selector">
                <div class="full-start__title">${catBookmarks.length} закладок</div>
            </div>`;

            html += `<div class="full-chain__items">`;
            catBookmarks.forEach(item => {
                html += `<div class="full-chain__item selector" onclick="Lampa.Activity.push('${item.href || ''}')">
                    <div class="full-chain__cover" style="background-image:url('${item.poster || ''}')"></div>
                    <div class="full-chain__title">${item.title}</div>
                    <div class="full-chain__text">${item.subtitle}</div>
                </div>`;
            });
            html += `</div></div>`;

            return html;
        });

        function categoriesMenu() {
            Lampa.Select.show({
                title: 'Категории закладок',
                items: [
                    {
                        title: '➕ Добавить категорию',
                        onclick: () => {
                            Lampa.Input.edit({
                                title: 'Название категории',
                                value: '',
                                free: true,
                                onReturn: (name) => {
                                    if (name.trim()) {
                                        const id = 'cat_' + Date.now();
                                        categories.push({id, title: name.trim()});
                                        Lampa.Storage.set('custom_bookmarks_categories', categories);
                                        Lampa.Noty.show('✅ Категория создана');
                                        loadData();
                                    }
                                }
                            });
                        }
                    },
                    ...(categories.length ? categories.map(cat => ({
                        separator: true,
                        title: `📂 ${cat.title}`,
                        subtitle: `${bookmarks.filter(b => b.category_id === cat.id).length} закладок`,
                        onclick: () => Lampa.Activity.push({
                            url: '',
                            title: cat.title,
                            component: 'full',
                            page: 'custom_bookmarks',
                            filter: cat.id
                        })
                    })) : []),
                    ...(categories.length ? [{
                        separator: true,
                        title: '🗑️ Удалить категорию',
                        onclick: () => {
                            Lampa.Select.show({
                                title: 'Выберите категорию',
                                items: categories.map(cat => ({
                                    title: `🗑️ ${cat.title}`,
                                    subtitle: `${bookmarks.filter(b => b.category_id === cat.id).length} закладок`,
                                    onclick: () => {
                                        if (confirm(`Удалить "${cat.title}"?`)) {
                                            categories = categories.filter(c => c.id !== cat.id);
                                            bookmarks = bookmarks.filter(b => b.category_id !== cat.id);
                                            Lampa.Storage.set('custom_bookmarks_categories', categories);
                                            Lampa.Storage.set('custom_bookmarks_items', bookmarks);
                                            loadData();
                                            Lampa.Noty.show('🗑️ Удалено');
                                        }
                                    }
                                }))
                            });
                        }
                    }] : [])
                ],
                onBack: false
            });
        }

        function selectCategory(item) {
            if (!categories.length) {
                Lampa.Noty.show('⚠️ Создайте категории в настройках');
                return;
            }

            Lampa.Select.show({
                title: 'Категория для закладки',
                items: categories.map(cat => ({
                    title: cat.title,
                    onclick: () => {
                        const bookmark = {
                            id: Date.now().toString(),
                            title: item.title || item.name,
                            subtitle: item.original_title || '',
                            href: item.href || '',
                            poster: item.poster || '',
                            category_id: cat.id,
                            data: item
                        };
                        bookmarks.push(bookmark);
                        Lampa.Storage.set('custom_bookmarks_items', bookmarks);
                        Lampa.Noty.show(`✅ Добавлено в "${cat.title}"`);
                    }
                })),
                onBack: () => Lampa.Noty.show('⏭️ Без категории')
            });
        }
    }

    // Запуск
    init();
})();
