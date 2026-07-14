export function buildViewMenu() {
    return [
        { label: "as Icons", action: "view-icons" },
        { label: "as List", action: "view-list" },
        { type: "separator" },
        { label: "Enter Full Screen", action: "toggle-fullscreen" },
    ];
}
