(function () {
  window.tacoTrack = function (name) {
    window.va = window.va || function () {
      (window.vaq = window.vaq || []).push(arguments);
    };
    window.va('event', { name: name });
  };
})();
