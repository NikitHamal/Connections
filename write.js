import { createThread, getCurrentUserId, getUserProfile, onAuthStateChange } from './firebase-config.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getTopics,
    countUnreadNotifications,
    getUserExperience,
    addExperience,
    updateUserStats,
    checkAchievements,
    EXP
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const titleInput = document.getElementById('post-title');
    const topicSelect = document.getElementById('post-topic');
    const editorElement = document.getElementById('editor');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    const notificationCheckbox = document.getElementById('notification-opt-in');
    const saveDraftBtn = document.querySelector('.save-draft-btn');
    const previewBtn = document.querySelector('.preview-btn');
    const publishBtn = document.querySelector('.publish-btn');
    const characterCount = document.querySelector('.character-count');
    const wordCount = document.querySelector('.word-count');
    const form = document.getElementById('post-form');
    const postPreview = document.getElementById('post-preview');
    const previewTitle = document.getElementById('preview-title');
    const previewContent = document.getElementById('preview-content');
    const notificationBadge = document.querySelector('.notification-badge');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    const signInPrompt = document.querySelector('.sign-in-prompt');
    const topicOptions = document.querySelector('.topic-options');
    
    // State
    let currentUser = null;
    let wordCountValue = 0;
    let isDraftSaved = false;
    let currentDraftId = null;
    let topics = [];
    let userLevel = 1;
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    
    // Set up auth listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);
        
        if (user) {
            // Load draft if available
            loadDraft();
            
            // Load user level
            loadUserLevel(user.uid);
            
            // Update notification badge
            updateNotificationBadge();
        }
    });
    
    // Initialize
    initializeEditor();
    
    // Event Listeners
    titleInput.addEventListener('input', updateCharacterCount);
    editorElement.addEventListener('input', updateWordCount);
    
    toolbarButtons.forEach(button => {
        button.addEventListener('click', () => {
            applyFormat(button.dataset.format);
        });
    });

    saveDraftBtn.addEventListener('click', () => saveContent(true));
    publishBtn.addEventListener('click', () => saveContent(false));
    previewBtn.addEventListener('click', handlePreview);
    
    // Initialize editor
    function initializeEditor() {
        updateCharacterCount();
        updateWordCount();
        
        // Try to load from localStorage (temp backup)
        const savedTitle = localStorage.getItem('discussion-title');
        const savedContent = localStorage.getItem('discussion-content');
        const savedTopic = localStorage.getItem('discussion-topic');
        
        if (savedTitle) titleInput.value = savedTitle;
        if (savedContent) editorElement.innerHTML = savedContent;
        if (savedTopic) topicSelect.value = savedTopic;
        
        // Auto-save every 30 seconds
        setInterval(() => {
            // Only auto-save if there's content and user hasn't manually saved
            if (titleInput.value.trim() || editorElement.innerHTML.trim()) {
                localStorage.setItem('discussion-title', titleInput.value);
                localStorage.setItem('discussion-content', editorElement.innerHTML);
                localStorage.setItem('discussion-topic', topicSelect.value);
            }
        }, 30000);
    }
    
    // Update character count for title
    function updateCharacterCount() {
        const count = titleInput.value.length;
        const maxCount = parseInt(titleInput.getAttribute('maxlength') || 100);
        
        characterCount.textContent = `${count}/${maxCount}`;
        
        // Visual feedback if getting close to limit
        if (count > maxCount * 0.9) {
            characterCount.style.color = 'var(--error)';
        } else {
            characterCount.style.color = 'var(--text-secondary)';
        }
    }
    
    // Update word count for editor
    function updateWordCount() {
        // Get text content and replace HTML tags
        const text = editorElement.innerHTML
            .replace(/<[^>]*>/g, ' ')
            .replace(/&nbsp;/g, ' ');
        
        // Count words
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        wordCountValue = words.length;
        
        wordCount.textContent = `${wordCountValue} ${wordCountValue === 1 ? 'word' : 'words'}`;
    }
    
    // Apply formatting to selected text
    function applyFormat(format) {
        editorElement.focus();
        
        switch (format) {
            case 'bold':
                document.execCommand('bold', false);
                break;
            case 'italic':
                document.execCommand('italic', false);
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'h2':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'quote':
                document.execCommand('formatBlock', false, '<blockquote>');
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false);
                break;
            default:
                break;
        }
        
        // Update word count after formatting
        updateWordCount();
    }

    // Save draft or publish thread
    async function saveContent(isDraft = false) {
        if (!validateForm(isDraft)) {
            return;
        }
        
        // Disable buttons to prevent double submission
        saveDraftBtn.disabled = true;
        publishBtn.disabled = true;
        
        const actionBtn = isDraft ? saveDraftBtn : publishBtn;
        const originalText = actionBtn.innerHTML;
        actionBtn.innerHTML = `<span class="loading-spinner"></span> ${isDraft ? 'Saving...' : 'Publishing...'}`;
        
        try {
            // Prepare thread data
            const threadData = {
                title: titleInput.value.trim(),
                content: editorElement.innerHTML,
                topic: topicSelect.value,
                isDraft: isDraft,
                notifyReplies: notificationCheckbox && notificationCheckbox.checked,
            };
            
            // If updating existing draft
            if (isDraft && currentDraftId) {
                threadData.id = currentDraftId;
            }
            
            // Save to Firebase
            const result = await createThread(threadData);
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Success handling
            if (isDraft) {
                // Update draft ID and saved state
                currentDraftId = result.threadId;
                isDraftSaved = true;
                
                // Show success message
                showToast('Draft saved successfully!');
            } else {
                // Clear local storage
                localStorage.removeItem('discussion-title');
                localStorage.removeItem('discussion-content');
                localStorage.removeItem('discussion-topic');
                
                // Redirect to the published thread
                window.location.href = `read.html?id=${result.threadId}`;
            }
        } catch (error) {
            console.error('Error saving content:', error);
            showToast('Failed to save content. Please try again.', true);
        } finally {
            // Re-enable buttons
            saveDraftBtn.disabled = false;
            publishBtn.disabled = false;
            actionBtn.innerHTML = originalText;
        }
    }
    
    // Load draft from Firebase
    async function loadDraft() {
        try {
            // TODO: Implement this with Firebase
            // For now, just use localStorage
            console.log('Draft loading not yet implemented with Firebase');
        } catch (error) {
            console.error('Error loading draft:', error);
        }
    }
    
    // Handle preview
    function handlePreview() {
        if (!validateForm(true)) {
            return;
        }
        
        // Open a new window with preview
        const previewWindow = window.open('', '_blank');
        
        // Create preview HTML
        const previewHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Preview: ${titleInput.value}</title>
                <link rel="stylesheet" href="styles.css">
                <link rel="stylesheet" href="read.css">
                <style>
                    body {
                        padding: 2rem;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .preview-header {
                        margin-bottom: 2rem;
                        padding-bottom: 1rem;
                        border-bottom: 1px solid rgba(0,0,0,0.1);
                    }
                    .preview-badge {
                        display: inline-block;
                        padding: 0.25rem 0.5rem;
                        background-color: #FFD700;
                        color: #000;
                        border-radius: 4px;
                        margin-bottom: 1rem;
                        font-weight: 500;
                    }
                </style>
            </head>
            <body>
                <div class="preview-header">
                    <div class="preview-badge">Preview Mode</div>
                    <h1>${titleInput.value}</h1>
                    <div class="thread-meta">
                        <span class="thread-topic">${topicSelect.options[topicSelect.selectedIndex].text}</span>
                        <span class="thread-date">Preview - ${new Date().toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="thread-body">
                    ${editorElement.innerHTML}
                </div>
            </body>
            </html>
        `;
        
        previewWindow.document.write(previewHTML);
        previewWindow.document.close();
    }
    
    // Validate form
    function validateForm(isDraft = false) {
        let isValid = true;
        
        // Clear previous errors
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(el => el.remove());
        
        // Validate title
        if (!isDraft && !titleInput.value.trim()) {
            showError(titleInput, 'Please enter a title');
            isValid = false;
        }
        
        // Validate content
        if (!isDraft && !editorElement.innerHTML.trim()) {
            showError(editorElement, 'Please enter some content');
            isValid = false;
        }
        
        // Validate topic
        if (!isDraft && !topicSelect.value) {
            showError(topicSelect, 'Please select a topic');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Show error message
    function showError(element, message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        
        element.parentNode.appendChild(errorElement);
        element.focus();
    }
    
    // Show toast notification
    function showToast(message, isError = false) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        toast.innerHTML = `
            <span class="material-symbols-rounded">${isError ? 'error' : 'check_circle'}</span>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Update UI based on auth state
    function updateAuthUI(user) {
        if (!loginBtn || !signupBtn) return;
        
        if (user) {
            // User is signed in
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                
                // Try to get the user's profile data
                getUserProfile(user.uid).then(result => {
                    if (result.success && result.profile) {
                        const username = profileBtn.querySelector('.username');
                        const avatar = profileBtn.querySelector('.avatar');
                        
                        if (username) {
                            username.textContent = result.profile.displayName || 'User';
                        }
                        
                        if (avatar && result.profile.avatarUrl) {
                            avatar.style.backgroundImage = `url(${result.profile.avatarUrl})`;
                        }
                    }
                });
            }
            
            // Show notifications button
            const notificationsBtn = document.querySelector('.notifications-btn');
            if (notificationsBtn) {
                notificationsBtn.style.display = 'flex';
                updateNotificationBadge();
            }
        } else {
            // User is signed out
            loginBtn.style.display = 'inline-flex';
            signupBtn.style.display = 'inline-flex';
            profileBtn.style.display = 'none';
            
            // Show login prompt
            showToast('Please sign in to create a discussion', true);
        }
    }
    
    // Load topics from Firebase
    async function loadTopics() {
        try {
            const result = await getTopics();
            
            if (result.success) {
                topics = result.topics;
                
                // Populate topic dropdown
                populateTopicDropdown(topics);
            } else {
                console.error('Error loading topics:', result.error);
            }
        } catch (error) {
            console.error('Error loading topics:', error);
        }
    }
    
    // Load user level
    async function loadUserLevel(userId) {
        try {
            const result = await getUserExperience(userId);
            
            if (result.success) {
                userLevel = result.level;
                
                // Update UI with level
                const levelIndicator = document.createElement('div');
                levelIndicator.className = 'level-indicator';
                levelIndicator.innerHTML = `
                    <span class="level-tag">Lv ${result.level}</span>
                `;
                
                // Add level indicator to profile button
                if (profileBtn && !profileBtn.querySelector('.level-indicator')) {
                    profileBtn.appendChild(levelIndicator);
                }
            }
        } catch (error) {
            console.error('Error loading user level:', error);
        }
    }
    
    // Populate topic dropdown
    function populateTopicDropdown(topics) {
        if (!topicSelect) return;
        
        // Clear existing options
        topicSelect.innerHTML = '<option value="" disabled selected>Select a topic</option>';
        
        // Add topics
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });
        
        // Create topic chips for mobile
        if (topicOptions) {
            topicOptions.innerHTML = '';
            
            topics.forEach(topic => {
                const chip = document.createElement('div');
                chip.className = 'topic-chip';
                chip.setAttribute('data-topic', topic.id);
                chip.innerHTML = `
                    <span class="material-symbols-rounded">${topic.icon}</span>
                    <span>${topic.name}</span>
                `;
                
                chip.addEventListener('click', () => {
                    // Unselect all chips
                    document.querySelectorAll('.topic-chip').forEach(c => c.classList.remove('selected'));
                    
                    // Select this chip
                    chip.classList.add('selected');
                    
                    // Update select
                    topicSelect.value = topic.id;
                });
                
                topicOptions.appendChild(chip);
            });
        }
    }
    
    // Update notification badge
    async function updateNotificationBadge() {
        if (!currentUser || !notificationBadge) return;
        
        try {
            const result = await countUnreadNotifications(currentUser.uid);
            
            if (result.success) {
                const count = result.count;
                
                if (count > 0) {
                    notificationBadge.textContent = count > 99 ? '99+' : count;
                    notificationBadge.style.display = 'flex';
                } else {
                    notificationBadge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error updating notification badge:', error);
        }
    }
}); 