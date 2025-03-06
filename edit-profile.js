document.addEventListener('DOMContentLoaded', function() {
    // Theme toggle functionality
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            
            // Save preference to localStorage
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
        });
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('darkMode');
        if (savedTheme === 'true') {
            document.body.classList.add('dark-mode');
        } else if (savedTheme === 'false') {
            document.body.classList.remove('dark-mode');
        } else {
            // Check for system preference if no saved preference
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDarkMode) {
                document.body.classList.add('dark-mode');
            }
        }
    }
    
    // Back button functionality
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            // Go back to profile page
            window.location.href = 'profile.html';
        });
    }
    
    // Cancel button functionality
    const cancelButton = document.getElementById('cancel-btn');
    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            // Go back to profile page
            window.location.href = 'profile.html';
        });
    }
    
    // Initialize full-screen image viewer
    initImageViewer();
    
    // Initialize profile picture upload
    initProfilePictureUpload();
    
    // Initialize form
    initForm();
    
    // Current user data
    let currentUser = null;
    let userProfile = null;
    let profileImageFile = null;
    
    // Initialize the page
    function initPage() {
        // Show loading overlay
        showLoading();
        
        // Check if user is logged in
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                currentUser = user;
                
                try {
                    // Get user profile
                    userProfile = await getUserProfile(user.uid);
                    
                    if (!userProfile) {
                        console.error('User profile not found');
                        hideLoading();
                        return;
                    }
                    
                    // Fill form with user data
                    fillFormWithUserData();
                    
                    // Hide loading overlay
                    hideLoading();
                    
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    hideLoading();
                    alert('Error loading your profile. Please try again.');
                }
            } else {
                // Redirect to sign in page
                window.location.href = 'signin.html?redirect=' + encodeURIComponent(window.location.href);
            }
        });
    }
    
    // Fill form with user data
    function fillFormWithUserData() {
        if (!userProfile) return;
        
        // Basic info
        document.getElementById('first-name').value = userProfile.firstName || '';
        document.getElementById('last-name').value = userProfile.lastName || '';
        document.getElementById('display-name').value = userProfile.displayName || '';
        document.getElementById('username').value = userProfile.username || '';
        
        // Bio
        const bioElement = document.getElementById('bio');
        if (bioElement) {
            bioElement.value = userProfile.bio || '';
            updateCharCount();
        }
        
        // Location
        document.getElementById('location').value = userProfile.location || '';
        
        // Profile picture
        const profileAvatar = document.getElementById('profile-avatar');
        if (profileAvatar && userProfile.photoURL) {
            profileAvatar.src = userProfile.photoURL;
            
            // Set the same image for the fullscreen viewer
            document.getElementById('fullscreen-image').src = userProfile.photoURL;
        }
    }
    
    // Initialize form
    function initForm() {
        const form = document.getElementById('edit-profile-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                if (validateForm()) {
                    await saveProfile();
                }
            });
        }
        
        // Bio character count
        const bioElement = document.getElementById('bio');
        if (bioElement) {
            bioElement.addEventListener('input', updateCharCount);
        }
    }
    
    // Update character count for bio
    function updateCharCount() {
        const bioElement = document.getElementById('bio');
        const bioCount = document.getElementById('bio-count');
        
        if (bioElement && bioCount) {
            const count = bioElement.value.length;
            bioCount.textContent = count;
        }
    }
    
    // Validate form
    function validateForm() {
        // Clear previous errors
        clearErrors();
        
        // Get form elements
        const firstNameInput = document.getElementById('first-name');
        const lastNameInput = document.getElementById('last-name');
        const displayNameInput = document.getElementById('display-name');
        const usernameInput = document.getElementById('username');
        
        // Validate required fields
        let isValid = true;
        
        if (!firstNameInput.value.trim()) {
            showError('first-name-error', 'First name is required');
            isValid = false;
        }
        
        if (!lastNameInput.value.trim()) {
            showError('last-name-error', 'Last name is required');
            isValid = false;
        }
        
        if (!displayNameInput.value.trim()) {
            showError('display-name-error', 'Display name is required');
            isValid = false;
        }
        
        if (!usernameInput.value.trim()) {
            showError('username-error', 'Username is required');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_]+$/.test(usernameInput.value)) {
            showError('username-error', 'Username can only contain letters, numbers, and underscores');
            isValid = false;
        }
        
        return isValid;
    }
    
    // Save profile
    async function saveProfile() {
        try {
            // Show loading overlay
            showLoading();
            
            // Get form data
            const firstName = document.getElementById('first-name').value.trim();
            const lastName = document.getElementById('last-name').value.trim();
            const displayName = document.getElementById('display-name').value.trim();
            const username = document.getElementById('username').value.trim();
            const bio = document.getElementById('bio')?.value.trim() || '';
            const location = document.getElementById('location')?.value.trim() || '';
            
            // Update user profile in Firebase Auth
            await currentUser.updateProfile({
                displayName: displayName
            });
            
            // Upload profile picture if changed
            if (profileImageFile) {
                await uploadProfilePicture();
            }
            
            // Update user profile in database
            const updates = {
                firstName,
                lastName,
                displayName,
                username,
                bio,
                location,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            };
            
            await firebase.database().ref(`users/${currentUser.uid}`).update(updates);
            
            // Hide loading overlay
            hideLoading();
            
            // Redirect to profile page
            window.location.href = 'profile.html';
            
        } catch (error) {
            console.error('Error saving profile:', error);
            hideLoading();
            alert('Error saving profile. Please try again.');
        }
    }
    
    // Initialize profile picture upload
    function initProfilePictureUpload() {
        const uploadButton = document.getElementById('upload-photo-btn');
        const fileInput = document.getElementById('profile-picture-input');
        const removeButton = document.getElementById('remove-photo-btn');
        const profileAvatar = document.getElementById('profile-avatar');
        const avatarContainer = document.getElementById('profile-avatar-container');
        
        if (uploadButton && fileInput) {
            uploadButton.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    
                    // Validate file type and size
                    if (!file.type.match('image.*')) {
                        alert('Please select an image file');
                        return;
                    }
                    
                    if (file.size > 5 * 1024 * 1024) {
                        alert('File size should be less than 5MB');
                        return;
                    }
                    
                    // Store file for later upload
                    profileImageFile = file;
                    
                    // Preview image
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (profileAvatar) {
                            profileAvatar.src = event.target.result;
                            
                            // Set the same image for the fullscreen viewer
                            document.getElementById('fullscreen-image').src = event.target.result;
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        
        if (removeButton && profileAvatar) {
            removeButton.addEventListener('click', () => {
                // Clear file input
                if (fileInput) {
                    fileInput.value = '';
                }
                
                // Clear preview
                profileAvatar.src = 'https://via.placeholder.com/150';
                document.getElementById('fullscreen-image').src = 'https://via.placeholder.com/150';
                
                // Set flag to remove profile picture
                profileImageFile = 'remove';
            });
        }
        
        // Make avatar container clickable to open image viewer
        if (avatarContainer) {
            avatarContainer.addEventListener('click', () => {
                const imageViewer = document.getElementById('image-viewer');
                if (imageViewer) {
                    imageViewer.classList.add('active');
                    document.body.style.overflow = 'hidden'; // Prevent scrolling
                }
            });
        }
    }
    
    // Upload profile picture
    async function uploadProfilePicture() {
        if (!profileImageFile) return;
        
        // If remove flag is set, remove profile picture
        if (profileImageFile === 'remove') {
            // Update user profile in Firebase Auth
            await currentUser.updateProfile({
                photoURL: null
            });
            
            // Update user profile in database
            await firebase.database().ref(`users/${currentUser.uid}`).update({
                photoURL: null,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            return;
        }
        
        // Upload to ImageBB
        const imageURL = await uploadToImageBB(profileImageFile);
        
        if (!imageURL) {
            throw new Error('Failed to upload image');
        }
        
        // Update user profile in Firebase Auth
        await currentUser.updateProfile({
            photoURL: imageURL.url
        });
        
        // Add to profile history
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const profileHistoryRef = firebase.database().ref(`users/${currentUser.uid}/profileHistory`);
        
        await profileHistoryRef.push({
            photoURL: imageURL.url,
            deleteURL: imageURL.delete_url,
            timestamp
        });
        
        // Update user profile in database
        await firebase.database().ref(`users/${currentUser.uid}`).update({
            photoURL: imageURL.url,
            updatedAt: timestamp
        });
    }
    
    // Upload to ImageBB
    async function uploadToImageBB(file) {
        try {
            // Create FormData and append the file
            const formData = new FormData();
            formData.append('image', file);
            
            // Use your ImageBB API key here
            const apiKey = 'cae25a5efbe778e17c1db8b6f4e44cd7'; // Replace with your actual API key
            
            // Make the API request to ImageBB
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`ImageBB upload failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('ImageBB upload failed: ' + (data.error?.message || 'Unknown error'));
            }
            
            console.log('Image uploaded successfully:', data.data.url);
            
            // Return the URL and delete URL
            return {
                url: data.data.url,
                delete_url: data.data.delete_url
            };
            
        } catch (error) {
            console.error('Error uploading to ImageBB:', error);
            throw error;
        }
    }
    
    // Get user profile
    async function getUserProfile(uid) {
        try {
            const snapshot = await firebase.database().ref(`users/${uid}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }
    
    // Initialize full-screen image viewer
    function initImageViewer() {
        const imageViewer = document.getElementById('image-viewer');
        const closeButton = document.getElementById('image-viewer-close');
        
        if (imageViewer && closeButton) {
            // Close image viewer when clicking on close button
            closeButton.addEventListener('click', () => {
                imageViewer.classList.remove('active');
                document.body.style.overflow = ''; // Restore scrolling
            });
            
            // Close image viewer when clicking on overlay
            imageViewer.addEventListener('click', (e) => {
                if (e.target === imageViewer || e.target.classList.contains('image-viewer-overlay')) {
                    imageViewer.classList.remove('active');
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
            
            // Close image viewer when pressing Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && imageViewer.classList.contains('active')) {
                    imageViewer.classList.remove('active');
                    document.body.style.overflow = ''; // Restore scrolling
                }
            });
        }
    }
    
    // Show loading overlay
    function showLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }
    }
    
    // Hide loading overlay
    function hideLoading() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }
    
    // Show error message
    function showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    // Clear all error messages
    function clearErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }
    
    // Initialize the page
    initPage();
}); 