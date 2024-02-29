chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Verifica se a mensagem vem do popup e solicita a extração dos chats
    if (request.action === "requestChatExtraction") {
        // Encontra a aba do WhatsApp Web
        chrome.tabs.query({url: "*://web.whatsapp.com/*"}, function(tabs) {
            if (tabs.length > 0) {
                // Envia a mensagem para injetar o script de extração
                chrome.tabs.sendMessage(tabs[0].id, {action: "extractChats"});
            }
        });
    }
    // Encaminha os chats extraídos para o popup
    else if (request.action === "chatsExtracted") {
        chrome.runtime.sendMessage(request);
    }
});
