export function buildFileMenu() {
    return [
        { label: "New Finder Window", action: "new-finder-win" },
        { label: "New Folder", action: "new-folder" },
        { label: "New Tab", action: "new-tab" },
        { label: "Open", action: "virtual-open" },
        { label: "Open With", action: "native-open-with" },
        { label: "Print", action: "print" },
        { type: "separator" },
        { label: "Get Info", action: "properties" },
        { label: "Compress", action: "compress" },
        { label: "Duplicate", action: "duplicate" },
        { type: "separator" },
        { label: "Move to Trash", action: "delete-item" },
        { type: "separator" },
        { label: "Close Window", action: "close" },
    ];
}
