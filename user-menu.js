/**
 * User Menu functionality
 * Handles user menu dropdown and user info display
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize user menu
    initUserMenu();
    
    // Setup logout functionality
    setupLogoutFunctionality();
    
    // Set up authentication state change listener
    if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().onAuthStateChanged(handleAuthStateChanged);
    } else {
        console.log('Firebase auth not available, using local storage fallback');
        // If Firebase is not available, try to use localStorage
        const user = getCurrentUser();
        if (user) {
            updateUIForAuthState(user);
        } else {
            updateUIForAuthState(null);
        }
    }
});

/**
 * Handle authentication state changes
 */
function handleAuthStateChanged(user) {
    if (user) {
        // User is signed in
        console.log('User is signed in:', user.uid);
        
        // Store user data in localStorage for persistence
        storeUserData(user);
            
            // Update UI for signed in user
        updateUIForAuthState(user);
        
        // Fetch additional user profile data if needed
        fetchUserProfile(user.uid);
    } else {
        // User is signed out
        console.log('User is signed out');
        localStorage.removeItem('userData');
        updateUIForAuthState(null);
    }
}

/**
 * Store user data in localStorage
 */
function storeUserData(user) {
    const userData = {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email,
        photoURL: user.photoURL
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
}

/**
 * Fetch additional user profile data from database
 */
function fetchUserProfile(uid) {
    if (typeof firebase !== 'undefined' && firebase.database) {
        firebase.database().ref(`users/${uid}`).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    // Update localStorage with additional profile data
                    const currentData = getCurrentUser();
                    const updatedData = { ...currentData, ...userData };
                    localStorage.setItem('userData', JSON.stringify(updatedData));
                    
                    // Update UI with the complete user data
                    updateUIForAuthState(updatedData);
                }
            })
            .catch(error => {
                console.error('Error fetching user profile:', error);
            });
    }
}

/**
 * Initialize user menu functionality
 */
function initUserMenu() {
    setupUserMenuToggle();
    
    // Get user data from localStorage or fetch from server
    const currentUser = getCurrentUser();
    
    // Update UI based on authentication state
    updateUIForAuthState(currentUser);
}

/**
 * Setup user menu toggle functionality
 */
function setupUserMenuToggle() {
    // Find all user menu triggers
    const userMenuTriggers = document.querySelectorAll('.user-menu-trigger');
    const userMenuContainers = document.querySelectorAll('.user-menu-container');
    
    userMenuTriggers.forEach((trigger) => {
        if (!trigger) return;
        
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Get the parent container
            const container = trigger.closest('.user-menu-container');
            if (!container) return;
            
            // Close any open menus first
            userMenuContainers.forEach(otherContainer => {
                if (otherContainer !== container) {
                    otherContainer.classList.remove('active');
                    const dropdown = otherContainer.querySelector('.user-menu-dropdown');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                        dropdown.style.opacity = '0';
                        dropdown.style.visibility = 'hidden';
                    }
                }
            });
            
            // Toggle the dropdown
            container.classList.toggle('active');
            
            // Force dropdown to be visible if it's not
            const dropdown = container.querySelector('.user-menu-dropdown');
            if (dropdown) {
                if (container.classList.contains('active')) {
                    dropdown.style.display = 'block';
                    dropdown.style.opacity = '1';
                    dropdown.style.visibility = 'visible';
                    
                    // Position the dropdown
                    const rect = trigger.getBoundingClientRect();
                    const dropdownRect = dropdown.getBoundingClientRect();
                    
                    // Check if dropdown would go off screen to the right
                    if (rect.left + dropdownRect.width > window.innerWidth) {
                        dropdown.style.right = '0';
                        dropdown.style.left = 'auto';
                    } else {
                        dropdown.style.left = '0';
                        dropdown.style.right = 'auto';
                    }
                    
                    // Check if dropdown would go off screen to the bottom
                    if (rect.bottom + dropdownRect.height > window.innerHeight) {
                        dropdown.style.bottom = '100%';
                        dropdown.style.top = 'auto';
                    } else {
                        dropdown.style.top = '100%';
                        dropdown.style.bottom = 'auto';
                    }
                } else {
                    dropdown.style.display = 'none';
                    dropdown.style.opacity = '0';
                    dropdown.style.visibility = 'hidden';
                }
            }
            
            // Add click event listener to document to close menu when clicking outside
            document.addEventListener('click', closeMenuOnClickOutside);
        });
    });
}

/**
 * Close menu when clicking outside
 */
function closeMenuOnClickOutside(e) {
    const userMenuContainers = document.querySelectorAll('.user-menu-container');
    
    userMenuContainers.forEach(container => {
        // Check if the click is outside the menu container
        if (!container.contains(e.target)) {
            container.classList.remove('active');
            
            // Force dropdown to be hidden
            const dropdown = container.querySelector('.user-menu-dropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
                dropdown.style.opacity = '0';
                dropdown.style.visibility = 'hidden';
            }
        }
    });
    
    // Remove the click event listener after checking
    document.removeEventListener('click', closeMenuOnClickOutside);
}

/**
 * Setup logout functionality
 */
function setupLogoutFunctionality() {
    const logoutLinks = document.querySelectorAll('.logout-link');
    
    logoutLinks.forEach(link => {
        if (!link) return;
        
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().signOut()
                    .then(() => {
                        console.log('User signed out successfully');
                        localStorage.removeItem('userData');
                        window.location.href = 'index.html';
                    })
                    .catch(error => {
                        console.error('Error signing out:', error);
                    });
            } else {
                // Fallback if Firebase is not available
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            }
        });
    });
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
    const authButtons = document.querySelectorAll('.auth-buttons');
    const userMenuContainers = document.querySelectorAll('.user-menu-container');
    const loginBtns = document.querySelectorAll('.login-btn');
    const signupBtns = document.querySelectorAll('.signup-btn');
    const profileBtns = document.querySelectorAll('.profile-btn');
    const userNameElements = document.querySelectorAll('.user-name-small, .user-menu-name');
    const userEmailElements = document.querySelectorAll('.user-menu-email');
    const userAvatarElements = document.querySelectorAll('.user-avatar-small img, .user-menu-avatar img');
    const joinButtons = document.querySelectorAll('.btn-primary.btn-large:not(.write-button)');
    
    // Apply shimmer effect to elements while loading
    const allUserElements = [
        ...(Array.from(userNameElements) || []), 
        ...(Array.from(userAvatarElements) || [])
    ];
    
    allUserElements.forEach(el => {
        if (el) el.classList.add('shimmer');
    });
    
    // Set display style directly with !important flag in CSS
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    
    if (user) {
        // User is logged in
        console.log('Updating UI for logged in user:', user.displayName);
        
        // Add CSS rule for auth state
        styleEl.textContent = `
            .auth-buttons { display: none !important; }
            .user-menu-container { display: block !important; }
        `;
        
        // Hide auth buttons, show user menu
        authButtons.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        
        userMenuContainers.forEach(container => {
            if (container) {
                container.style.display = 'block';
                container.style.visibility = 'visible';
            }
        });
        
        profileBtns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        
        loginBtns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        
        signupBtns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        
        // Update join buttons to be "Write a Post" instead
        joinButtons.forEach(btn => {
            if (btn && (btn.textContent.includes('Join') || btn.textContent.includes('Get Started'))) {
                btn.href = 'write.html';
                btn.textContent = 'Start Writing';
            }
        });
        
        // Update user info in UI
        userNameElements.forEach(el => {
            if (el) {
                el.textContent = user.displayName || 'User';
                el.classList.remove('shimmer');
            }
        });
        
        userEmailElements.forEach(el => {
            if (el) {
                el.textContent = user.email || '';
                el.classList.remove('shimmer');
            }
        });
        
        // Update avatar in UI
        const avatarUrl = user.photoURL || user.profile?.avatarUrl || 'images/default-avatar.png';
        userAvatarElements.forEach(el => {
            if (el) {
                el.src = avatarUrl;
                el.classList.remove('shimmer');
                el.alt = user.displayName || 'User';
                
                // Handle image load error
                el.onerror = function() {
                    this.src = 'images/default-avatar.png';
                };
                
                // Make sure parent container has proper styling
                const avatarContainer = el.parentElement;
                if (avatarContainer) {
                    avatarContainer.style.display = 'flex';
                    avatarContainer.style.alignItems = 'center';
                    avatarContainer.style.justifyContent = 'center';
                }
            }
        });
        
    } else {
        // User is logged out
        console.log('Updating UI for logged out user');
        
        // Add CSS rule for auth state
        styleEl.textContent = `
            .auth-buttons { display: flex !important; }
            .user-menu-container { display: none !important; }
        `;
        
        // Show auth buttons, hide user menu
        authButtons.forEach(btn => {
            if (btn) btn.style.display = 'flex';
        });
        
        userMenuContainers.forEach(container => {
            if (container) container.style.display = 'none';
        });
        
        profileBtns.forEach(btn => {
            if (btn) btn.style.display = 'none';
        });
        
        loginBtns.forEach(btn => {
            if (btn) btn.style.display = 'inline-flex';
        });
        
        signupBtns.forEach(btn => {
            if (btn) btn.style.display = 'inline-flex';
        });
        
        // Remove shimmer from elements
        allUserElements.forEach(el => {
            if (el) el.classList.remove('shimmer');
        });
    }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initUserMenu,
        getCurrentUser,
        updateUIForAuthState,
        handleAuthStateChanged
    };
} 