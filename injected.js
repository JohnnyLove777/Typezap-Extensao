function extractChats() {
    let chats = [];
    let chatElements = document.querySelectorAll('[title]'); // Supondo que 'title' contenha o nome do chat

    chatElements.forEach((chatElement, index) => {
        let chatName = chatElement.getAttribute('title');
        if(chatName) { // Garante que só captura elementos com título (nome do chat)
            chats.push({ id: `chat${index}`, name: chatName });
        }
    });

    // Envia os chats extraídos de volta para o background.js
    chrome.runtime.sendMessage({action: 'chatsExtracted', chats: chats});
}

// Verifica se está na página correta antes de extrair
if (document.URL.includes("web.whatsapp.com")) {
    extractChats();
}
