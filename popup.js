document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab.url;

    if (url.includes("workday.com")) {
      chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            function: captureTextAfterEligibility,
          },
          (result) => {
            const textFromDiv = result[0].result;
            const selectedTextDiv = document.getElementById('selectedText');

            if (textFromDiv) {
              const cacheKey = `openai_response_${btoa(textFromDiv)}`; // Unique key for caching
              chrome.storage.local.get([cacheKey], (data) => {
                if (data[cacheKey]) {
                  selectedTextDiv.innerText = data[cacheKey];
                } else {
                  requestOpenAIResponse(textFromDiv, cacheKey, selectedTextDiv);
                }
              });
            } else {
              selectedTextDiv.innerText = 'No Course Requirements';
            }
          }
      );
    } else {
      document.getElementById('selectedText').innerText = 'Not a Workday page';
    }
  });
});


function requestOpenAIResponse(text, cacheKey, selectedTextDiv) {
  chrome.runtime.sendMessage({ action: "getOpenAIResponse", text: text }, (response) => {
    if (response.error) {
      selectedTextDiv.innerText = response.error;
    } else {
      selectedTextDiv.innerText = response.titles;
      chrome.storage.local.set({ [cacheKey]: response.titles });
    }
  });
}

const captureTextAfterEligibility = () => {
  const eligibilityLabel = Array.from(document.querySelectorAll('label[data-automation-id="formLabel"]'))
      .find(label => label.innerText.trim() === 'Eligibility');

  if (eligibilityLabel) {
    const liElement = eligibilityLabel.closest('li');
    const nextDiv = liElement.querySelector('div[data-automation-id="richTextEditor"][data-uxi-widget-editable="false"]');
    return nextDiv ? nextDiv.innerHTML.trim() : null;
  }
  return null;
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "removeEntry",
    title: "Remove Entry from Storage",
    contexts: ["all"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "removeEntry") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id > 0) {
        const activeTabId = tabs[0].id;
        chrome.scripting.executeScript(
            {
              target: { tabId: activeTabId },
              function: captureTextAfterEligibility,
            },
            (result) => {
              if (chrome.runtime.lastError) {
                console.error("Scripting error:", chrome.runtime.lastError.message);
                return;
              }
              if (result && result[0] && result[0].result) {
                const textFromDiv = result[0].result;
                const cacheKey = `openai_response_${btoa(textFromDiv)}`;
                const selectedTextDiv = document.getElementById('selectedText');
                selectedTextDiv.innerText = 'Loading...';
                chrome.storage.local.remove(cacheKey, () => {
                  if (chrome.runtime.lastError) {
                    console.error("Error removing entry:", chrome.runtime.lastError);
                  } else {
                    console.log(`Entry removed for key: ${cacheKey}`);
                    requestOpenAIResponse(textFromDiv, cacheKey, selectedTextDiv);
                  }
                });
              } else {
                console.log("No eligibility text found to remove.");
              }
            }
        );
      } else {
        console.log("No active tab found or invalid tab ID.");
      }
    });
  }
});
