import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress ResizeObserver loop errors which are harmless but trigger the error overlay in dev
const ignoreErrors = [
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded'
];

window.addEventListener('error', e => {
  if (ignoreErrors.includes(e.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

// Also suppress in console to be sure
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && ignoreErrors.some(msg => args[0].includes(msg))) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
