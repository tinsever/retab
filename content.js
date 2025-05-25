(async () => {
    let currentAppliedCustomTitle = null;
    let titleMutationObserver = null;
    const applyCustomTitle = (title) => {
        if (document.title !== title) {
            document.title = title;
        }
    };
    const updateTitleFromStorage = async () => {
        const url = window.location.href;
        try {
            const data = await browser.storage.local.get(url);
            if (data && typeof data[url] === 'string' && data[url].trim() !== "") {
                currentAppliedCustomTitle = data[url].trim();
                applyCustomTitle(currentAppliedCustomTitle);
            } else {
                currentAppliedCustomTitle = null;
            }
        } catch (e) {
            console.warn("Retab (Content Script): Error reading title from storage.", e);
            currentAppliedCustomTitle = null;
        }
        setupMutationObserver();
    };
    const setupMutationObserver = () => {
        if (titleMutationObserver) {
            titleMutationObserver.disconnect();
        }
        const titleElement = document.querySelector('head > title');
        if (titleElement) {
            titleMutationObserver = new MutationObserver(() => {
                if (currentAppliedCustomTitle !== null && document.title !== currentAppliedCustomTitle) {
                    applyCustomTitle(currentAppliedCustomTitle);
                }
            });
            titleMutationObserver.observe(titleElement, { childList: true, subtree: true, characterData: true });
        }
    };
    await updateTitleFromStorage();
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.action === "retab_title_updated_from_popup" && message.url === window.location.href) {
            if (message.newTitle && message.newTitle.trim() !== "") {
                currentAppliedCustomTitle = message.newTitle.trim();
                applyCustomTitle(currentAppliedCustomTitle);
            } else {
                currentAppliedCustomTitle = null;
            }
            return Promise.resolve({ status: "Title update processed by content script." });
        }
        return true;
    });
})();
