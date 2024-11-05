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
            const textFromDiv = result[0].result; // The captured text
            const selectedTextDiv = document.getElementById('selectedText');

            if (textFromDiv) {
              // Generate a unique key for this text
              const cacheKey = `openai_response_${btoa(textFromDiv)}`; // Base64 encoding for a unique key

              // Check if the response is already saved in chrome.storage
              chrome.storage.local.get([cacheKey], (data) => {
                if (data[cacheKey]) {
                  // Display cached response
                  selectedTextDiv.innerText = data[cacheKey];
                } else {
                  // If no cached response, request from OpenAI API
                  chrome.runtime.sendMessage({ action: "getOpenAIResponse", text: textFromDiv }, (response) => {
                    if (response.error) {
                      selectedTextDiv.innerText = response.error;
                    } else {
                      selectedTextDiv.innerText = response.titles;
                      // Save the response in chrome.storage for future use
                      chrome.storage.local.set({ [cacheKey]: response.titles });
                    }
                  });
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

// Function to capture the text from the block after the label containing "Eligibility"
const captureTextAfterEligibility = () => {
  const eligibilityLabel = Array.from(document.querySelectorAll('label[data-automation-id="formLabel"]'))
      .find(label => label.innerText.trim() === 'Eligibility');

  if (eligibilityLabel) {
    const liElement = eligibilityLabel.closest('li');
    const nextDiv = liElement.querySelector('div[data-automation-id="richTextEditor"][data-uxi-widget-editable="false"]');
    return nextDiv ? nextDiv.innerHTML.trim() : 'Target div not found after Eligibility label';
  }
  return null;
};
