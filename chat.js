// DOM Elements
const chatContainer = document.querySelector('.chat-container');
const sidebar = document.querySelector('.chat-sidebar');
const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
const themeToggle = document.querySelector('.theme-toggle');
const messagesContainer = document.querySelector('.messages-container');
const chatInput = document.querySelector('.chat-input');
const sendButton = document.querySelector('.send-button');
const newChatButton = document.querySelector('.new-chat-btn');
const conversationsList = document.querySelector('.conversations-list');

// API Configuration
const API_BASE_URL = 'https://copilot.microsoft.com';
const DEFAULT_HEADERS = {
    ':authority': 'copilot.microsoft.com',
    ':method': 'POST',
    ':path': '/c/api/start',
    ':scheme': 'https',
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'cookie': '_C_Auth=; _C_Auth=; MUID=02B6984C7CF266400ECC8DE47D4067E7; MUIDB=02B6984C7CF266400ECC8DE47D4067E7; _EDGE_S=F=1&SID=2D5C064B086360C4015D13E309D161C3; _EDGE_V=1; __Host-copilot-anon=eyJhbGciOiJQUzI1NiIsImtpZCI6IjNCNENFNDM2MDNGQjZGNUQwODk3NTQ3Q0NFMjQxNEY3RTZBOURFOTAiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiJFdzdQSjFndXpOcGk4R2dWS2FlejUiLCJuYmYiOjE3NDEzNDI2NjUsImV4cCI6MTc3NTAzODY2NSwiaWF0IjoxNzQxMzQyNjY1LCJpc3MiOiJodHRwczovL2NvcGlsb3QubWljcm9zb2Z0LmNvbSIsImF1ZCI6IkFub255bW91c0lkZW50aXR5In0.Xwrqd--J1yhyzJv3OdqoRs0LCMk4BWUpKD_H6-iiIjSjrsGzMJGXXOYF2jI7Nd5Nu8Ucqb2dY_EjRRGfJgqTrZ30VBGvOyKOU50SgWCik0mW3tR_q1Rgj8IHkmmHvRx8YLCYXj7OWHHCRaWoEtoqjmKc9kUcxtz_LYF9emCwuQ4WqHgPTPaNd_L8XTnPzyAAkEugfKF-VTAJ3vUpiTjWWUkFp517g4MuEPrgSNlbZftgkbkjLjp7HLpuqYOJPXZZdIEhZikmpeoBuWJKEIgGjz3RLCwPcOkiCDkgJu5o5PE0LxqDfn5N6TWeaV8mOzAN21VcNn1iOfE15aU4LucdoQ',
    'ect': '4g',
    'origin': 'https://copilot.microsoft.com',
    'priority': 'u=1, i',
    'referer': 'https://copilot.microsoft.com/',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    'x-search-uilang': 'en-us'
};

// Mock user data
const MOCK_USER_DATA = {
    "id": "RFrS6iFcAYnkU6QE4EQ6V",
    "firstName": null,
    "anid": null,
    "isPro": false,
    "regionCode": "IN",
    "inEeaPlusRegion": false,
    "inGdprRegion": false,
    "remainingReasoningCalls": 50,
    "isHistoryMigrationPending": false,
    "isEligibleForFreeTrial": false,
    "isDeprecated": false,
    "phoneLink": null,
    "ageGroup": null,
    "allowedToggles": {
        "textTraining": false,
        "voiceTraining": false,
        "personalization": false
    }
};

// Helper function for API calls
async function makeApiCall(path, options) {
    const url = `${API_BASE_URL}${path}`;
    const headers = { ...DEFAULT_HEADERS };
    
    // Update path-specific headers
    headers[':path'] = path;
    headers[':method'] = options.method || 'GET';
    
    const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include'
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
}

// State
let currentConversationId = null;
let conversations = [];
let darkMode = false;

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
}

// Initialize theme from localStorage
function initializeTheme() {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        document.body.classList.add('dark-mode');
        darkMode = true;
    }
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    sidebar.classList.toggle('active');
}

// Auto-resize textarea
function autoResizeTextarea() {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
}

// Create Message Element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', message.author);

    const avatar = document.createElement('div');
    avatar.classList.add('message-avatar');
    avatar.innerHTML = message.author === 'ai' ? 
        '<span class="material-symbols-rounded">smart_toy</span>' :
        '<span class="material-symbols-rounded">person</span>';

    const content = document.createElement('div');
    content.classList.add('message-content');

    // Handle different content types
    message.content.forEach(part => {
        if (part.type === 'text') {
            const text = document.createElement('p');
            text.innerHTML = part.text.replace(/\n/g, '<br>');
            content.appendChild(text);
        } else if (part.type === 'card') {
            // Handle card content type if needed
            console.log('Card content:', part.card);
        }
    });

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    return messageDiv;
}

// Add Message to Chat
function addMessage(message) {
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Create Conversation Item
function createConversationItem(conversation) {
    const item = document.createElement('div');
    item.classList.add('conversation-item');
    if (conversation.id === currentConversationId) {
        item.classList.add('active');
    }

    item.innerHTML = `
        <span class="material-symbols-rounded">chat</span>
        <span>Chat ${conversations.length + 1}</span>
    `;

    item.addEventListener('click', () => {
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        item.classList.add('active');
        loadConversation(conversation.id);
    });

    return item;
}

// Load Conversation
async function loadConversation(conversationId) {
    try {
        const response = await makeApiCall(
            `/c/api/conversations/${conversationId}/history`,
            { method: 'GET' }
        );
        
        const data = await response.json();
        
        // Clear current messages
        messagesContainer.innerHTML = '';
        
        // Add messages to chat
        if (data.results && Array.isArray(data.results)) {
            data.results.forEach(message => {
                addMessage(message);
            });
        }
        
        currentConversationId = conversationId;
        
        // On mobile, close sidebar after selecting conversation
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    } catch (error) {
        console.error('Error loading conversation:', error);
        showError('Failed to load conversation. Please try again.');
    }
}

// Start New Conversation
async function startNewConversation() {
    try {
        const response = await makeApiCall(
            '/c/api/start',
            {
                method: 'POST',
                body: JSON.stringify({
                    timeZone: "Asia/Calcutta",
                    startNewConversation: true,
                    teenSupportEnabled: true
                })
            }
        );
        
        const data = await response.json();
        currentConversationId = data.currentConversationId;
        
        // Add to conversations list
        const conversation = { id: currentConversationId };
        conversations.push(conversation);
        
        // Add to sidebar
        const conversationItem = createConversationItem(conversation);
        conversationsList.appendChild(conversationItem);
        
        // Clear messages
        messagesContainer.innerHTML = '';
        
        // Update remaining calls
        updateRemainingCalls(MOCK_USER_DATA.remainingReasoningCalls);

        return data;
    } catch (error) {
        console.error('Error starting new conversation:', error);
        showError('Failed to start new conversation. Please try again.');
        return null;
    }
}

// Show Error Message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    messagesContainer.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Update Remaining Calls Display
function updateRemainingCalls(remaining) {
    const remainingCallsElement = document.querySelector('.remaining-calls');
    remainingCallsElement.textContent = `${remaining} calls remaining`;
}

// Send Message
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message || !currentConversationId) return;

    // Add user message to chat
    addMessage({
        author: 'human',
        content: [{ type: 'text', text: message }]
    });

    // Clear input
    chatInput.value = '';
    autoResizeTextarea();

    try {
        const response = await makeApiCall(
            `/c/api/conversations/${currentConversationId}/messages`,
            {
                method: 'POST',
                body: JSON.stringify({
                    message,
                    conversationId: currentConversationId,
                    clientTimestamp: new Date().toISOString()
                })
            }
        );

        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(message => {
                addMessage(message);
            });
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message. Please try again.');
    }
}

// Initialize
async function initialize() {
    initializeTheme();
    updateRemainingCalls(MOCK_USER_DATA.remainingReasoningCalls);
    
    // Add example conversation
    const exampleConversation = { id: '8VFCbmuKzF7VqyxDrYVUL' };
    conversations.push(exampleConversation);
    const conversationItem = createConversationItem(exampleConversation);
    conversationsList.appendChild(conversationItem);
    
    // Load the example conversation
    await loadConversation(exampleConversation.id);
}

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
mobileSidebarToggle.addEventListener('click', toggleSidebar);
chatInput.addEventListener('input', autoResizeTextarea);
sendButton.addEventListener('click', sendMessage);
newChatButton.addEventListener('click', startNewConversation);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

initialize(); 