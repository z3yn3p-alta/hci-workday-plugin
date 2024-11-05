chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getOpenAIResponse") {
        const apiKey = 'API_KEY'; // Replace with your actual OpenAI API key

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
                        content: `Simplify these course requirements: ${request.text}. Avoid repetition.`

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
