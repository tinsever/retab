let targetTabId = null;

browser.menus.create({
  id: "rename-tab",
  title: "Rename Tab",
  contexts: ["tab"]
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "rename-tab") {
    targetTabId = tab.id;
    browser.browserAction.openPopup();
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getTargetTabId") {
    sendResponse({ targetTabId });
    targetTabId = null;
  }
});