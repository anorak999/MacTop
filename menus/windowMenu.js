export function buildWindowMenu() {
    return [
        { label: "Minimize", action: "minimize" },
        { label: "Maximize", action: "maximize" },
        { type: "separator" },
        { label: "Close", action: "close" },
    ];
}
