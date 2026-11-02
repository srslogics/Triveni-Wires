"use strict";
// Keep a visible recovery state when a deployment asset cannot load. Never clear
// saved transactions as an automatic response to a startup error.
(function () {
  function startupFailure() {
    if (window.ForecourtReady) return;
    const error = document.getElementById("startup-error");
    if (error) error.hidden = false;
  }
  window.addEventListener("error", startupFailure, true);
  window.addEventListener("unhandledrejection", startupFailure);
  setTimeout(startupFailure, 12000);
})();
