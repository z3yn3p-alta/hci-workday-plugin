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
              const cacheKey = `openai_response_${btoa(url)}`;
              chrome.storage.local.get([cacheKey], (data) => {
                if (data[cacheKey]) {
                  injectResponseIntoPage(data[cacheKey]);
                  closePopup();
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
      injectResponseIntoPage(response.titles);
      closePopup();
    }
  });
}

function injectResponseIntoPage(responseText) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: updatePageContent,
          args: [responseText],
        },
        () => {
          console.log('Injected response into page.');
        }
    );
  });
}

function updatePageContent(responseText) {
  const eligibilityLabel = Array.from(document.querySelectorAll('label[data-automation-id="formLabel"]'))
      .find(label => label.innerText.trim() === 'Eligibility');
  if (eligibilityLabel) {
    const liElement = eligibilityLabel.closest('li');
    const nextDiv = liElement.querySelector('div[data-automation-id="richTextEditor"][data-uxi-widget-editable="false"]');
    if (nextDiv) {
      nextDiv.innerHTML = responseText;
    }
  }
}

function closePopup() {
  window.close();
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
