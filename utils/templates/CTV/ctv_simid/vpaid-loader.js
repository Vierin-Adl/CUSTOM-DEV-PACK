// @ts-nocheck
/* RTBH VPAID loader - keep this file ES5 syntax only. */
;(function () {
   var DIAGNOSTIC_ENDPOINT = 'https://event-tracking-dot-videoads.appspot.com/storeEvent'
   var SDK_FILE = 'rtbh_video_interactive_sdk.js'
   var LOADER_FILE = 'vpaid-loader.js'
   var win = window
   var doc = win.document
   var currentScript = findCurrentScript()
   var loaderUrl = currentScript && currentScript.src ? currentScript.src : ''
   var query = getQuery(loaderUrl)
   var sdkUrl = buildSiblingSdkUrl(loaderUrl, query)
   var pendingProxyAds = []
   var loaderFactory = createLoaderFactory()
   var previousFactory = typeof win.getVPAIDAd === 'function' ? win.getVPAIDAd : null
   var flushStarted = false

   installDeferredFactory()
   reportRequested(query, loaderUrl, sdkUrl)
   loadSdk(sdkUrl)
   scheduleFlush()

   function findCurrentScript() {
      var scripts
      var i

      if (doc.currentScript && doc.currentScript.src) {
         return doc.currentScript
      }

      scripts = doc.getElementsByTagName ? doc.getElementsByTagName('script') : []
      for (i = scripts.length - 1; i >= 0; i -= 1) {
         if (scripts[i] && scripts[i].src && scripts[i].src.indexOf(LOADER_FILE) !== -1) {
            return scripts[i]
         }
      }

      return scripts.length ? scripts[scripts.length - 1] : null
   }

   function removeHash(value) {
      var hashIndex = value.indexOf('#')
      return hashIndex === -1 ? value : value.slice(0, hashIndex)
   }

   function getQuery(value) {
      var cleaned = removeHash(value || '')
      var queryIndex = cleaned.indexOf('?')
      return queryIndex === -1 ? '' : cleaned.slice(queryIndex + 1)
   }

   function getPath(value) {
      var cleaned = removeHash(value || '')
      var queryIndex = cleaned.indexOf('?')
      return queryIndex === -1 ? cleaned : cleaned.slice(0, queryIndex)
   }

   function buildSiblingSdkUrl(value, queryValue) {
      var pathPart = getPath(value)
      var slashIndex = pathPart.lastIndexOf('/')
      var folder = slashIndex === -1 ? '' : pathPart.slice(0, slashIndex + 1)
      var forwarded = buildForwardedQuery(queryValue)
      return folder + SDK_FILE + forwarded
   }

   function buildForwardedQuery(queryValue) {
      var parts = queryValue ? queryValue.split('&') : []
      var kept = []
      var hasType = false
      var i
      var part
      var key
      var equalIndex

      for (i = 0; i < parts.length; i += 1) {
         part = parts[i]
         if (!part) continue
         equalIndex = part.indexOf('=')
         key = equalIndex === -1 ? part : part.slice(0, equalIndex)
         key = decode(key)
         if (key === 'src') continue
         if (key === 'type') hasType = true
         kept.push(part)
      }

      if (!hasType) {
         kept.push('type=vpaid')
      }

      return kept.length ? '?' + kept.join('&') : ''
   }

   function decode(value) {
      try {
         return decodeURIComponent(String(value || '').replace(/\+/g, ' '))
      } catch (_err) {
         return ''
      }
   }

   function encode(value) {
      try {
         return encodeURIComponent(String(value == null ? '' : value))
      } catch (_err) {
         return ''
      }
   }

   function readParam(queryValue, key) {
      var parts = queryValue ? queryValue.split('&') : []
      var i
      var part
      var equalIndex
      var name

      for (i = 0; i < parts.length; i += 1) {
         part = parts[i]
         equalIndex = part.indexOf('=')
         name = equalIndex === -1 ? part : part.slice(0, equalIndex)
         if (decode(name) === key) {
            return decode(equalIndex === -1 ? '' : part.slice(equalIndex + 1))
         }
      }

      return ''
   }

   function stringify(value) {
      if (win.JSON && typeof win.JSON.stringify === 'function') {
         try {
            return win.JSON.stringify(value)
         } catch (_err) {
            return '{}'
         }
      }

      return '{}'
   }

   function toArray(args) {
      var result = []
      var i

      for (i = 0; i < args.length; i += 1) {
         result.push(args[i])
      }

      return result
   }

   function getHandshakeResult(playerVersion) {
      var value = playerVersion == null ? '' : String(playerVersion)
      return value.indexOf('1.') === 0 ? '1.0' : '2.0'
   }

   function installDeferredFactory() {
      var current = win.getVPAIDAd

      if (typeof current === 'function' && current !== loaderFactory && current._rtbhVpaidLoader !== true) {
         previousFactory = current
         return
      }

      loaderFactory._rtbhVpaidLoader = true
      win.getVPAIDAd = loaderFactory
   }

   function getRealFactory() {
      var current = win.getVPAIDAd

      if (typeof current === 'function' && current !== loaderFactory && current._rtbhVpaidLoader !== true) {
         return current
      }

      if (typeof previousFactory === 'function' && previousFactory !== loaderFactory && previousFactory._rtbhVpaidLoader !== true) {
         return previousFactory
      }

      return null
   }

   function createLoaderFactory() {
      return function getVPAIDAd() {
         var factory = getRealFactory()
         var proxy

         if (factory) {
            return factory.apply(win, arguments)
         }

         proxy = createProxyAd()
         pendingProxyAds.push(proxy)
         scheduleFlush()
         return proxy.api
      }
   }

   function createProxyAd() {
      var queued = []
      var realAd = null
      var api = {}

      function callOrQueue(method, args) {
         if (realAd && typeof realAd[method] === 'function') {
            return realAd[method].apply(realAd, args)
         }

         queued.push({ method: method, args: toArray(args) })
         return undefined
      }

      function callOrDefault(method, args, fallback) {
         if (realAd && typeof realAd[method] === 'function') {
            return realAd[method].apply(realAd, args)
         }

         return fallback
      }

      function attach(factory) {
         var i
         var item

         if (realAd) return

         realAd = factory()
         for (i = 0; i < queued.length; i += 1) {
            item = queued[i]
            if (realAd && typeof realAd[item.method] === 'function') {
               realAd[item.method].apply(realAd, item.args)
            }
         }
         queued = []
      }

      api.handshakeVersion = function (playerVersion) {
         callOrQueue('handshakeVersion', arguments)
         return getHandshakeResult(playerVersion)
      }
      api.initAd = function () { return callOrQueue('initAd', arguments) }
      api.startAd = function () { return callOrQueue('startAd', arguments) }
      api.stopAd = function () { return callOrQueue('stopAd', arguments) }
      api.pauseAd = function () { return callOrQueue('pauseAd', arguments) }
      api.resumeAd = function () { return callOrQueue('resumeAd', arguments) }
      api.resizeAd = function () { return callOrQueue('resizeAd', arguments) }
      api.expandAd = function () { return callOrQueue('expandAd', arguments) }
      api.collapseAd = function () { return callOrQueue('collapseAd', arguments) }
      api.skipAd = function () { return callOrQueue('skipAd', arguments) }
      api.subscribe = function () { return callOrQueue('subscribe', arguments) }
      api.unsubscribe = function () { return callOrQueue('unsubscribe', arguments) }
      api.setAdVolume = function () { return callOrQueue('setAdVolume', arguments) }
      api.getAdDuration = function () { return callOrDefault('getAdDuration', arguments, -2) }
      api.getAdRemainingTime = function () { return callOrDefault('getAdRemainingTime', arguments, -2) }
      api.getAdVolume = function () { return callOrDefault('getAdVolume', arguments, 1) }
      api.getAdWidth = function () { return callOrDefault('getAdWidth', arguments, 0) }
      api.getAdHeight = function () { return callOrDefault('getAdHeight', arguments, 0) }
      api.getAdExpanded = function () { return callOrDefault('getAdExpanded', arguments, false) }
      api.getAdSkippableState = function () { return callOrDefault('getAdSkippableState', arguments, false) }
      api.getAdLinear = function () { return callOrDefault('getAdLinear', arguments, true) }
      api.getAdIcons = function () { return callOrDefault('getAdIcons', arguments, '') }
      api.getAdCompanions = function () { return callOrDefault('getAdCompanions', arguments, '') }

      return { api: api, attach: attach }
   }

   function flushPendingAds() {
      var factory = getRealFactory()
      var pending
      var i

      if (!factory) return false

      pending = pendingProxyAds
      pendingProxyAds = []
      for (i = 0; i < pending.length; i += 1) {
         pending[i].attach(factory)
      }

      return true
   }

   function scheduleFlush() {
      var started

      if (flushStarted) return

      flushStarted = true
      started = new Date().getTime()

      function tick() {
         if (flushPendingAds()) return
         if (new Date().getTime() - started < 15000) {
            win.setTimeout(tick, 25)
            return
         }
         flushStarted = false
      }

      tick()
   }

   function reportRequested(queryValue, scriptUrl, targetUrl) {
      var ids = {
         advertiserHash: readParam(queryValue, 'advertiserHash'),
         campaignHash: readParam(queryValue, 'campaignHash'),
         creativeHash: readParam(queryValue, 'creativeHash'),
         impressionHash: readParam(queryValue, 'impressionHash')
      }
      var payload = {
         diagnosticEventType: 'DEBUG_VPAID_JS_REQUESTED',
         diagnosticTimestamp: new Date().toISOString(),
         scriptSrc: targetUrl,
         loaderPath: getPath(scriptUrl),
         type: readParam(queryValue, 'type') || 'vpaid'
      }
      var diagnosticUrl = DIAGNOSTIC_ENDPOINT +
         '?advertiserHash=' + encode(ids.advertiserHash) +
         '&campaignHash=' + encode(ids.campaignHash) +
         '&creativeHash=' + encode(ids.creativeHash) +
         '&impressionHash=' + encode(ids.impressionHash) +
         '&eventType=DEBUG_VPAID_JS_REQUESTED' +
         '&extraPayload=' + encode(stringify(payload))

      function fallbackImage() {
         var img
         try {
            img = new Image()
            win.__rtbhVpaidLoaderPixels = win.__rtbhVpaidLoaderPixels || []
            win.__rtbhVpaidLoaderPixels.push(img)
            img.src = diagnosticUrl
         } catch (_err) {
            // best-effort diagnostics only
         }
      }

      if (typeof win.fetch === 'function') {
         try {
            var request = win.fetch(diagnosticUrl, { mode: 'no-cors', keepalive: true })
            if (request && typeof request.catch === 'function') {
               request.catch(fallbackImage)
            }
            return
         } catch (_err) {
            fallbackImage()
            return
         }
      }

      fallbackImage()
   }

   function escapeAttribute(value) {
      return String(value || '')
         .replace(/&/g, '&amp;')
         .replace(/"/g, '&quot;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
   }

   function loadSdk(targetUrl) {
      var script
      var firstScript
      var parent

      if (!targetUrl || !doc) return

      if (doc.readyState === 'loading' && typeof doc.write === 'function') {
         doc.write('<script src="' + escapeAttribute(targetUrl) + '"><\/script>')
         return
      }

      script = doc.createElement('script')
      script.src = targetUrl
      script.async = false
      script.onload = flushPendingAds
      script.onreadystatechange = function () {
         if (script.readyState === 'loaded' || script.readyState === 'complete') {
            flushPendingAds()
         }
      }
      script.setAttribute('data-rtbh-vpaid-loader', 'sdk')

      firstScript = doc.getElementsByTagName('script')[0]
      parent = firstScript && firstScript.parentNode ? firstScript.parentNode : doc.head || doc.documentElement
      if (firstScript && parent) {
         parent.insertBefore(script, firstScript)
      } else if (parent) {
         parent.appendChild(script)
      }
   }
}())
