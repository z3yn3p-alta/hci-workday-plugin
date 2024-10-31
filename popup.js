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
              chrome.runtime.sendMessage({ action: "getOpenAIResponse", text: textFromDiv }, (response) => {
                if (response.error) {
                  selectedTextDiv.innerText = response.error;
                } else {
                  selectedTextDiv.innerText = response.titles;
                }
              });
            } else {
              selectedTextDiv.innerText = 'Loading';
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
  // Find all label elements and filter for the one that contains "Eligibility"
  const eligibilityLabel = Array.from(document.querySelectorAll('label[data-automation-id="formLabel"]'))
      .find(label => label.innerText.trim() === 'Eligibility');

  // If found, get the parent <li> and then the next block of interest
  if (eligibilityLabel) {
    const liElement = eligibilityLabel.closest('li'); // Get the closest <li>
    const nextDiv = liElement.querySelector('.WLJY.WOJY.WFMY.WGMY.WKHY.WNJY.WF5.WMJY'); // Target the desired block after the <label>

    return nextDiv ? nextDiv.innerText.trim() : null; // Return the text from the next block
  }

  return 'No course requirements detected';
};