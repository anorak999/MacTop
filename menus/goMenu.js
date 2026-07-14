export function buildGoMenu() {
    return [
        { label: "Back", action: "go-back" },
        { label: "Forward", action: "go-forward" },
        { type: "separator" },
        { label: "Recents", action: "go-recents" },
        { label: "Documents", action: "go-documents" },
        { label: "Desktop", action: "go-desktop" },
        { label: "Downloads", action: "go-downloads" },
        { label: "Home", action: "go-home" },
    ];
}
