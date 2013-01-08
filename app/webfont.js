WebFontConfig = {
    google: { families: [ 'Source+Code+Pro::latin' ] },
    active: onFontActive  // defined in editor.js
};
(function() {
     var wf = document.createElement('script');
     wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js';
     wf.type = 'text/javascript';
     wf.async = 'true';
     var s = document.getElementsByTagName('script')[0];
     s.parentNode.insertBefore(wf, s);
 })();
