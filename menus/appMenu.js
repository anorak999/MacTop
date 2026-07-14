/**
 * Build the app-name submenu.
 * Dynamic — depends on the currently focused app and its open windows.
 */
export function buildAppMenu(appName, detectedApp) {
    const children = [];

    if (detectedApp) {
        const openWindows = detectedApp.get_windows();
        if (openWindows.length > 0) {
            children.push({ type: "section-header", label: "Open Windows" });
            openWindows.forEach(win => {
                children.push({
                    label: win.get_title() || appName,
                    action: `activate-window:${win.get_id()}`,
                });
            });
            children.push({ type: "separator" });
        }
    }

    children.push(
        { label: "New Window", action: "new-app-window" },
        { type: "separator" },
        { label: "App Details", action: `app-details:${detectedApp ? detectedApp.get_id() : ''}` },
        { type: "separator" },
        { label: `Quit ${appName}`, action: "close" },
    );

    return children;
}

/**
 * Build the fallback app menu when no app is focused (desktop/Finder state).
 */
export function buildFallbackAppMenu() {
    return [
        { label: "About MacTop", action: "about-mactop" },
        { type: "separator" },
        { label: "Open Finder", action: "open-finder" },
        { label: "Settings", action: "open-settings" },
        { type: "separator" },
        { label: "Empty Bin...", action: "empty-bin" },
    ];
}
