// User Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Firebase References
    const auth = firebase.auth();
    const database = firebase.database();
    
    // Check Authentication State
    auth.onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            handleSignedInUser(user);
        } else {
            // User is signed out
            handleSignedOutUser();
        }
    });
    
    // Handle Signed In User
    async function handleSignedInUser(user) {
        try {
            // Get user profile data
            const userProfile = await getUserProfile(user.uid);
            
            // Update UI for signed in user
            updateUIForSignedInUser(user, userProfile);
            
            // Setup user menu functionality
            setupUserMenu();
            
            // Replace "Join Connections" buttons with "Start Writing" buttons
            replaceJoinButtons();
            
            // Initialize notifications
            initializeNotifications(user.uid);
            
        } catch (error) {
            console.error('Error handling signed in user:', error);
        }
    }
    
    // Initialize Notifications
    async function initializeNotifications(userId) {
        try {
            // Listen for notification updates in real-time
            database.ref(`users/${userId}/notifications`).on('value', (snapshot) => {
                updateNotificationBadges(snapshot.val());
            });
        } catch (error) {
            console.error('Error initializing notifications:', error);
        }
    }
    
    // Update Notification Badges
    function updateNotificationBadges(notifications) {
        // Calculate unread count
        let unreadCount = 0;
        
        if (notifications) {
            // Convert to array if it's an object
            const notificationsArray = Array.isArray(notifications) 
                ? notifications 
                : Object.values(notifications);
            
            // Count unread notifications
            unreadCount = notificationsArray.filter(notification => !notification.read).length;
        }
        
        // Update header notification badge
        const headerBadges = document.querySelectorAll('.notification-badge:not(.menu-notification-badge)');
        headerBadges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        });
        
        // Update menu notification badge
        const menuBadges = document.querySelectorAll('.menu-notification-badge');
        menuBadges.forEach(badge => {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        });
        
        // Store count in localStorage for other pages to access
        localStorage.setItem('unreadNotifications', unreadCount);
    }
    
    // Handle Signed Out User
    function handleSignedOutUser() {
        // Show login/signup buttons
        const authButtons = document.querySelectorAll('.auth-buttons');
        authButtons.forEach(container => {
            container.style.display = 'flex';
        });
        
        // Hide user menu
        const userMenuContainers = document.querySelectorAll('.user-menu-container');
        userMenuContainers.forEach(container => {
            container.style.display = 'none';
        });
        
        // Reset notification badges
        updateNotificationBadges(null);
    }
    
    // Update UI for Signed In User
    function updateUIForSignedInUser(user, userProfile) {
        // Hide login/signup buttons
        const authButtons = document.querySelectorAll('.auth-buttons');
        authButtons.forEach(container => {
            container.style.display = 'none';
        });
        
        // Show user menu
        const userMenuContainers = document.querySelectorAll('.user-menu-container');
        userMenuContainers.forEach(container => {
            container.style.display = 'block';
            
            // Update user avatar
            const avatarImgs = container.querySelectorAll('.user-avatar-small img, .user-menu-avatar img');
            avatarImgs.forEach(img => {
                img.src = user.photoURL || userProfile?.photoURL || 'https://via.placeholder.com/150';
            });
            
            // Update user name
            const userNameElements = container.querySelectorAll('.user-name-small, .user-menu-name');
            userNameElements.forEach(element => {
                element.textContent = user.displayName || userProfile?.displayName || 'User';
            });
            
            // Update user email
            const userEmailElements = container.querySelectorAll('.user-menu-email');
            userEmailElements.forEach(element => {
                element.textContent = user.email || userProfile?.email || '';
            });
        });
    }
    
    // Setup User Menu Functionality
    function setupUserMenu() {
        const userMenuTriggers = document.querySelectorAll('.user-menu-trigger');
        
        userMenuTriggers.forEach(trigger => {
            trigger.addEventListener('click', function(e) {
                e.stopPropagation();
                
                const container = this.closest('.user-menu-container');
                container.classList.toggle('active');
                
                // Close other menus
                document.querySelectorAll('.user-menu-container').forEach(otherContainer => {
                    if (otherContainer !== container) {
                        otherContainer.classList.remove('active');
                    }
                });
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.user-menu-container')) {
                document.querySelectorAll('.user-menu-container').forEach(container => {
                    container.classList.remove('active');
                });
            }
        });
        
        // Setup logout functionality
        const logoutLinks = document.querySelectorAll('.logout-link');
        logoutLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Sign out from Firebase
                auth.signOut().then(() => {
                    console.log('User signed out');
                    // Redirect to home page
                    window.location.href = 'index.html';
                }).catch((error) => {
                    console.error('Error signing out:', error);
                });
            });
        });
    }
    
    // Replace Join Buttons with Write Buttons
    function replaceJoinButtons() {
        const joinButtons = document.querySelectorAll('.btn-primary:not(.write-button)');
        
        joinButtons.forEach(button => {
            if (button.textContent.includes('Join Connections')) {
                // Replace with write button
                button.innerHTML = '<span class="material-symbols-rounded">edit</span> Start Writing';
                button.classList.add('write-button');
                
                // Update href or click handler
                if (button.tagName === 'A') {
                    button.href = 'write.html';
                } else {
                    button.addEventListener('click', function() {
                        window.location.href = 'write.html';
                    });
                }
            }
        });
    }
    
    // Get User Profile
    async function getUserProfile(uid) {
        try {
            const snapshot = await database.ref(`users/${uid}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }
});

/**
 * User Profile Menu Functionality
 * Handles displaying user info and dropdown menu
 */
document.addEventListener('DOMContentLoaded', () => {
    initUserMenu();
});

function initUserMenu() {
    const userMenuTrigger = document.querySelector('.user-menu-trigger');
    const userMenuDropdown = document.querySelector('.user-menu-dropdown');
    const userNameElements = document.querySelectorAll('.user-name-small, .user-menu-name');
    const userEmailElement = document.querySelector('.user-menu-email');
    const userAvatarElements = document.querySelectorAll('.user-avatar-small img, .user-menu-avatar img');
    
    // Get user data from localStorage or fetch from server
    const currentUser = getCurrentUser();
    
    // Update UI based on authentication state
    updateUIForAuthState(currentUser);
    
    // Toggle dropdown menu
    if (userMenuTrigger && userMenuDropdown) {
        userMenuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('active');
            
            // Add click event listener to document to close menu when clicking outside
            document.addEventListener('click', closeMenuOnClickOutside);
        });
    }
    
    // Close menu when clicking outside
    function closeMenuOnClickOutside(e) {
        if (!userMenuDropdown.contains(e.target) && e.target !== userMenuTrigger) {
            userMenuDropdown.classList.remove('active');
            document.removeEventListener('click', closeMenuOnClickOutside);
        }
    }
}

/**
 * Gets the current user from localStorage or returns null if not logged in
 */
function getCurrentUser() {
    const userDataString = localStorage.getItem('userData');
    if (!userDataString) return null;
    
    try {
        return JSON.parse(userDataString);
    } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
    }
}

/**
 * Updates all UI elements based on authentication state
 */
function updateUIForAuthState(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenuContainer = document.querySelector('.user-menu-container');
    const profileBtn = document.querySelector('.profile-btn'); 
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const userNameElements = document.querySelectorAll('.user-name-small, .user-menu-name');
    const userEmailElement = document.querySelector('.user-menu-email');
    const userAvatarElements = document.querySelectorAll('.user-avatar-small img, .user-menu-avatar img');
    
    if (user) {
        // User is logged in
        
        // Hide auth buttons, show user menu
        if (authButtons) authButtons.style.display = 'none';
        if (userMenuContainer) userMenuContainer.style.display = 'block';
        if (profileBtn) profileBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        
        // Update user info in UI
        userNameElements.forEach(el => {
            if (el) el.textContent = user.displayName || 'User';
        });
        
        if (userEmailElement) {
            userEmailElement.textContent = user.email || '';
        }
        
        // Update avatar in UI
        const avatarUrl = user.photoURL || 'https://via.placeholder.com/150';
        userAvatarElements.forEach(el => {
            if (el) el.src = avatarUrl;
        });
        
    } else {
        // User is logged out
        
        // Show auth buttons, hide user menu
        if (authButtons) authButtons.style.display = 'flex';
        if (userMenuContainer) userMenuContainer.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (signupBtn) signupBtn.style.display = 'inline-flex';
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initUserMenu,
        getCurrentUser,
        updateUIForAuthState
    };
} 