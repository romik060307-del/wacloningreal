/* WA Cloning RK - phone portrait layout adapter.
 * Keep WhatsApp's own message/composer DOM intact; only switch outer panes.
 */
(function () {
  'use strict';
  try {
    var W = window;
    var D = document;
    if (typeof W.__rkForceMode === 'undefined') W.__rkForceMode = null;
    var lastNotifiedMode = null;

    var viewport = D.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = D.createElement('meta');
      viewport.name = 'viewport';
      (D.head || D.documentElement).appendChild(viewport);
    }
    viewport.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');

    var styleId = 'rk-phone-layout-v15';
    var style = D.getElementById(styleId);
    if (!style) {
      style = D.createElement('style');
      style.id = styleId;
      (D.head || D.documentElement).appendChild(style);
    }
    style.textContent = [
      'html,body{width:100%!important;height:100%!important;max-width:100%!important;overflow:hidden!important;margin:0!important;padding:0!important;}',
      'html.rk-phone-active{--navbar-width:0px!important;}',
      '#app,.app-wrapper-web{box-sizing:border-box!important;width:100vw!important;min-width:0!important;max-width:100vw!important;height:100%!important;max-height:100%!important;margin:0!important;overflow:hidden!important;}',
      '.rk-phone-root{box-sizing:border-box!important;position:relative!important;display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;align-items:stretch!important;width:100vw!important;min-width:0!important;max-width:100vw!important;height:100%!important;max-height:100%!important;overflow:hidden!important;margin:0!important;left:0!important;right:0!important;transform:none!important;}',
      '.rk-phone-root>.rk-phone-side-slot,.rk-phone-root>.rk-phone-main-slot{box-sizing:border-box!important;position:relative!important;top:auto!important;left:auto!important;right:auto!important;transform:none!important;flex:0 0 100vw!important;width:100vw!important;min-width:0!important;max-width:100vw!important;height:100%!important;max-height:100%!important;margin:0!important;overflow:hidden!important;}',
      '.rk-phone-root.rk-phone-list>.rk-phone-side-slot{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
      '.rk-phone-root.rk-phone-list>.rk-phone-main-slot{display:none!important;}',
      '.rk-phone-root.rk-phone-chat>.rk-phone-side-slot,.rk-phone-root.rk-phone-panel>.rk-phone-side-slot{display:none!important;}',
      '.rk-phone-root.rk-phone-chat>.rk-phone-main-slot,.rk-phone-root.rk-phone-panel>.rk-phone-main-slot{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}',
      '.rk-phone-root .rk-phone-nav-rail{display:none!important;width:0!important;min-width:0!important;max-width:0!important;flex:0 0 0!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;}',
      '.rk-phone-root [data-testid="drawer-left"],.rk-phone-root [data-testid="drawer-middle"]{display:none!important;width:0!important;min-width:0!important;max-width:0!important;flex:0 0 0!important;margin:0!important;padding:0!important;border:0!important;}',
      '#side,#pane-side,[data-testid="chat-list"],#main,[data-testid="conversation-panel-wrapper"]{box-sizing:border-box!important;min-width:0!important;max-width:100%!important;width:100%!important;height:100%!important;}',
      '#side,#pane-side,[data-testid="chat-list"]{flex:1 1 auto!important;overflow:hidden!important;}',
      '#main,[data-testid="conversation-panel-wrapper"]{flex:1 1 auto!important;overflow:hidden!important;}',
      '#main footer [contenteditable="true"],#main [data-testid="conversation-compose-box-input"]{font-size:16px!important;}',
      '@media (max-width:760px){.app-wrapper-web{top:0!important;}}'
    ].join('\n');

    function first(selectors) {
      for (var i = 0; i < selectors.length; i++) {
        try {
          var found = D.querySelector(selectors[i]);
          if (found) return found;
        } catch (ignore) { }
      }
      return null;
    }

    function directChildOf(node, ancestor) {
      if (!node || !ancestor) return null;
      var current = node;
      while (current && current.parentElement && current.parentElement !== ancestor) {
        current = current.parentElement;
      }
      return current && current.parentElement === ancestor ? current : null;
    }

    function resolvePanes() {
      var side = first(['#side', '#pane-side', '[data-testid="chat-list"]']);
      var main = first(['#main', '[data-testid="conversation-panel-wrapper"]']);
      var root = (side && side.closest && side.closest('div.two')) ||
        (main && main.closest && main.closest('div.two')) ||
        first(['#app .app-wrapper-web .app.two', '#app .two', 'div.two']);
      if (!root) root = first(['#app .app-wrapper-web .app', '#app .app-wrapper-web', '#app']);
      if (root) root.classList.add('rk-phone-root');

      var sideSlot = directChildOf(side, root) || side;
      var mainSlot = directChildOf(main, root) || main;
      if (sideSlot) sideSlot.classList.add('rk-phone-side-slot');
      if (mainSlot) mainSlot.classList.add('rk-phone-main-slot');

      var railAnchor = first(['header[data-testid="chatlist-header"]']);
      var rail = directChildOf(railAnchor, root) || railAnchor;
      if (!rail && root) {
        var children = root.children || [];
        for (var c = 0; c < children.length; c++) {
          var candidate = children[c];
          if (candidate === sideSlot || candidate === mainSlot) continue;
          var buttons = candidate.querySelectorAll ? candidate.querySelectorAll('button,[role="button"],[aria-label]') : [];
          var rect = candidate.getBoundingClientRect ? candidate.getBoundingClientRect() : null;
          if (buttons.length >= 4 && rect && rect.width > 0 && rect.width <= 150) {
            rail = candidate;
            break;
          }
        }
      }
      if (rail && rail !== sideSlot && rail !== mainSlot) rail.classList.add('rk-phone-nav-rail');

      return { root: root, side: side, main: main, sideSlot: sideSlot, mainSlot: mainSlot, rail: rail };
    }

    function isNarrowPhone() {
      var widths = [W.innerWidth, D.documentElement && D.documentElement.clientWidth,
        W.screen && W.screen.width].filter(function (n) { return n && n > 0; });
      var heights = [W.innerHeight, W.screen && W.screen.height].filter(function (n) { return n && n > 0; });
      return widths.length > 0 && Math.min.apply(Math, widths) <= 760 &&
        (heights.length === 0 || Math.max.apply(Math, heights) >= Math.min.apply(Math, widths));
    }

    function inferMode(panes) {
      var main = panes.main;
      if (!main) return 'list';
      var text = (main.innerText || '').toLowerCase().slice(0, 3200);
      var special = !!main.querySelector('[data-testid*="status-v3-viewer"],[data-testid*="media-viewer"],[data-testid*="status-viewer"],[data-testid*="settings-view"],[data-testid*="settings-main"],[role="dialog"]');
      if (special) return 'panel';

      var composer = !!main.querySelector('footer [contenteditable="true"],[data-testid="conversation-compose-box-input"],[data-tab="10"][contenteditable="true"]');
      var header = !!main.querySelector('[data-testid="conversation-panel-header"],[data-testid="conversation-header"],[data-testid="conversation-info-header"],header');
      var intro = !!main.querySelector('#intro,[data-testid="intro"],[data-testid*="intro"]') ||
        /select a chat to start messaging|pilih chat untuk mulai mengirim pesan|start a conversation|mulai percakapan/.test(text);
      var empty = !(main.innerText || '').trim() && !main.querySelector('video,canvas');
      if (composer) return 'chat';
      if (intro || empty) return 'list';
      if (header) return 'chat';
      return 'list';
    }

    function notifyNative(mode) {
      if (mode === lastNotifiedMode) return;
      lastNotifiedMode = mode;
      try {
        if (W.WACloningApp && typeof W.WACloningApp.onPhoneScreenChanged === 'function') {
          W.WACloningApp.onPhoneScreenChanged(mode);
        }
      } catch (ignore) { }
    }

    function syncMode() {
      try {
        var panes = resolvePanes();
        var root = panes.root;
        if (!root) return;
        if (!isNarrowPhone() || !panes.sideSlot || !panes.mainSlot) {
          root.classList.remove('rk-phone-list', 'rk-phone-chat', 'rk-phone-panel');
          D.documentElement.classList.remove('rk-phone-active');
          notifyNative('list');
          return;
        }
        D.documentElement.classList.add('rk-phone-active');
        var mode = W.__rkForceMode || inferMode(panes);
        if (mode !== 'chat' && mode !== 'panel') mode = 'list';
        root.classList.toggle('rk-phone-list', mode === 'list');
        root.classList.toggle('rk-phone-chat', mode === 'chat');
        root.classList.toggle('rk-phone-panel', mode === 'panel');
        notifyNative(mode);
      } catch (ignore) { }
    }

    W.__rkPhoneSync = syncMode;
    W.__rkReturnToList = function () {
      try {
        var panes = resolvePanes();
        var root = panes.root;
        if (!root) return false;
        var alreadyList = root.classList.contains('rk-phone-list') ||
          (W.__rkForceMode === 'list' && !root.classList.contains('rk-phone-chat') && !root.classList.contains('rk-phone-panel'));
        if (alreadyList) return false;
        W.__rkForceMode = 'list';
        syncMode();
        return true;
      } catch (ignore) { return false; }
    };

    function closestRow(target) {
      if (!target || !target.closest) return null;
      return target.closest(
        '#side [data-testid*="cell-frame-container"],#side [data-testid*="chat-list-item"],#side [data-testid*="cell-frame"],#side [role="gridcell"],#side [role="row"],#side [role="listitem"],' +
        '#pane-side [data-testid*="cell-frame-container"],#pane-side [role="gridcell"],#pane-side [role="row"],#pane-side [role="listitem"],' +
        '[data-testid="chat-list"] [data-testid*="cell-frame-container"],[data-testid="chat-list"] [role="gridcell"],[data-testid="chat-list"] [role="row"],[data-testid="chat-list"] [role="listitem"]'
      );
    }

    function scheduleSync() {
      W.setTimeout(syncMode, 100);
      W.setTimeout(syncMode, 260);
      W.setTimeout(syncMode, 560);
      W.setTimeout(syncMode, 1000);
    }

    if (!W.__rkPhoneClickHookV15) {
      W.__rkPhoneClickHookV15 = true;
      D.addEventListener('click', function (event) {
        try {
          var target = event.target;
          if (target && target.nodeType !== 1) target = target.parentElement;
          if (!target || !target.closest) return;
          var panes = resolvePanes();

          if (panes.side && panes.side.contains(target)) {
            var blocked = target.closest('input,textarea,[contenteditable="true"],header,button,[role="button"],[data-testid*="search"],[data-testid*="filter"],[data-testid*="menu"],[aria-label*="Search"],[aria-label*="search"]');
            if (!blocked) {
              var row = closestRow(target);
              if (row) {
                var rowId = ((row.getAttribute('data-testid') || '') + ' ' + (row.getAttribute('aria-label') || '')).toLowerCase();
                W.__rkForceMode = (rowId.indexOf('status-viewer') >= 0 || rowId.indexOf('settings-view') >= 0) ? 'panel' : 'chat';
              } else {
                var rect = panes.side.getBoundingClientRect();
                var targetRect = target.getBoundingClientRect();
                var relativeY = targetRect.top + targetRect.height / 2 - rect.top;
                if (relativeY > Math.min(110, rect.height * 0.20)) W.__rkForceMode = 'chat';
              }
              scheduleSync();
            }
            return;
          }

          if (panes.main && panes.main.contains(target)) {
            var clickEl = target.closest('button,[role="button"],[aria-label],[data-testid],[data-icon]') || target;
            var meta = ((clickEl.getAttribute('aria-label') || '') + ' ' + (clickEl.getAttribute('title') || '') + ' ' +
              (clickEl.getAttribute('data-testid') || '') + ' ' + (clickEl.getAttribute('data-icon') || '') + ' ' +
              (clickEl.innerText || '')).toLowerCase();
            var inHeader = !!target.closest('#main header,[data-testid*="conversation-panel-header"],[data-testid*="conversation-header"]');
            if (inHeader && (/(^|\s)(back|go back|kembali|return|close chat)(\s|$)/.test(meta) ||
                meta.indexOf('data-icon back') >= 0 || meta.indexOf('back-button') >= 0)) {
              W.__rkForceMode = 'list';
              scheduleSync();
            }
          }
        } catch (ignore) { }
      }, true);
      W.addEventListener('resize', function () { W.setTimeout(syncMode, 150); });
      W.addEventListener('orientationchange', function () { W.setTimeout(syncMode, 250); });
    }

    if (!W.__rkPhoneObserverV15 && D.body) {
      W.__rkPhoneObserverV15 = new MutationObserver(function () {
        if (W.__rkPhoneTimerV15) W.clearTimeout(W.__rkPhoneTimerV15);
        W.__rkPhoneTimerV15 = W.setTimeout(syncMode, 220);
      });
      // React to layout/content changes, not attribute churn on each message.
      W.__rkPhoneObserverV15.observe(D.body, { childList: true, subtree: true });
    }

    // Remove stale v1.4 classes if this script is reinjected after a WebView restore.
    try { D.body.classList.remove('rk-phone-list', 'rk-phone-chat', 'rk-phone-panel'); } catch (ignore) { }
    W.__rkForceMode = null;
    syncMode();
    if (W.__rkPhoneResyncV15) W.clearInterval(W.__rkPhoneResyncV15);
    W.__rkPhoneResyncV15 = W.setInterval(syncMode, 900);
    return 'ok';
  } catch (ignore) {
    return 'ignored';
  }
})();
