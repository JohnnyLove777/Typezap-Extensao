// Função para abrir o IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        var request = window.indexedDB.open('TypeZapDB', 1);

        request.onerror = function(event) {
            reject('Database error: ' + event.target.errorCode);
        };

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        // Criar o armazenamento de objetos se não existir
        request.onupgradeneeded = function(event) {
            var db = event.target.result;
            var store = db.createObjectStore('credentials', {keyPath: 'id', autoIncrement: true});
            store.createIndex('endpoint', 'endpoint', {unique: false});
            store.createIndex('token', 'token', {unique: false});
        };
    });
}

// Função para salvar os dados no IndexedDB
function saveCredentials(endpoint, token) {
    openDB().then(db => {
        var transaction = db.transaction(['credentials'], 'readwrite');
        var store = transaction.objectStore('credentials');
        store.put({endpoint: endpoint, token: token});
    }).catch(error => {
        console.error('Error opening database', error);
    });
}

// Função para redefinir a conexão e retornar para a tela de registro
function resetConnection() {
    openDB().then(db => {
        var transaction = db.transaction(['credentials'], 'readwrite');
        var store = transaction.objectStore('credentials');
        store.clear(); // Limpa a store
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('welcome-section').style.display = 'block';
        // Limpar os inputs
        document.getElementById('endpointInput').value = '';
        document.getElementById('tokenInput').value = '';
    }).catch(error => {
        console.error('Error opening database', error);
    });
}

// Função para buscar os itens da lista do servidor
function fetchListItems(endpoint, token) {
    // Configurações da requisição
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: token })
    };

    // Realiza a requisição ao endpoint fornecido
    fetch(endpoint, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Atualiza a lista de itens na página
            updateItemList(data);
        })
        .catch(error => {
            console.error('Error fetching the list items:', error);
        });
}

// Função para buscar as credenciais armazenadas e atualizar a lista
function updateFlows() {
    openDB().then(db => {
        var transaction = db.transaction(['credentials'], 'readonly');
        var store = transaction.objectStore('credentials');
        var getAllRequest = store.getAll(); // Obtém todos os registros armazenados

        getAllRequest.onsuccess = function() {
            // Assume-se que apenas um conjunto de credenciais está armazenado
            if (getAllRequest.result.length > 0) {
                const credentials = getAllRequest.result[0]; // Pega o primeiro registro
                fetchListItems(credentials.endpoint, credentials.token);
            } else {
                console.error('No credentials found');
            }
        };
    }).catch(error => {
        console.error('Error fetching credentials from database', error);
    });
}

// Supondo que esta função recupere token e endpointBase de IndexedDB
function fetchCredentials() {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(['credentials'], 'readonly');
            const store = transaction.objectStore('credentials');
            const getRequest = store.get(1); // Supondo que o id seja 1

            getRequest.onsuccess = function() {
                if (getRequest.result) {
                    resolve({
                        token: getRequest.result.token,
                        endpointBase: getRequest.result.endpoint.replace('/extensaoTypezap', '/sendMessage')
                    });
                } else {
                    reject('No credentials found');
                }
            };

            getRequest.onerror = function(event) {
                reject('Error fetching credentials:', event.target.error);
            };
        });
    });
}

function sendTriggerMessage(dataId, gatilho) {
    fetchCredentials().then(credentials => {
        const { token, endpointBase } = credentials;
        const parts = dataId.split('_');
        const destinatario = parts[1]; // Correção para extrair o destinatário

        // Assume que endpointBase já é a URL correta para /sendMessage
        fetch(endpointBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destinatario: destinatario,
                mensagem: gatilho,
                tipo: 'text', // Assumindo que o gatilho é sempre uma mensagem de texto
                token: token
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => console.log('Mensagem enviada:', data))
        .catch(error => console.error('Erro ao enviar mensagem:', error));
    }).catch(error => {
        console.error('Error fetching credentials:', error);
    });
}

// Função para atualizar a lista de itens na página com os dados recebidos
function updateItemList(data) {
    var inputElement = document.getElementById('chatNumberInput');
    const itensLista = document.getElementById('itens-lista');
    if (!itensLista) {
        console.error('Elemento de lista de itens não encontrado.');
        return;
    }

    itensLista.innerHTML = ''; // Limpa os itens existentes

    for (const key of Object.keys(data)) {
        const itemData = data[key];
        const itemElement = document.createElement('div');
        itemElement.className = 'item-lista';

        const fraseElement = document.createElement('span');
        fraseElement.className = 'frase-disparo';
        fraseElement.textContent = itemData.gatilho;

        const iconElement = document.createElement('i');
        iconElement.className = 'fas fa-paper-plane enviar-icone';

        // Evento de clique para sempre enviar para o mesmo destinatário
        iconElement.addEventListener('click', function() {
            //const fixedContactId = '5511995336304@c.us'; // ID do contato fixo
            let fixedContactId = '55' + inputElement.value.replace(/\s/g, '') + '@c.us';
            sendTriggerMessage(fixedContactId, fraseElement.textContent); // Envio da mensagem
        });

        itemElement.appendChild(fraseElement);
        itemElement.appendChild(iconElement);
        itensLista.appendChild(itemElement);
    }
}

function sendTriggerMessage(contactId, mensagem) {
    // Supondo que você já tenha o endpoint e o token armazenados ou obtidos de forma adequada
    fetchCredentials().then(credentials => {
        const { token, endpointBase } = credentials;
        const endpoint = endpointBase.replace('/extensaoTypezap', '/sendMessage');

        // Assumindo que contactId é o destinatário no formato necessário
        const destinatario = contactId;

        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                destinatario: destinatario,
                mensagem: mensagem,
                tipo: 'text',
                token: token
            })
        })
        // Tratamento da resposta omitido para brevidade
    });
}

function toggleExpandableList() {
    // Chama a função para abrir o modal
    openModal();
}

// Função para verificar se há credenciais armazenadas
function checkForStoredCredentials() {
    openDB().then(db => {
        var transaction = db.transaction(['credentials'], 'readonly');
        var store = transaction.objectStore('credentials');
        var request = store.count(); // Conta o número de objetos na store

        request.onsuccess = function() {
            if (request.result > 0) {
                // Se houver credenciais, exibe a seção de mensagens
                document.getElementById('welcome-section').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
            } else {
                // Se não houver credenciais, exibe a seção de registro
                document.getElementById('welcome-section').style.display = 'block';
                document.getElementById('main-content').style.display = 'none';
            }
        };
    }).catch(error => {
        console.error('Error checking for credentials', error);
    });
}

/*// Função para buscar os chats ativos "fictícios" e preencher o dropdown
function fetchActiveChatsAndUpdateDropdown() {
    // Simula a obtenção de chats ativos fictícios sem buscar no banco de dados
    const chatsFicticios = [
        { id: 'chat1', name: 'Chat Fictício 1' },
        { id: 'chat2', name: 'Chat Fictício 2' },
        { id: 'chat3', name: 'Chat Fictício 3' }
    ];
    
    // Diretamente preenche o dropdown com os chats fictícios
    populateDropdownWithChats(chatsFicticios);
}

// Função para preencher o dropdown com os chats fictícios recebidos
function populateDropdownWithChats(chats) {
    const dropdown = document.getElementById('listaChats');
    if (!dropdown) {
        console.error('Elemento do dropdown de chats não encontrado.');
        return;
    }

    // Limpa as opções existentes
    dropdown.innerHTML = '';

    // Adiciona uma opção padrão
    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Selecione um chat';
    defaultOption.value = '';
    dropdown.appendChild(defaultOption);

    // Adiciona os chats fictícios ao dropdown
    chats.forEach(chat => {
        const option = document.createElement('option');
        option.value = chat.id;
        option.textContent = chat.name;
        dropdown.appendChild(option);
    });

    // Remove a classe 'hidden' para mostrar o dropdown, caso esteja escondido
    dropdown.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    // Chama a função para preencher o dropdown com os chats fictícios quando o DOM estiver pronto
    fetchActiveChatsAndUpdateDropdown();
});

// Função para alternar a visibilidade da lista
function toggleList() {
    const list = document.getElementById('expandable-list');
    list.classList.toggle('hidden');
}

// Adiciona o evento de clique ao cabeçalho para alternar a lista
document.querySelector('.list-header').addEventListener('click', toggleList);

// Adiciona o evento de clique aos itens da lista
document.getElementById('expandable-list').addEventListener('click', function(e) {
    if(e.target.tagName === 'LI') {
        // Remover a classe 'selected' de todos os itens da lista
        document.querySelectorAll('#expandable-list li').forEach(li => {
            li.classList.remove('selected');
        });
        
        // Adicionar a classe 'selected' ao item clicado
        e.target.classList.add('selected');

        // Lógica para abrir o chat ou realizar outras ações
        console.log('Chat selecionado:', e.target.dataset.chatId);
    }
});*/

document.addEventListener('DOMContentLoaded', function() {
    // Verifica se já existem credenciais armazenadas ao carregar a página
    checkForStoredCredentials();
    updateFlows();
    //fetchActiveChatsAndUpdateDropdown();

    var registerButton = document.getElementById('registerExtension');
    registerButton.addEventListener('click', function() {
        var endpoint = document.getElementById('endpointInput').value;
        var token = document.getElementById('tokenInput').value;
        
        // Salva as credenciais para uso posterior
        saveCredentials(endpoint, token);

        // Exibe o conteúdo principal
        document.getElementById('welcome-section').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';

        // Faz a requisição para buscar os itens da lista
        fetchListItems(endpoint, token);
    });

    var updateButton = document.getElementById('updateFlows');
    updateButton.addEventListener('click', function() {
        // Chama a função para atualizar os fluxos
        updateFlows();
    });

    var resetButton = document.getElementById('resetConnection');
    resetButton.addEventListener('click', resetConnection);  
    
});

// Implemente a função populateModalWithChats() conforme necessário




