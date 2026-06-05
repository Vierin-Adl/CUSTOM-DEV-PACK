

window.RtbhInPageCotroller = function (config, settings, onInitCallback, onResizeCallback, onViewportScrollCallback) {

   //
   var canAccessTopWindow = RtbhEnabler.canAccessTopWindow();
   var topWindow = canAccessTopWindow ? RtbhEnabler.getTopWindow() : null;
   var iframeAdNode = RtbhEnabler.getTopAdContainer();
   var iframeAdWrapperNode = iframeAdNode ? iframeAdNode.parentNode : null;

   //
   var inReadRootNode = null;

   function isEligibleForClipFeature() {

      if (topWindow && iframeAdWrapperNode && iframeAdNode && settings.feature.enableClip && hasCssSupportForClip()) {

         var newinReadRootNodeRect = iframeAdWrapperNode.getBoundingClientRect();

         //
         if (newinReadRootNodeRect.width < config.width) {
            return false;
         }

         return true;
      }

      return false;
   }

   function isEligibleForViewPortScrollFeature() {

      if (topWindow && iframeAdWrapperNode && iframeAdNode && settings.feature.enableViewportScroll) {

         var newinReadRootNodeRect = iframeAdWrapperNode.getBoundingClientRect();

         //
         if (newinReadRootNodeRect.width < config.width) {
            return false;
         }

         return true;
      }

      return false;
   }

   function hasCssSupportForClip() {
      var hasClipPath = (function () {
         if (typeof window.CSS !== 'undefined' && typeof CSS.supports === 'function') {
            return (
               CSS.supports('clip-path', 'inset(0)') ||
               CSS.supports('-webkit-clip-path', 'inset(0)')
            );
         }

         // Fallback for IE11 or others without CSS.supports
         var el = document.createElement('div');
         el.style.clipPath = 'inset(0)';
         if (el.style.clipPath) return true;
         el.style.webkitClipPath = 'inset(0)';
         return !!el.style.webkitClipPath;
      })();

      return hasClipPath;
   }

   function getCreativeBottomPositionPercent() {

      //
      var response = {
         percent: 50,
         viewHeight: 0,
         posFromTop: 0,
         posBottom: 0,
         posFromBottom: 0,
      };

      //
      if (!topWindow || !iframeAdWrapperNode) {
         return response;
      }

      //
      var offsetRatio = settings.viewportScrollOffsetRatio;

      // Default offset: 0.5 - half the creative height
      if (typeof offsetRatio !== 'number') {
         offsetRatio = 0.5;
      }

      try {
         var rect = iframeAdWrapperNode.getBoundingClientRect();

         // viewport height
         var viewHeight =
            topWindow.innerHeight ||
            topWindow.document.documentElement.clientHeight ||
            0;

         // creative height
         var creativeHeight = rect.height || 0;

         // measure point: bottom minus offset
         var measureY = rect.bottom - (creativeHeight * offsetRatio);

         // percentage
         var percent = (measureY / viewHeight) * 100;

         // clamp 0–100
         if (percent < 0) percent = 0;
         if (percent > 100) percent = 100;

         //
         var posFromBottom = viewHeight - rect.bottom;

         //
         response.percent = percent;
         response.viewHeight = viewHeight;
         response.posFromTop = rect.top;
         response.posBottom = rect.bottom;
         response.posFromBottom = posFromBottom;

         return response;
      } catch (e) {
         if (window.console && console.warn) {
            console.warn('getCreativeBottomPositionPercent failed:', e);
         }
         return response;
      }
   }

   function reCalculateInReadContentPosition() {

      //
      if (!isEligibleForClipFeature()) {
         return;
      }


      //
      var newinReadRootNodeRect = iframeAdWrapperNode.getBoundingClientRect();

      // H: keep from the left (viewport-relative, adjusted by container origin)
      var calcLeftPos = newinReadRootNodeRect.left;

      // V: center inside container
      var marginTopPos = -parseInt(config.outerHeight) / 2;



      //
      iframeAdNode.style.width = config.width + 'px';
      iframeAdNode.style.height = config.outerHeight + 'px';
      iframeAdNode.style.position = 'fixed';
      iframeAdNode.style.top = '50%';
      iframeAdNode.style.left = calcLeftPos + 'px';
      iframeAdNode.style.marginTop = marginTopPos + 'px';



      // !! Calls creative code after initialization
      onResizeCallback(topWindow, inReadRootNode, iframeAdNode, iframeAdWrapperNode);

      //
      var insTagNode = window.frameElement ? window.frameElement.parentElement : null;
      insTagNode.style.visibility = '';
   }

   function getEmbeddingFrames(maxLevels = 6) {

      var frames = [];
      var currentWin = window;
      var currentFrame = currentWin.frameElement;

      if (currentFrame) frames.push(currentFrame);

      for (var i = 0; i < maxLevels; i++) {
         // stop if top window
         if (currentWin === currentWin.parent) break;

         try {
            var parentWin = currentWin.parent;

            // same-origin probe (throws if cross-origin)
            void parentWin.location.href;

            currentWin = parentWin;

            if (currentWin.frameElement) {
               frames.push(currentWin.frameElement);
            }
         } catch (e) {
            // hit cross-origin boundary → stop climbing
            break;
         }
      }

      return frames;
   }

   function recomputeFramesHeight() {

      //
      if (!isEligibleForClipFeature()) {
         return;
      }

      try {

         //

         var padTop = 0;
         var padBottom = 0;

         //
         var computed = null;
         if (window.getComputedStyle) {
            computed = window.getComputedStyle(iframeAdWrapperNode, null);
         }

         //
         if (computed) {
            padTop = parseFloat(computed.paddingTop) || 0;
            padBottom = parseFloat(computed.paddingBottom) || 0;
         }

         //
         iframeAdWrapperNode.style.clipPath = 'inset(1px 0px)';
         iframeAdWrapperNode.style.display = 'inline-block';
         iframeAdWrapperNode.style.overflow = 'hidden';
         iframeAdWrapperNode.style.width = config.width + 'px';
         iframeAdWrapperNode.style.height = (config.height + padTop + padBottom) + 'px';
         iframeAdWrapperNode.style.outline = '';

         //
         iframeAdNode.style.height = config.outerHeight + 'px';


         //
         var insTagNode = window.frameElement ? window.frameElement.parentElement : null;

         insTagNode.style.visibility = 'hidden';

         //
         if (insTagNode && insTagNode !== iframeAdWrapperNode) {
            insTagNode.style.width = config.width + 'px';
            insTagNode.style.height = config.outerHeight + 'px';
         }

         var framesList = getEmbeddingFrames();
         var i, node, parent, parentWin;


         for (i = 0; i < framesList.length; i++) {
            node = framesList[i];

            //
            try {
               parentWin = node.contentWindow.parent;
            } catch (e) {
               parentWin = null;
            }

            //
            if (parentWin == window.top) {
               break;
            }

            //
            node.style.height = config.outerHeight + 'px';

            //
            parent = node.parentElement;
            while (parent && parent.nodeType === 1 && parent.tagName.toLowerCase() !== 'body') {

               parent.style.height = config.outerHeight + 'px';
               parent = parent.parentElement;
            }

         }

      } catch (e) {
         // ignore cross-origin access errors or missing nodes
      }
   }

   function handleOnCleanup() {

      //
      if (!isEligibleForClipFeature() || !iframeAdWrapperNode || !iframeAdWrapperNode.style) {
         return;
      }

      // clear the styles that were set in recomputeFramesHeight
      iframeAdWrapperNode.style.width = '';
      iframeAdWrapperNode.style.height = '';
      iframeAdWrapperNode.style.clipPath = '';
      iframeAdWrapperNode.style.display = '';
      iframeAdWrapperNode.style.overflow = '';
      iframeAdWrapperNode.style.visibility = '';

      // 
      var insTagNode = window.frameElement ? window.frameElement.parentElement : null;

      if (insTagNode && insTagNode !== iframeAdWrapperNode) {
         insTagNode.style.width = config.width + 'px';
         insTagNode.style.height = config.height + 'px';
         insTagNode.style.visibility = '';
      }

      //
      if (iframeAdNode) {
         iframeAdNode.style.width = config.width + 'px';
         iframeAdNode.style.height = config.height + 'px';
         iframeAdNode.style.position = '';
         iframeAdNode.style.top = '';
         iframeAdNode.style.left = '';
         iframeAdNode.style.marginTop = '';
         iframeAdNode.style.visibility = '';
      }
   }

   function initClipFeature() {

      //
      if (!isEligibleForClipFeature()) {
         return;
      }

      //
      recomputeFramesHeight();

      //
      setTimeout(function () {
         reCalculateInReadContentPosition();
      }, 200)

      //
      topWindow.addEventListener('resize', function () {
         reCalculateInReadContentPosition();
      });

   }

   function initViewPortScrollFeature() {

      //
      if (!isEligibleForViewPortScrollFeature()) {
         return;
      }

      //
      var viewportInfo = getCreativeBottomPositionPercent();
      onViewportScrollCallback(viewportInfo);

      //
      topWindow.addEventListener('scroll', function () {

         //
         var viewportInfo = getCreativeBottomPositionPercent();
         onViewportScrollCallback(viewportInfo);

         // console.log('Creative bottom position:', viewportPercent.percent.toFixed(1) + '%');
      });

      //
      topWindow.addEventListener('resize', function () {

         //
         var viewportInfo = getCreativeBottomPositionPercent();
         onViewportScrollCallback(viewportInfo);

         // console.log('Creative bottom position:', viewportInfo.percent.toFixed(1) + '%');
      });
   }
   //
   function onReady() {

      //
      inReadRootNode = document.querySelector('[data-item="inread-root"]');

      //
      initClipFeature();
      initViewPortScrollFeature();

      //
      var featuresSupport = {
         isEligibleForClipFeature: isEligibleForClipFeature(),
         isEligibleForViewPortScrollFeature: isEligibleForViewPortScrollFeature()
      }

      // !! Calls creative code after initialization
      onInitCallback(topWindow, inReadRootNode, iframeAdNode, iframeAdWrapperNode, featuresSupport);

      // page is being unloaded
      window.addEventListener('pagehide', handleOnCleanup);
      window.addEventListener('beforeunload', handleOnCleanup);
   }


   RtbhEnabler.onDocumentReady(onReady);
};
