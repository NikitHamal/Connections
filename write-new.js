// Import Firebase functionality
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    firebaseConfig, 
    getUserProfile, 
    getTopics, 
    createThread, 
    countUnreadNotifications,
    getUserExperience,
    EXP
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const postForm = document.querySelector('.discussion-form');
    const titleInput = document.getElementById('post-title');
    const topicSelect = document.getElementById('post-topic');
    const contentEditor = document.getElementById('editor');
    const publishBtn = document.querySelector('.publish-btn');
    const draftBtn = document.querySelector('.save-draft-btn');
    const previewBtn = document.querySelector('.preview-btn');
    const characterCount = document.querySelector('.character-count');
    const wordCount = document.querySelector('.word-count');
    const notificationBadge = document.querySelector('.notification-badge');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');
    
    // State
    let currentUser = null;
    let isPreviewMode = false;
    let topics = [];
    let userLevel = 1;
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    
    // Set up auth listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        
        if (user) {
            // User is signed in
            if (postForm) postForm.style.display = 'block';
            
            // Update UI with user info
            updateAuthUI(user);
            
            // Load user level
            loadUserLevel(user.uid);
            
            // Update notification badge
            updateNotificationBadge();
        } else {
            // User is signed out
            if (postForm) {
                postForm.innerHTML = `
                    <div class="sign-in-prompt">
                        <h2>Sign in to start a discussion</h2>
                        <p>Join the conversation by signing in or creating an account.</p>
                        <div class="prompt-actions">
                            <a href="signin.html?redirect=write.html" class="btn btn-primary">Sign In</a>
                            <a href="signup.html?redirect=write.html" class="btn btn-outline">Create Account</a>
                        </div>
                    </div>
                `;
            }
            
            // Update auth UI
            updateAuthUI(null);
        }
    });
    
    // Initialize
    init();
    
    // Functions
    async function init() {
        // Initialize editor
        initializeEditor();
        
        // Load topics
        await loadTopics();
        
        // Add event listeners
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                saveContent(false);
            });
        }
        
        if (draftBtn) {
            draftBtn.addEventListener('click', () => {
                saveContent(true);
            });
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', handlePreview);
        }
        
        // Update character count for title
        if (titleInput) {
            titleInput.addEventListener('input', updateCharacterCount);
            updateCharacterCount(); // Initial update
        }
    }
    
    // Initialize editor
    function initializeEditor() {
        if (!contentEditor || !toolbarButtons) return;
        
        // Set up toolbar buttons
        toolbarButtons.forEach(button => {
            button.addEventListener('click', () => {
                const format = button.getAttribute('data-format');
                applyFormat(format);
            });
        });
        
        // Update word count on input
        contentEditor.addEventListener('input', updateWordCount);
        
        // Initial word count
        updateWordCount();
        
        // Make editor focusable
        contentEditor.setAttribute('tabindex', '0');
        
        // Handle paste to strip formatting
        contentEditor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }
    
    // Update character count for title
    function updateCharacterCount() {
        if (!titleInput || !characterCount) return;
        
        const maxLength = parseInt(titleInput.getAttribute('maxlength')) || 100;
        const currentLength = titleInput.value.length;
        
        characterCount.textContent = `${currentLength}/${maxLength}`;
        
        // Change color when approaching limit
        if (currentLength > maxLength * 0.8) {
            characterCount.style.color = '#ff9800';
        } else {
            characterCount.style.color = '';
        }
    }
    
    // Update word count for content
    function updateWordCount() {
        if (!contentEditor || !wordCount) return;
        
        const text = contentEditor.innerText || '';
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        
        wordCount.textContent = `${words} words`;
    }
    
    // Apply formatting to editor
    function applyFormat(format) {
        if (!contentEditor) return;
        
        // Focus editor
        contentEditor.focus();
        
        switch (format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'link':
                const url = prompt('Enter the URL:');
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
                document.execCommand('insertUnorderedList', false, null);
                break;
            default:
                break;
        }
        
        // Update word count
        updateWordCount();
    }
    
    // Save content (publish or draft)
    async function saveContent(isDraft = false) {
        if (!titleInput || !contentEditor || !topicSelect) return;
        
        if (!currentUser) {
            showToast('Please sign in to save your discussion', true);
            return;
        }
        
        // Validate form
        if (!validateForm(isDraft)) {
            return;
        }
        
        // Get form data
        const title = titleInput.value.trim();
        const content = contentEditor.innerHTML;
        const plainContent = contentEditor.innerText;
        const topicId = topicSelect.value;
        
        // Show loading state
        const button = isDraft ? draftBtn : publishBtn;
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="loading-spinner"></span> ${isDraft ? 'Saving...' : 'Publishing...'}`;
        
        try {
            // Get user profile
            const userResult = await getUserProfile(currentUser.uid);
            
            if (!userResult.success) {
                throw new Error('Failed to get user profile');
            }
            
            const userProfile = userResult.profile || {};
            
            // Create thread data
            const threadData = {
                title,
                content,
                plainContent,
                topic: topicId,
                authorName: userProfile.displayName || 'Anonymous',
                authorAvatar: userProfile.avatarUrl || null,
                isDraft
            };
            
            if (isDraft) {
                // Save as draft
                const draftsRef = ref(database, `users/${currentUser.uid}/drafts`);
                const newDraftRef = push(draftsRef);
                
                await set(newDraftRef, {
                    ...threadData,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                
                // Show success message
                showToast('Draft saved successfully');
                
                // Reset button
                button.disabled = false;
                button.innerHTML = originalText;
            } else {
                // Publish thread
                const result = await createThread(threadData);
                
                if (result.success) {
                    // Show success message with EXP gained
                    const expMessage = result.levelUp 
                        ? `Discussion published! You gained ${EXP.CREATE_POST} XP and leveled up!` 
                        : `Discussion published! You gained ${EXP.CREATE_POST} XP`;
                    
                    showToast(expMessage);
                    
                    // Redirect to the thread page
                    setTimeout(() => {
                        window.location.href = `read.html?id=${result.threadId}`;
                    }, 1500);
                } else {
                    throw new Error(result.error);
                }
            }
        } catch (error) {
            console.error('Error saving content:', error);
            showToast('Failed to save. Please try again later.', true);
            
            // Reset button
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
    
    // Handle preview
    function handlePreview() {
        if (!contentEditor) return;
        
        // Toggle preview mode
        isPreviewMode = !isPreviewMode;
        
        if (isPreviewMode) {
            // Switch to preview mode
            const previewContent = document.createElement('div');
            previewContent.className = 'preview-content';
            previewContent.innerHTML = contentEditor.innerHTML;
            
            // Store original content
            contentEditor.dataset.originalContent = contentEditor.innerHTML;
            
            // Replace editor with preview
            contentEditor.innerHTML = '';
            contentEditor.appendChild(previewContent);
            contentEditor.classList.add('preview-mode');
            
            // Update button
            previewBtn.innerHTML = '<span class="material-symbols-rounded">edit</span> Edit';
            
            // Disable toolbar
            if (toolbarButtons) {
                toolbarButtons.forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                });
            }
        } else {
            // Switch back to edit mode
            contentEditor.innerHTML = contentEditor.dataset.originalContent || '';
            contentEditor.classList.remove('preview-mode');
            
            // Update button
            previewBtn.innerHTML = '<span class="material-symbols-rounded">visibility</span> Preview';
            
            // Enable toolbar
            if (toolbarButtons) {
                toolbarButtons.forEach(btn => {
                    btn.disabled = false;
                    btn.classList.remove('disabled');
                });
            }
        }
    }
    
    // Validate form
    function validateForm(isDraft = false) {
        if (!titleInput || !contentEditor || !topicSelect) return false;
        
        let isValid = true;
        
        // Clear previous errors
        document.querySelectorAll('.form-error').forEach(el => el.remove());
        
        // Title validation (required for both draft and publish)
        if (titleInput.value.trim() === '') {
            showError(titleInput, 'Please enter a title');
            isValid = false;
        }
        
        // Content validation (required for publish only)
        if (!isDraft && contentEditor.innerText.trim() === '') {
            showError(contentEditor, 'Please enter some content');
            isValid = false;
        }
        
        // Topic validation (required for publish only)
        if (!isDraft && topicSelect.value === '') {
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
        element.classList.add('error');
    }
    
    // Show toast message
    function showToast(message, isError = false) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // Create new toast
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
        toast.innerHTML = `
            <span class="material-symbols-rounded">${isError ? 'error' : 'check_circle'}</span>
            <span class="toast-message">${message}</span>
        `;
        
        // Add to document
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Hide toast after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
    
    // Update UI based on auth state
    async function updateAuthUI(user) {
        if (!loginBtn || !signupBtn) return;
        
        if (user) {
            // User is signed in
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                
                // Try to get the user's profile data
                const result = await getUserProfile(user.uid);
                
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
            
            // Hide notification badge
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
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
        topicSelect.innerHTML = '<option value="" disabled selected>Select a Topic</option>';
        
        // Add topics
        topics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });
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