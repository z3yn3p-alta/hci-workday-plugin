chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getOpenAIResponse") {
        let apiKey = ''
        fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: `Simplify these course requirements: ${request.text}. Try to use as simple language as possible. Avoid repetition.`

                    }
                ]
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }
                return response.json();
            })
            .then(data => {
                const titles = data.choices[0].message.content;
                sendResponse({ titles });
            })
            .catch(error => {
                console.error("Error contacting OpenAI API:", error);
                sendResponse({ error: "Error contacting OpenAI API" });
            });

        return true;
    }
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
                            const url = tab.url;
                            const cacheKey = `openai_response_${btoa(url)}`;
                            chrome.storage.local.remove(cacheKey, () => {
                                if (chrome.runtime.lastError) {
                                    console.error("Error removing entry:", chrome.runtime.lastError);
                                } else {
                                    console.log(`Entry removed for key: ${cacheKey}`);
                                }
                            });
                        } else {
                            console.log("No eligibility text found to remove or result is undefined.");
                        }
                    }
                );
            } else {
                console.log("No active tab found or invalid tab ID.");
            }
        });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "removeEntry",
        title: "Remove Simplified Entry from Storage",
        contexts: ["all"]
    });
});

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
