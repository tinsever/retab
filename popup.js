async function applyThemeColors() {
  const theme = await browser.theme.getCurrent();
  const style = document.createElement('style');
  const colors = theme.colors || {};
  const popup = colors.popup || {};
  
  style.textContent = `
    body {
      background-color: ${popup.color || colors.frame || '#ffffff'};
      color: ${popup.textcolor || colors.tab_text || '#0c0c0d'};
    }
    
    input {
      background-color: ${popup.input || colors.toolbar || '#ffffff'};
      color: ${popup.textcolor || colors.tab_text || '#0c0c0d'};
      border-color: ${colors.toolbar_field_border || '#d7d7db'};
    }
    
    button {
      background-color: ${colors.button_background_active || '#0060df'};
      color: ${colors.button_text || '#ffffff'};
    }
  `;
  
  document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', async () => {
  await applyThemeColors();
  
  const response = await browser.runtime.sendMessage({ action: "getTargetTabId" });
  const targetTabId = response.targetTabId;
  
  const tabId = targetTabId || (await browser.tabs.query({active: true, currentWindow: true}))[0].id;
  const tab = await browser.tabs.get(tabId);
  
  document.getElementById('titleInput').value = tab.title;
  
  document.getElementById('saveButton').addEventListener('click', async () => {
    const newTitle = document.getElementById('titleInput').value;
    if (newTitle.trim() !== '') {
      await browser.tabs.executeScript(tabId, {
        code: `document.title = "${newTitle.replace(/"/g, '\\"')}";`
      });
      window.close();
    }
  });

  document.getElementById('titleInput').addEventListener('keyup', async (e) => {
    if (e.key === 'Enter') {
      document.getElementById('saveButton').click();
    }
  });
});