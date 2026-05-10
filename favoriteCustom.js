(function () {
  'use strict';

  let manifest = {
    type: 'other',
    version: '4.0.0',
    name: 'Favorite Custom',
    component: 'favorite_custom'
  };
  Lampa.Manifest.plugins = manifest;

  const STORAGE_KEY = 'custom_favorite';
  const STORAGE_SYNC_KEY = 'lampac_sync_custom_favorite';

  const customFavorite = {
    _data: null,
    allCards: [],

    init(obj) {
      this._data = obj || Lampa.Storage.get(STORAGE_KEY, {});
      this._data.customTypes = this._data.customTypes || { card: [] };
    },

    getFavorite() {
      if (this._data == null) this.init();
      return this._data;
    },

    getTypes() {
      return this.getTypesWithoutSystem(this.getFavorite());
    },

    hasTypeId(favorite, type) {
      const customTypes = favorite.customTypes;
      for (const key in customTypes) {
        if (customTypes.hasOwnProperty(key) && customTypes[key] === type) return true;
      }
      return false;
    },

    getTypesWithoutSystem(favorite) {
      const systemFields = ['card', 'migrationVersion'];
      return Object.keys(favorite.customTypes || {}).filter(type => systemFields.indexOf(type) === -1);
    },

    getCards(favorite) {
      if (!favorite && this.allCards.length > 0) return this.allCards;
      favorite = favorite || this.getFavorite();
      this.allCards = this.getTypesWithoutSystem(favorite).reduce((acc, key) => {
        const uid = favorite.customTypes[key];
        return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
      }, []);
      return this.allCards;
    },

    createType(typeName) {
      const favorite = this.getFavorite();
      if (favorite.customTypes[typeName]) {
        throw new Error('Имя уже используется');
      }
      const uid = Lampa.Utils.uid(8).toLowerCase();
      favorite.customTypes[typeName] = uid;
      favorite[uid] = [];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return { name: typeName, uid, counter: 0 };
    },

    renameType(oldName, newName) {
      const favorite = this.getFavorite();
      const uid = favorite.customTypes[oldName];
      if (!uid) throw new Error('Категория не найдена');
      if (favorite.customTypes[newName]) throw new Error('Имя уже используется');
      favorite.customTypes[newName] = uid;
      delete favorite.customTypes[oldName];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return true;
    },

    removeType(typeName) {
      const favorite = this.getFavorite();
      const uid = favorite.customTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');
      delete favorite.customTypes[typeName];
      delete favorite[uid];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return true;
    },

    getTypeList(typeName) {
      const favorite = this.getFavorite();
      const uid = favorite.customTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');
      return favorite[uid] || [];
    },

    toggleCard(typeName, card) {
      const favorite = this.getFavorite();
      const uid = favorite.customTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');

      const typeList = favorite[uid] || [];
      favorite[uid] = typeList;
      const customTypeCards = favorite.customTypes.card;

      if (typeList.indexOf(card.id) === -1) {
        if (customTypeCards.every(c => c.id !== card.id)) {
          Lampa.Arrays.insert(customTypeCards, 0, this.sanitizeCard(card));
        }
        Lampa.Arrays.insert(typeList, 0, card.id);
        this.getCards(favorite);
      } else {
        Lampa.Arrays.remove(typeList, card.id);
        const customCards = this.getCards(favorite);
        if (customCards.indexOf(card.id) < 0) {
          favorite.customTypes.card = customTypeCards.filter(c => c.id !== card.id);
        }
      }

      Lampa.Storage.set(STORAGE_KEY, favorite);
      return { name: typeName, uid, counter: typeList.length };
    },

    sanitizeCard(card) {
      if (!card) return null;
      return (Lampa.Utils.clearCard && Lampa.Arrays.clone) ? Lampa.Utils.clearCard(Lampa.Arrays.clone(card)) : card;
    }
  };

  const syncService = {
    init() {
      if (window.custom_favs_sync_init) return;
      window.custom_favs_sync_init = true;

      this.goImport(() => {
        Lampa.Storage.listener.follow('change', event => {
          if (event.name === STORAGE_KEY) this.goExport();
        });
      });
    },

    account(url) {
      url = url + '';
      const email = Lampa.Storage.get('account_email');
      if (email && url.indexOf('account_email=') === -1) {
        url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
      }
      const uid = Lampa.Storage.get('lampac_unic_id', '');
      if (uid && url.indexOf('uid=') === -1) {
        url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
      }
      return url;
    },

    goExport() {
      if (window.sync_disable) return;
      const value = Lampa.Storage.get(STORAGE_KEY, {});
      if (!value.hasOwnProperty('customTypes')) return;

      const uri = this.account(window.location.origin + '/storage/set?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', ''));

      fetch(uri, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value)
      })
        .then(res => res.json())
        .then(j => {
          if (j.success && j.fileInfo) {
            Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
          }
        })
        .catch(() => console.log('Lampac Storage', 'export', 'error'));
    },

    goImport(callback) {
      if (window.sync_disable) return;
      const network = new Lampa.Reguest();
      network.silent(
        this.account(window.location.origin + '/storage/get?path=custom_favs&pathfile=' + Lampa.Storage.get('lampac_profile_id', '')),
        j => {
          if (j.success && j.fileInfo && j.data) {
            if (j.fileInfo.changeTime > Lampa.Storage.get(STORAGE_SYNC_KEY, 0)) {
              try {
                const data = JSON.parse(j.data);
                if (data.hasOwnProperty('customTypes')) {
                  Lampa.Storage.set(STORAGE_KEY, data, true);
                  Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                  customFavorite.init(data);
                }
              } catch (e) {
                console.log('Lampac Storage', 'import', e.message);
              }
            }
          } else if (j.msg && j.msg === 'outFile') {
            customFavorite.init();
            this.goExport();
          }
          if (typeof callback === 'function') callback();
        }
      );
    }
  };

  const favoritePageSvc = {
    renderCustomFavoriteButton(type) {
      const customTypeCssClass = 'custom-type-' + type.uid;
      const $register = Lampa.Template.js('register')
        .addClass('selector')
        .addClass(customTypeCssClass)
        .addClass('custom-type');
      $register.find('.register__name').text(type.name).addClass(customTypeCssClass);
      $register.find('.register__counter').text(type.counter || 0).addClass(customTypeCssClass);

      const $render = Lampa.Activity.active().activity.render();

      $register.on('hover:long', () => {
        const menu = [
          { title: 'Переименовать', action: 'rename' },
          { title: 'Удалить', action: 'remove' }
        ];
        const controllerName = Lampa.Controller.enabled().name;

        Lampa.Select.show({
          title: 'Выберите действие',
          items: menu,
          onBack: () => {
            Lampa.Controller.toggle(controllerName);
            Lampa.Controller.toggle('content');
          },
          onSelect: item => {
            switch (item.action) {
              case 'remove':
                customFavorite.removeType(type.name);
                $register.remove();
                Lampa.Controller.toggle(controllerName);
                Lampa.Controller.toggle('content');
                break;
              case 'rename':
                Lampa.Input.edit({
                  title: 'Введите новое название',
                  value: type.name,
                  free: true,
                  nosave: true
                }, value => {
                  if (value === '' || type.name === value || value === 'card') {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show('Некорректное имя');
                    return;
                  }
                  customFavorite.renameType(type.name, value);
                  $register.find('.register__name').text(value);
                  type.name = value;
                  Lampa.Controller.toggle(controllerName);
                  Lampa.Controller.collectionFocus($register, $render);
                });
                break;
            }
          }
        });
      });

      $register.on('hover:enter', () => {
        Lampa.Activity.push({
          url: '',
          component: 'favorite',
          title: type.name,
          type: type.uid,
          page: 1
        });
      });

      $('.register:last', $render).after($register);
      return $register;
    },

    refresh(type) {
      const activity = Lampa.Activity.active();
      if (activity.component === 'bookmarks') {
        $('.register__counter.custom-type-' + type.uid).text(type.counter || 0);
      }
    },

    renderAddButton() {
      const self = this;
      const $register = Lampa.Template.js('register')
        .addClass('selector')
        .addClass('new-custom-type');
      $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');
      $('.register:first').before($register);

      $register.on('hover:enter', () => {
        Lampa.Input.edit({
          title: 'Введите название новой папки',
          value: '',
          free: true,
          nosave: true
        }, value => {
          if (value === '' || value === 'card') {
            Lampa.Controller.toggle('content');
            Lampa.Noty.show('Некорректное имя');
            return;
          }
          const newType = customFavorite.createType(value);
          self.renderCustomFavoriteButton(newType);
          Lampa.Controller.toggle('content');
        });
      });
    },

    registerLines() {
      Lampa.ContentRows.add({
        index: 100,
        name: 'custom_favs',
        title: 'Пользовательские закладки',
        screen: ['bookmarks'],
        call: (params, screen) => {
          const favorite = customFavorite.getFavorite();
          const lines = [];

          customFavorite.getTypesWithoutSystem(favorite).forEach(typeName => {
            const typeUid = favorite.customTypes[typeName];
            const typeList = favorite[typeUid] || [];
            const typeCards = favorite.customTypes.card.filter(card => typeList.indexOf(card.id) !== -1);

            const slicedCards = Lampa.Arrays.clone(typeCards.slice(0, 20));
            const totalPages = typeCards.length > 20 ? Math.ceil(typeCards.length / 20) : 1;

            if (slicedCards.length > 0) {
              lines.push({
                title: typeName,
                results: slicedCards,
                type: typeUid,
                total_pages: totalPages,
                icon_svg: Lampa.Template.get('custom-fav-icon-svg') || '',
                icon_bgcolor: '#fff',
                icon_color: '#fd4518',
                params: {
                  module: Lampa.Maker.module('Line').toggle(Lampa.Maker.module('Line').MASK.base, 'Icon', 'Event'),
                  emit: {
                    onMore: () => {
                      Lampa.Activity.push({
                        type: typeUid,
                        title: typeName,
                        component: 'favorite',
                        page: 2
                      });
                    }
                  }
                }
              });
            }
          });

          if (lines.length) return lines;
        }
      });
    }
  };

  const cardFavoriteSvc = {
    extendContextMenu(object) {
      const self = this;
      const bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
        return $(this).text() === Lampa.Lang.translate('title_book');
      });

      customFavorite.getTypes().forEach(customCategory => {
        const $menuItem = $(
          '<div class="selectbox-item selector">' +
          '<div class="selectbox-item__title">' + customCategory + '</div>' +
          '<div class="selectbox-item__checkbox"></div>' +
          '</div>'
        );
        $menuItem.insertBefore(bookmarkMenuItem.parent());

        $menuItem.on('hover:enter', () => {
          const category = $(this).find('.selectbox-item__title').text();
          const type = customFavorite.toggleCard(category, object.data);
          $(this).toggleClass('selectbox-item--checked');

          setTimeout(() => {
            if (object.card) {
              self.refreshCustomFavoriteIcon(object);
            } else {
              self.refreshBookmarkIcon();
            }
          }, 0);

          favoritePageSvc.refresh(type);
        });

        if (customFavorite.getTypeList(customCategory).indexOf(object.data.id) >= 0) {
          $menuItem.addClass('selectbox-item--checked');
        }
      });

      Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));

      setTimeout(() => {
        const $menuItems = $('body > .selectbox').find('.selector');
        if ($menuItems.length > 0) {
          Lampa.Controller.focus($menuItems.get(0));
          Navigator.focus($menuItems.get(0));
        }
      }, 10);
    },

    refreshCustomFavoriteIcon(object) {
      const customFavCards = customFavorite.getCards();
      const $iconHolder = $('.card__icons-inner', object.card);
      const isFavorite = customFavCards.indexOf(object.data.id) >= 0;
      const $starIcon = $('.icon--star', $iconHolder);
      const hasIcon = $starIcon.length > 0;
      const hidden = hasIcon && $starIcon.hasClass('hide');

      if (isFavorite) {
        if (!hasIcon) {
          $iconHolder.prepend(Lampa.Template.get('custom-fav-icon'));
        } else if (hidden) {
          $starIcon.removeClass('hide');
        }
      } else {
        if (hasIcon && !hidden) $starIcon.addClass('hide');
      }
    },

    refreshBookmarkIcon() {
      const active = Lampa.Activity.active();
      if (active.component !== 'full') return;

      const card = active.card;
      const anyCustomFavorite = customFavorite.getCards().indexOf(card.id) !== -1;
      const favStates = anyCustomFavorite ? {} : Lampa.Favorite.check(card);
      const anyFavorite = anyCustomFavorite || Object.keys(favStates).filter(t => t !== 'history' && t !== 'any').some(t => !!favStates[t]);

      const $svg = $('.button--book svg path', active.activity.render());
      $svg.attr('fill', anyFavorite ? 'currentColor' : 'transparent');
    }
  };

  function start() {
    if (window.custom_favorites) return;
    window.custom_favorites = true;

    const originalProfileWaiter = window.__profile_extra_waiter;
    window.__profile_extra_waiter = () => {
      const synced = Lampa.Storage.get(STORAGE_SYNC_KEY, 0) !== 0;
      if (typeof originalProfileWaiter === 'function') return synced && !!originalProfileWaiter();
      return synced;
    };

    Lampa.Storage.listener.follow('change', event => {
      if (event.name === 'lampac_sync_favorite' && event.value == 0) {
        Lampa.Storage.set(STORAGE_KEY, '{}', true);
        Lampa.Storage.set(STORAGE_SYNC_KEY, 0, true);
        customFavorite.init({});
      }
    });

    syncService.init();

    const cardModule = Lampa.Maker.map('Card');
    const onFavoriteUpdate = cardModule.Favorite.onUpdate;
    cardModule.Favorite.onUpdate = function () {
      const self = this;
      onFavoriteUpdate.apply(self);
      cardFavoriteSvc.refreshCustomFavoriteIcon({ data: self.data, card: self.html });
    };

    const onMenuCreate = cardModule.Menu.onCreate;
    cardModule.Menu.onCreate = function () {
      const self = this;
      const favMenuList = this.menu_list.filter(m => m.title === Lampa.Lang.translate('settings_input_links'))[0];

      if (favMenuList) {
        const originalMenu = favMenuList.menu;
        favMenuList.menu = () => {
          const customItems = customFavorite.getTypes().map(typeName => {
            const isChecked = customFavorite.getTypeList(typeName).indexOf(self.data.id) >= 0;
            return {
              checkbox: true,
              checked: isChecked ? self.data.id : undefined,
              onCheck: () => {
                customFavorite.toggleCard(typeName, self.data);
                Lampa.Maker.map('Card').Favorite.onUpdate.apply(self);
              },
              title: typeName
            };
          });

          const originalItems = originalMenu.apply(favMenuList).map(item => {
            if (item.onCheck) {
              const oldOnCheck = item.onCheck;
              item.onCheck = function () {
                oldOnCheck.apply(this, arguments);
                Lampa.Maker.map('Card').Favorite.onUpdate.apply(self);
              };
            }
            return item;
          });

          return customItems.concat(originalItems);
        };
      }

      onMenuCreate.apply(this, arguments);
    };

    const favoriteGet = Lampa.Favorite.get;
    Lampa.Favorite.get = function (params) {
      if (!params || !params.type) return favoriteGet.apply(this, arguments);

      const favorite = customFavorite.getFavorite();
      if (favorite && favorite.hasOwnProperty(params.type) &&
        Array.isArray(favorite[params.type]) &&
        customFavorite.hasTypeId(favorite, params.type)) {

        const cardIds = favorite[params.type];
        const customTypeCards = favorite.customTypes.card;
        return customTypeCards.filter(c => cardIds.indexOf(c.id) !== -1);
      }
      return favoriteGet.apply(this, arguments);
    };

    const svgIcon = '<svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.6162 7.10981L15.8464 7.55198L16.3381 7.63428L22.2841 8.62965C22.8678 8.72736 23.0999 9.44167 22.6851 9.86381L18.4598 14.1641L18.1104 14.5196L18.184 15.0127L19.0748 20.9752C19.1622 21.5606 18.5546 22.002 18.025 21.738L12.6295 19.0483L12.1833 18.8259L11.7372 19.0483L6.34171 21.738C5.81206 22.002 5.20443 21.5606 5.29187 20.9752L6.18264 15.0127L6.25629 14.5196L5.9069 14.1641L1.68155 9.86381C1.26677 9.44167 1.49886 8.72736 2.08255 8.62965L8.02855 7.63428L8.52022 7.55198L8.75043 7.10981L11.5345 1.76241C11.8078 1.23748 12.5589 1.23748 12.8322 1.76241L15.6162 7.10981Z" stroke="currentColor" stroke-width="2.2"></path></svg>';
    Lampa.Template.add('custom-fav-icon-svg', svgIcon);
    Lampa.Template.add('custom-fav-icon', '<div class="card__icon icon--star">' + svgIcon + '</div>');

    $('<style>').prop('type', 'text/css').html(
      '.card__icon { position: relative; } ' +
      '.icon--star svg { position: absolute; height: 60%; width: 60%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
      '.new-custom-type .register__counter { display:flex; justify-content:center; align-items:center }' +
      '.new-custom-type .register__counter img { height:2.2em; padding:0.4em; }'
    ).appendTo('head');

    Lampa.Listener.follow('full', event => {
      if (event.type === 'complite') {
        const active = Lampa.Activity.active();
        cardFavoriteSvc.refreshBookmarkIcon();
        const $btnBook = $('.button--book', active.activity.render());
        $btnBook.on('hover:enter', () => {
          cardFavoriteSvc.extendContextMenu({ data: active.card });
        });
      }
    });

    Lampa.Storage.listener.follow('change', event => {
      if (event.name !== 'activity') return;
      if (Lampa.Activity.active().component === 'bookmarks') {
        if ($('.new-custom-type').length === 0) {
          favoritePageSvc.renderAddButton();
          const favorite = customFavorite.getFavorite();
          customFavorite.getTypesWithoutSystem(favorite).forEach(typeName => {
            const typeUid = favorite.customTypes[typeName];
            const typeCounter = (favorite[typeUid] || []).length;
            favoritePageSvc.renderCustomFavoriteButton({
              name: typeName,
              uid: typeUid,
              counter: typeCounter
            });
          });
          Lampa.Activity.active().activity.toggle();
        }
      }
    });
    favoritePageSvc.registerLines();
  }

  Lampa.Listener.follow('app', event => {
    if (event.type === 'ready') start();
  });

})();