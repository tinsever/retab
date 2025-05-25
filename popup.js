function setPageTitle(title) {
  document.title = title || "";
}

async function applyThemeColors() {
  try {
    const theme = await browser.theme.getCurrent();
    if (!theme || !theme.colors) {
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#0c0c0d';
      const inputs = document.querySelectorAll('input[type="text"]');
      inputs.forEach(input => {
        input.style.backgroundColor = '#ffffff';
        input.style.color = '#0c0c0d';
        input.style.borderColor = '#d7d7db';
      });
      const buttons = document.querySelectorAll('button');
      buttons.forEach(button => {
        button.style.backgroundColor = '#0060df';
        button.style.color = '#ffffff';
      });
      return;
    }

    const style = document.createElement('style');
    const colors = theme.colors;
    const popupColors = colors.popup || {};

    const bodyBgColor = popupColors.color || colors.frame || colors.toolbar || '#ffffff';
    const bodyTextColor = popupColors.textcolor || colors.tab_text || colors.toolbar_text || '#0c0c0d';
    const inputBgColor = colors.input_background || colors.toolbar_field || '#fcfcfc';
    const inputTextColor = colors.input_text || colors.toolbar_field_text || bodyTextColor;
    const inputBorderColor = colors.input_border || colors.toolbar_field_border || '#d7d7db';
    const inputFocusBorderColor = colors.input_border_focus || colors.focus_outline || '#0060df';
    const inputFocusShadow = colors.input_focus_shadow || `rgba(0, 96, 223, 0.3)`;
    const buttonBgColor = colors.button_background_active || colors.toolbar_button_background_hover || '#0060df';
    const buttonTextColor = colors.button_text || colors.toolbar_text || '#ffffff';

    style.textContent = `
      body {
        background-color: ${bodyBgColor};
        color: ${bodyTextColor};
      }
      input[type="text"] {
        background-color: ${inputBgColor};
        color: ${inputTextColor};
        border-color: ${inputBorderColor};
      }
      input[type="text"]:focus {
        border-color: ${inputFocusBorderColor};
        box-shadow: 0 0 0 2px ${inputFocusShadow};
      }
      .persistent-container label {
        color: ${bodyTextColor}; 
      }
      button {
        background-color: ${buttonBgColor};
        color: ${buttonTextColor};
      }
    `;
    document.head.appendChild(style);
  } catch (e) {
    console.error("Retab: Error while setting up theme colors.", e);
    document.body.style.backgroundColor = '#f9f9f9';
    document.body.style.color = '#111111';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await applyThemeColors();

    const response = await browser.runtime.sendMessage({ action: "getTargetTabId" });
    const targetTabIdFromBackground = response ? response.targetTabId : null;

    let tabId;
    let currentUrl;
    let currentTabObject;

    if (targetTabIdFromBackground) {
      tabId = targetTabIdFromBackground;
    } else {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        tabId = tabs[0].id;
      } else {
        console.error("Retab: Unable to find active tab.");
        document.body.innerHTML = "<p>Error: Unable to find tab to rename.</p>";
        return;
      }
    }

    try {
      currentTabObject = await browser.tabs.get(tabId);
      currentUrl = currentTabObject.url;
    } catch (e) {
      console.error(`Retab: Error while retrieving tab information for tab id ${tabId}`, e);
      document.body.innerHTML = `<p>Error: Tab-Details weren't able to be loaded (ID: ${tabId}).</p>`;
      return;
    }

    let initialTitle = currentTabObject.title || '';
    const persistentCheckbox = document.getElementById('persistentCheckbox');

    persistentCheckbox.checked = true; 

    if (currentUrl && !currentUrl.startsWith("about:") && !currentUrl.startsWith("moz-extension:")) {
      try {
        const storedData = await browser.storage.local.get(currentUrl);
        if (storedData && typeof storedData[currentUrl] === 'string') {
          initialTitle = storedData[currentUrl];
          persistentCheckbox.checked = true; 
        } else {
          persistentCheckbox.checked = true;
        }
      } catch (e) {
        console.warn("Retab: Error while loading tab title.", e);
      }
    } else {
        persistentCheckbox.checked = true;
    }
    
    const titleInputElement = document.getElementById('titleInput');
    const saveButtonElement = document.getElementById('saveButton');

    if (!titleInputElement || !saveButtonElement || !persistentCheckbox) {
        console.error("Retab: Popup Element wasn't found!");
        document.body.innerHTML = "<p>Error: Popup-Structure is broken.</p>";
        return;
    }

    titleInputElement.value = initialTitle;
    titleInputElement.focus();
    titleInputElement.select();
  
    saveButtonElement.addEventListener('click', async () => {
      const newTitle = titleInputElement.value;
      const trimmedNewTitle = newTitle.trim();
      const makePersistent = persistentCheckbox.checked;
      
      let titleToApplyToPage = null; 
      let validUrlForStorage = currentUrl && !currentUrl.startsWith("about:") && !currentUrl.startsWith("moz-extension:");

      if (makePersistent) {
        if (validUrlForStorage) {
          if (trimmedNewTitle !== '') {
            try {
              await browser.storage.local.set({ [currentUrl]: trimmedNewTitle });
              titleToApplyToPage = trimmedNewTitle;
            } catch (e) {
              console.error("Retab: Error while saving tab title (persistent)", e);
              titleToApplyToPage = trimmedNewTitle; 
            }
          } else { // Leerer Titel -> aus Speicher entfernen
            try {
              await browser.storage.local.remove(currentUrl);
              titleToApplyToPage = null; // Signalisiert Entfernung
            } catch (e) {
              console.error("Retab: Error while removing persistent tabl name.", e);
            }
          }
        } else {
          titleToApplyToPage = (trimmedNewTitle !== '') ? trimmedNewTitle : null;
        }
      } else {
        if (validUrlForStorage) {
          try {
            await browser.storage.local.remove(currentUrl);
          } catch (e) {
            console.error("Retab: Error while removing the tab title from storage.", e);
          }
        }
        titleToApplyToPage = (trimmedNewTitle !== '') ? trimmedNewTitle : null;
      }

      try {
        await browser.scripting.executeScript({
          target: { tabId: tabId },
          func: setPageTitle,
          args: [titleToApplyToPage]
        });
      } catch (e) {
        console.warn("Retab: Error while renaming tab.", e);
      }
      
      if (validUrlForStorage) {
          try {
            await browser.tabs.sendMessage(tabId, {
              action: "retab_title_updated_from_popup",
              url: currentUrl,
              newTitle: titleToApplyToPage 
            });
          } catch (e) {
          }
      }
      window.close();
    });
  
    titleInputElement.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        saveButtonElement.click();
      }
    });

  } catch (error) {
    console.error("Retab: Fatal error while initializing popup:", error);
    const bodyElement = document.querySelector('body');
    if (bodyElement) {
        bodyElement.innerHTML = "<p style='color: red; padding: 10px;'>An error occured.</p>";
    }
  }
});
