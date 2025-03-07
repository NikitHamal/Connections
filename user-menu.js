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
            
        } catch (error) {
            console.error('Error handling signed in user:', error);
        }
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
                img.src = user.photoURL || 'https://via.placeholder.com/150';
            });
            
            // Update user name
            const userNameElements = container.querySelectorAll('.user-name-small, .user-menu-name');
            userNameElements.forEach(element => {
                element.textContent = user.displayName || 'User';
            });
            
            // Update user email
            const userEmailElements = container.querySelectorAll('.user-menu-email');
            userEmailElements.forEach(element => {
                element.textContent = user.email || '';
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