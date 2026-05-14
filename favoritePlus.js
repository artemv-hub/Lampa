(function () {
  'use strict';

  let manifest = {
    type: 'other',
    version: '4.0.7',
    name: 'Favorite Plus',
    component: 'favorite_plus'
  };
  Lampa.Manifest.plugins = manifest;

  const STORAGE_KEY = 'favorite_plus';
  const STORAGE_SYNC_KEY = 'favorite_plus_sync';

  const favoritePlus = {
    _data: null,
    init(obj) {
      this._data = obj || Lampa.Storage.get(STORAGE_KEY, {});
      this._data.plusTypes = this._data.plusTypes || { card: [] };
    },
    getFavorite() {
      if (this._data == null) this.init();
      return this._data;
    },
    hasTypeId(favorite, type) {
      return Object.values(favorite.plusTypes || {}).includes(type);
    },
    getTypesWithoutSystem(favorite) {
      const systemFields = ['card'];
      return Object.keys(favorite.plusTypes || {}).filter(type => systemFields.indexOf(type) === -1);
    },
    getCards(favorite) {
      favorite = favorite || this.getFavorite();
      return this.getTypesWithoutSystem(favorite).reduce((acc, key) => {
        const uid = favorite.plusTypes[key];
        return favorite.hasOwnProperty(uid) ? acc.concat(favorite[uid]) : acc;
      }, []);
    },
    createType(typeName) {
      const favorite = this.getFavorite();
      if (favorite.plusTypes[typeName]) throw new Error('Имя уже используется');
      const uid = Lampa.Utils.uid(8).toLowerCase();
      favorite.plusTypes[typeName] = uid;
      favorite[uid] = [];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return { name: typeName, uid, counter: 0 };
    },
    renameType(oldName, newName) {
      const favorite = this.getFavorite();
      const uid = favorite.plusTypes[oldName];
      if (!uid) throw new Error('Категория не найдена');
      if (favorite.plusTypes[newName]) throw new Error('Имя уже используется');
      favorite.plusTypes[newName] = uid;
      delete favorite.plusTypes[oldName];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return true;
    },
    removeType(typeName) {
      const favorite = this.getFavorite();
      const uid = favorite.plusTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');
      delete favorite.plusTypes[typeName];
      delete favorite[uid];
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return true;
    },
    getTypeList(typeName) {
      const favorite = this.getFavorite();
      const uid = favorite.plusTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');
      return favorite[uid] || [];
    },
    toggleCard(typeName, card) {
      const favorite = this.getFavorite();
      const uid = favorite.plusTypes[typeName];
      if (!uid) throw new Error('Категория не найдена');
      const typeList = favorite[uid] || [];
      const plusTypeCards = favorite.plusTypes.card;
      const cardId = card.id;
      const isAdded = typeList.includes(cardId);
      if (isAdded) {
        Lampa.Arrays.remove(typeList, cardId);
        const isInAnyList = this.getTypesWithoutSystem(favorite)
          .some(key => favorite[favorite.plusTypes[key]]?.includes(cardId));
        if (!isInAnyList) {
          favorite.plusTypes.card = plusTypeCards.filter(c => c.id !== cardId);
        }
      } else {
        if (!plusTypeCards.some(c => c.id === cardId)) {
          Lampa.Arrays.insert(plusTypeCards, 0, this.sanitizeCard(card));
        }
        Lampa.Arrays.insert(typeList, 0, cardId);
      }
      Lampa.Storage.set(STORAGE_KEY, favorite);
      return { name: typeName, uid, counter: typeList.length };
    },
    sanitizeCard(card) {
      if (!card) return null;
      return (Lampa.Utils.clearCard && Lampa.Arrays.clone) ? Lampa.Utils.clearCard(Lampa.Arrays.clone(card)) : card;
    }
  };
  const plusSync = {
    init() {
      if (window.favorite_plus_sync) return;
      window.favorite_plus_sync = true;
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
      if (!value.hasOwnProperty('plusTypes')) return;
      const uri = this.account(window.location.origin + '/storage/set?path=sync_favorite_plus&pathfile=' + Lampa.Storage.get('lampac_profile_id', ''));
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
        this.account(window.location.origin + '/storage/get?path=sync_favorite_plus&pathfile=' + Lampa.Storage.get('lampac_profile_id', '')),
        j => {
          if (j.success && j.fileInfo && j.data) {
            if (j.fileInfo.changeTime > Lampa.Storage.get(STORAGE_SYNC_KEY, 0)) {
              try {
                const data = JSON.parse(j.data);
                if (data.hasOwnProperty('plusTypes')) {
                  Lampa.Storage.set(STORAGE_KEY, data, true);
                  Lampa.Storage.set(STORAGE_SYNC_KEY, j.fileInfo.changeTime);
                  favoritePlus.init(data);
                }
              } catch (e) {
                console.log('Lampac Storage', 'import', e.message);
              }
            }
          } else if (j.msg && j.msg === 'outFile') {
            favoritePlus.init();
            this.goExport();
          }
          if (typeof callback === 'function') callback();
        }
      );
    }
  };
  const plusPageSvc = {
    restoreController(controllerName, $focusElement, $render) {
      Lampa.Controller.toggle(controllerName);
      Lampa.Controller.toggle('content');
      if ($focusElement && $render) {
        Lampa.Controller.collectionFocus($focusElement, $render);
      }
    },
    renderPlusButton(type) {
      const plusTypeCssClass = 'plus-type-' + type.uid;
      const $register = Lampa.Template.js('register')
        .addClass('selector')
        .addClass(plusTypeCssClass)
        .addClass('plus-type');
      $register.find('.register__name').text(type.name).addClass(plusTypeCssClass);
      $register.find('.register__counter').text(type.counter || 0).addClass(plusTypeCssClass);
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
            this.restoreController(controllerName);
          },
          onSelect: item => {
            switch (item.action) {
              case 'remove':
                favoritePlus.removeType(type.name);
                $register.remove();
                this.restoreController(controllerName);
                break;
              case 'rename':
                Lampa.Input.edit({
                  title: 'Новое название',
                  value: type.name,
                  free: true,
                  nosave: true
                }, value => {
                  if (value === '' || type.name === value || value === 'card') {
                    Lampa.Controller.toggle('content');
                    Lampa.Noty.show('Некорректное имя');
                    return;
                  }
                  favoritePlus.renameType(type.name, value);
                  $register.find('.register__name').text(value);
                  type.name = value;
                  this.restoreController(controllerName, $register, $render);
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
      $('.register:last', $render).before($register);
      return $register;
    },
    refresh(type) {
      const activity = Lampa.Activity.active();
      if (activity.component === 'bookmarks') {
        $('.register__counter.plus-type-' + type.uid).text(type.counter || 0);
      }
    },
    renderAddButton() {
      const self = this;
      const $register = Lampa.Template.js('register')
        .addClass('selector')
        .addClass('plus-type-new');
      $register.find('.register__counter').html('<img src="./img/icons/add.svg"/>');
      $('.register:last').after($register);
      $register.on('hover:enter', () => {
        Lampa.Input.edit({
          title: 'Название новой категории',
          value: '',
          free: true,
          nosave: true
        }, value => {
          if (value === '' || value === 'card') {
            Lampa.Controller.toggle('content');
            Lampa.Noty.show('Некорректное имя');
            return;
          }
          const newType = favoritePlus.createType(value);
          self.renderPlusButton(newType);
          Lampa.Controller.toggle('content');
        });
      });
    },
    registerLines() {
      Lampa.ContentRows.add({
        index: 100,
        name: 'favorite_plus',
        title: 'Избранное Плюс',
        screen: ['bookmarks'],
        call: (params, screen) => {
          const favorite = favoritePlus.getFavorite();
          const lines = [];
          favoritePlus.getTypesWithoutSystem(favorite).forEach(typeName => {
            const typeUid = favorite.plusTypes[typeName];
            const typeList = favorite[typeUid] || [];
            const typeCards = favorite.plusTypes.card.filter(card => typeList.indexOf(card.id) !== -1);
            const slicedCards = Lampa.Arrays.clone(typeCards.slice(0, 20));
            const totalPages = typeCards.length > 20 ? Math.ceil(typeCards.length / 20) : 1;
            slicedCards.forEach(item => {
              item.params = item.params || {};
              item.params.emit = {
                onEnter: Lampa.Router.call.bind(Lampa.Router, 'full', item),
                onFocus: () => {
                  Lampa.Background.change(Lampa.Utils.cardImgBackground(item))
                }
              };
            });
            if (slicedCards.length > 0) {
              lines.push({
                title: typeName,
                results: slicedCards,
                type: typeUid,
                total_pages: totalPages,
                icon_svg: Lampa.Template.get('plus-icon-svg') || '',
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
  const plusCardSvc = {
    extendContextMenu(object) {
      const self = this;
      const bookmarkMenuItem = $('body > .selectbox').find('.selectbox-item__title').filter(function () {
        return $(this).text() === Lampa.Lang.translate('title_book');
      });
      favoritePlus.getTypesWithoutSystem(favoritePlus.getFavorite()).forEach(plusCategory => {
        const $menuItem = $(
          '<div class="selectbox-item selector">' +
          '<div class="selectbox-item__title">' + plusCategory + '</div>' +
          '<div class="selectbox-item__checkbox"></div>' +
          '</div>'
        );
        $menuItem.insertBefore(bookmarkMenuItem.parent());
        $menuItem.on('hover:enter', function () {
          var category = $(this).find('.selectbox-item__title').text();
          var type = favoritePlus.toggleCard(category, object.data);
          $(this).toggleClass('selectbox-item--checked');
          setTimeout(function () {
            if (object.card) {
              self.refreshPlusIcon(object);
            } else {
              self.refreshBookmarkIcon();
            }
          }, 0);
          plusPageSvc.refresh(type);
        });
        if (favoritePlus.getTypeList(plusCategory).indexOf(object.data.id) >= 0) {
          $menuItem.addClass('selectbox-item--checked');
        }
      });
      Lampa.Controller.collectionSet($('body > .selectbox').find('.scroll__body'));
    },
    refreshPlusIcon(object) {
      const plusCards = favoritePlus.getCards();
      const $iconHolder = $('.card__icons-inner', object.card);
      const isFavorite = plusCards.indexOf(object.data.id) >= 0;
      const $starIcon = $('.icon--star', $iconHolder);
      const hasIcon = $starIcon.length > 0;
      const hidden = hasIcon && $starIcon.hasClass('hide');
      if (isFavorite) {
        if (!hasIcon) {
          $iconHolder.prepend(Lampa.Template.get('plus-icon'));
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
      const plusAny = favoritePlus.getCards().indexOf(card.id) !== -1;
      const favStates = plusAny ? {} : Lampa.Favorite.check(card);
      const anyFavorite = plusAny || Object.keys(favStates).filter(t => t !== 'history' && t !== 'any').some(t => !!favStates[t]);
      const $svg = $('.button--book svg path', active.activity.render());
      $svg.attr('fill', anyFavorite ? 'currentColor' : 'transparent');
    }
  };
  function start() {
    if (window.favorite_plus) return;
    window.favorite_plus = true;
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
        favoritePlus.init({});
      }
    });
    plusSync.init();
    const cardModule = Lampa.Maker.map('Card');
    const onFavoriteUpdate = cardModule.Favorite.onUpdate;
    cardModule.Favorite.onUpdate = function () {
      const self = this;
      onFavoriteUpdate.apply(self);
      plusCardSvc.refreshPlusIcon({ data: self.data, card: self.html });
    };
    const onMenuCreate = cardModule.Menu.onCreate;
    cardModule.Menu.onCreate = function () {
      const self = this;
      const favMenuList = this.menu_list.filter(m => m.title === Lampa.Lang.translate('settings_input_links'))[0];
      if (favMenuList) {
        const originalMenu = favMenuList.menu;
        favMenuList.menu = () => {
          const plusItems = favoritePlus.getTypesWithoutSystem(favoritePlus.getFavorite()).map(typeName => {
            const isChecked = favoritePlus.getTypeList(typeName).indexOf(self.data.id) >= 0;
            return {
              checkbox: true,
              checked: isChecked ? self.data.id : undefined,
              onCheck: () => {
                favoritePlus.toggleCard(typeName, self.data);
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
          return plusItems.concat(originalItems);
        };
      }
      onMenuCreate.apply(this, arguments);
    };
    const favoriteGet = Lampa.Favorite.get;
    Lampa.Favorite.get = function (params) {
      if (!params || !params.type) return favoriteGet.apply(this, arguments);

      const favorite = favoritePlus.getFavorite();
      if (favorite && favorite.hasOwnProperty(params.type) &&
        Array.isArray(favorite[params.type]) &&
        favoritePlus.hasTypeId(favorite, params.type)) {

        const cardIds = favorite[params.type];
        const plusTypeCards = favorite.plusTypes.card;
        return plusTypeCards.filter(c => cardIds.indexOf(c.id) !== -1);
      }
      return favoriteGet.apply(this, arguments);
    };
    const svgIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11 4h2v16h-2V4zM4 11h16v2H4v-2z"/></svg>';
    Lampa.Template.add('plus-icon-svg', svgIcon);
    Lampa.Template.add('plus-icon', '<div class="card__icon icon--star">' + svgIcon + '</div>');
    $('<style>').prop('type', 'text/css').html(
      '.card__icon { position: relative; } ' +
      '.icon--star svg { position: absolute; height: 80%; width: 80%; top: 50%; left: 50%; transform: translate(-50%, -50%) }' +
      '.plus-type-new .register__counter { display:flex; justify-content:center; align-items:center } ' +
      '.plus-type-new .register__counter img { height:2.2em; padding:0.4em; }'
    ).appendTo('head');

    Lampa.Listener.follow('full', event => {
      if (event.type === 'complite') {
        const active = Lampa.Activity.active();
        plusCardSvc.refreshBookmarkIcon();
        const $btnBook = $('.button--book', active.activity.render());
        $btnBook.on('hover:enter', () => {
          plusCardSvc.extendContextMenu({ data: active.card });
        });
      }
    });

    Lampa.Storage.listener.follow('change', event => {
      if (event.name !== 'activity') return;
      if (Lampa.Activity.active().component === 'bookmarks') {
        if ($('.plus-type-new').length === 0) {
          plusPageSvc.renderAddButton();
          const favorite = favoritePlus.getFavorite();
          favoritePlus.getTypesWithoutSystem(favorite).forEach(typeName => {
            const typeUid = favorite.plusTypes[typeName];
            const typeCounter = (favorite[typeUid] || []).length;
            plusPageSvc.renderPlusButton({
              name: typeName,
              uid: typeUid,
              counter: typeCounter
            });
          });
          Lampa.Activity.active().activity.toggle();
        }
      }
    });
    plusPageSvc.registerLines();
  }

  Lampa.Listener.follow('app', event => {
    if (event.type === 'ready') start();
  });
})();
