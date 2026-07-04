export const THEME_STORAGE_KEY = "backfire-theme";

/**
 * Runs before paint (inlined in the root layout) so a stored light preference
 * applies without a flash of the dark theme. Dark remains the default.
 */
export const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){document.documentElement.dataset.theme="light";}}catch(e){}})();`;
