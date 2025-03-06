// Firebase References
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// User Data
let currentUser = null;
let userProfile = null;
let selectedInterests = [];
let followingUsers = [];
let profileImageFile = null;
let profileImageURL = '';
let profileImageDeleteURL = '';

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            
            try {
                // Get user profile
                userProfile = await getUserProfile(user.uid);
                
                if (!userProfile) {
                    console.error('User profile not found');
                    return;
                }
                
                // Check if profile is already completed
                if (userProfile.profileCompleted) {
                    // Redirect to home page
                    window.location.href = 'index.html';
                    return;
                }
                
                // Initialize profile setup
                initProfileSetup();
                
            } catch (error) {
                console.error('Error loading user profile:', error);
            }
        } else {
            // Redirect to sign in page
            window.location.href = 'signin.html';
        }
    });
    
    // Step Navigation
    const progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => {
        step.addEventListener('click', () => {
            const stepNumber = parseInt(step.dataset.step);
            if (stepNumber < currentStep) {
                goToStep(stepNumber);
            }
        });
    });
    
    // Back Buttons
    const backButtons = document.querySelectorAll('.btn-back');
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            goToStep(currentStep - 1);
        });
    });
    
    // Skip Button
    const skipButton = document.querySelector('.btn-skip');
    if (skipButton) {
        skipButton.addEventListener('click', () => {
            goToStep(currentStep + 1);
        });
    }
    
    // Form Submissions
    initFormSubmissions();
    
    // Profile Picture Upload
    initProfilePictureUpload();
    
    // Interests Selection
    initInterestsSelection();
    
    // Connections
    initConnectionsSection();
});

// Current Step
let currentStep = 1;

// Initialize Profile Setup
function initProfileSetup() {
    // Update UI with user data
    updateUIWithUserData();
    
    // Set current step
    goToStep(1);
    
    // Check for dark mode and apply appropriate styles
    const isDarkMode = document.body.classList.contains('dark-mode');
    if (isDarkMode) {
        fixDarkModeIcons();
    }
    
    // Add dark mode toggle listener
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            setTimeout(fixDarkModeIcons, 100); // Apply fix after theme toggle
        });
    }
}

// Update UI with User Data
function updateUIWithUserData() {
    // Update user menu button
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = currentUser.displayName || 'Account';
    }
    
    // Pre-fill form fields if data exists
    if (currentUser.displayName) {
        const nameParts = currentUser.displayName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const firstNameInput = document.getElementById('first-name');
        const lastNameInput = document.getElementById('last-name');
        const displayNameInput = document.getElementById('display-name');
        
        if (firstNameInput) firstNameInput.value = firstName;
        if (lastNameInput) lastNameInput.value = lastName;
        if (displayNameInput) displayNameInput.value = currentUser.displayName;
    }
    
    // Pre-fill username suggestion
    const usernameInput = document.getElementById('username');
    if (usernameInput && currentUser.email) {
        const emailUsername = currentUser.email.split('@')[0];
        const sanitizedUsername = emailUsername.replace(/[^a-zA-Z0-9_]/g, '');
        usernameInput.value = sanitizedUsername;
    }
    
    // Set profile image if exists
    if (currentUser.photoURL) {
        const profileImage = document.getElementById('profile-image');
        const profilePlaceholder = document.querySelector('.profile-placeholder');
        
        if (profileImage && profilePlaceholder) {
            profileImage.src = currentUser.photoURL;
            profileImage.style.display = 'block';
            profilePlaceholder.style.display = 'none';
            
            // Show remove button
            const removeButton = document.querySelector('.btn-remove');
            if (removeButton) {
                removeButton.style.display = 'block';
            }
        }
    }
}

// Go to Step
function goToStep(stepNumber) {
    // Validate current step before proceeding
    if (stepNumber > currentStep && !validateCurrentStep()) {
        return;
    }
    
    // Update current step
    currentStep = stepNumber;
    
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const progress = ((stepNumber - 1) / 3) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Update step indicators
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
    
    // Show/hide steps
    const setupSteps = document.querySelectorAll('.setup-step');
    setupSteps.forEach(step => {
        step.classList.remove('active');
    });
    
    const activeStep = document.getElementById(`step-${stepNumber}`);
    if (activeStep) {
        activeStep.classList.add('active');
    } else if (stepNumber === 5) {
        // Show completion screen
        const completeStep = document.getElementById('step-complete');
        if (completeStep) {
            completeStep.classList.add('active');
            
            // Update stats
            const followingCountElement = document.getElementById('stat-following');
            if (followingCountElement) {
                followingCountElement.textContent = followingUsers.length;
            }
        }
    }
}

// Validate Current Step
function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return validateBasicInfoForm();
        case 2:
            return true; // Profile picture is optional
        case 3:
            return true; // Interests are optional
        case 4:
            return true; // Connections are optional
        default:
            return true;
    }
}

// Validate Basic Info Form
function validateBasicInfoForm() {
    // Get form elements
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const displayNameInput = document.getElementById('display-name');
    const usernameInput = document.getElementById('username');
    
    // Clear previous errors
    clearErrors();
    
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

// Initialize Form Submissions
function initFormSubmissions() {
    // Basic Info Form
    const basicInfoForm = document.getElementById('basic-info-form');
    if (basicInfoForm) {
        basicInfoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (validateBasicInfoForm()) {
                // Save basic info
                await saveBasicInfo();
                
                // Go to next step
                goToStep(2);
            }
        });
    }
    
    // Profile Picture Form
    const profilePictureForm = document.getElementById('profile-picture-form');
    if (profilePictureForm) {
        profilePictureForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Save profile picture
            await saveProfilePicture();
            
            // Go to next step
            goToStep(3);
        });
    }
    
    // Interests Form
    const interestsForm = document.getElementById('interests-form');
    if (interestsForm) {
        interestsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Save interests
            await saveInterests();
            
            // Go to next step
            goToStep(4);
        });
    }
    
    // Connections Form
    const connectionsForm = document.getElementById('connections-form');
    if (connectionsForm) {
        connectionsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Save connections
            await saveConnections();
            
            // Complete profile setup
            await completeProfileSetup();
            
            // Go to completion step
            goToStep(5);
        });
    }
    
    // Bio Character Count
    const bioTextarea = document.getElementById('bio');
    const bioCount = document.getElementById('bio-count');
    
    if (bioTextarea && bioCount) {
        bioTextarea.addEventListener('input', () => {
            const count = bioTextarea.value.length;
            bioCount.textContent = count;
        });
    }
}

// Initialize Profile Picture Upload
function initProfilePictureUpload() {
    const uploadButton = document.querySelector('.btn-upload');
    const fileInput = document.getElementById('profile-picture');
    const removeButton = document.querySelector('.btn-remove');
    const profileImage = document.getElementById('profile-image');
    const profilePlaceholder = document.querySelector('.profile-placeholder');
    const uploadProgressContainer = document.createElement('div');
    const uploadProgressBar = document.createElement('div');
    
    // Create and add upload progress elements
    uploadProgressContainer.className = 'upload-progress-container';
    uploadProgressBar.className = 'upload-progress-bar';
    uploadProgressContainer.appendChild(uploadProgressBar);
    
    // Add progress container after the profile picture preview
    const profilePicturePreview = document.getElementById('profile-picture-preview');
    if (profilePicturePreview) {
        profilePicturePreview.parentNode.insertBefore(uploadProgressContainer, profilePicturePreview.nextSibling);
        uploadProgressContainer.style.display = 'none';
    }
    
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
                    if (profileImage && profilePlaceholder) {
                        profileImage.src = event.target.result;
                        profileImage.style.display = 'block';
                        profilePlaceholder.style.display = 'none';
                        
                        // Show remove button
                        if (removeButton) {
                            removeButton.style.display = 'block';
                        }
                        
                        // Add animation class for smooth transition
                        profileImage.classList.add('fade-in');
                        setTimeout(() => {
                            profileImage.classList.remove('fade-in');
                        }, 500);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removeButton) {
        removeButton.addEventListener('click', () => {
            // Clear file input
            if (fileInput) {
                fileInput.value = '';
            }
            
            // Clear preview with animation
            if (profileImage && profilePlaceholder) {
                profileImage.classList.add('fade-out');
                
                setTimeout(() => {
                profileImage.src = '';
                profileImage.style.display = 'none';
                    profileImage.classList.remove('fade-out');
                profilePlaceholder.style.display = 'block';
                    profilePlaceholder.classList.add('fade-in');
                    
                    setTimeout(() => {
                        profilePlaceholder.classList.remove('fade-in');
                    }, 500);
                }, 300);
            }
            
            // Hide remove button
            removeButton.style.display = 'none';
            
            // Clear stored file
            profileImageFile = null;
        });
    }
    
    // Add drag and drop functionality
    const dropArea = document.getElementById('profile-picture-preview');
    if (dropArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropArea.classList.add('highlight');
        }
        
        function unhighlight() {
            dropArea.classList.remove('highlight');
        }
        
        dropArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const file = dt.files[0];
            
            if (file && fileInput) {
                // Set the file to the input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        }
    }
}

// Initialize Interests Selection
function initInterestsSelection() {
    const interestOptions = document.querySelectorAll('.interest-option input');
    const selectedTopicsContainer = document.getElementById('selected-topics');
    const selectedCountElement = document.getElementById('selected-count');
    const noTopicsSelected = document.querySelector('.no-topics-selected');
    
    if (interestOptions) {
        interestOptions.forEach(option => {
            option.addEventListener('change', () => {
                const interestValue = option.value;
                const interestName = option.parentElement.querySelector('.interest-name').textContent;
                
                if (option.checked) {
                    // Add to selected interests
                    selectedInterests.push({
                        id: interestValue,
                        name: interestName
                    });
                } else {
                    // Remove from selected interests
                    selectedInterests = selectedInterests.filter(interest => interest.id !== interestValue);
                }
                
                // Update UI
                updateSelectedInterestsUI();
            });
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('interest-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            interestOptions.forEach(option => {
                const interestName = option.parentElement.querySelector('.interest-name').textContent.toLowerCase();
                const category = option.closest('.interest-category');
                
                if (interestName.includes(searchTerm)) {
                    option.parentElement.style.display = 'inline-flex';
                    if (category) {
                        category.style.display = 'block';
                    }
                } else {
                    option.parentElement.style.display = 'none';
                }
            });
            
            // Check if any options are visible in each category
            document.querySelectorAll('.interest-category').forEach(category => {
                const visibleOptions = category.querySelectorAll('.interest-option[style*="display: inline-flex"]');
                if (visibleOptions.length === 0) {
                    category.style.display = 'none';
                }
            });
        });
    }
    
    // Update selected interests UI
    function updateSelectedInterestsUI() {
        if (!selectedTopicsContainer || !selectedCountElement || !noTopicsSelected) return;
        
        // Update count
        selectedCountElement.textContent = selectedInterests.length;
        
        // Clear container
        selectedTopicsContainer.innerHTML = '';
        
        if (selectedInterests.length === 0) {
            // Show no topics message
            selectedTopicsContainer.appendChild(noTopicsSelected);
        } else {
            // Add topic pills
            selectedInterests.forEach(interest => {
                const pill = document.createElement('div');
                pill.className = 'topic-pill';
                pill.innerHTML = `
                    ${interest.name}
                    <button type="button" class="remove-topic" data-id="${interest.id}">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                `;
                selectedTopicsContainer.appendChild(pill);
                
                // Add remove event
                const removeButton = pill.querySelector('.remove-topic');
                removeButton.addEventListener('click', () => {
                    // Uncheck the corresponding checkbox
                    const checkbox = document.querySelector(`.interest-option input[value="${interest.id}"]`);
                    if (checkbox) {
                        checkbox.checked = false;
                    }
                    
                    // Remove from selected interests
                    selectedInterests = selectedInterests.filter(item => item.id !== interest.id);
                    
                    // Update UI
                    updateSelectedInterestsUI();
                });
            });
        }
    }
}

// Initialize Connections Section
function initConnectionsSection() {
    const followButtons = document.querySelectorAll('.btn-follow');
    const followingListContainer = document.getElementById('following-list');
    const followingCountElement = document.getElementById('following-count');
    const noFollowingElement = document.querySelector('.no-following');
    
    if (followButtons) {
        followButtons.forEach(button => {
            button.addEventListener('click', () => {
                const card = button.closest('.connection-card');
                const avatar = card.querySelector('.connection-avatar').style.backgroundImage;
                const name = card.querySelector('h4').textContent;
                const bio = card.querySelector('p').textContent;
                
                if (button.classList.contains('following')) {
                    // Unfollow
                    button.classList.remove('following');
                    button.textContent = 'Follow';
                    
                    // Remove from following list
                    const userId = button.dataset.userId || name.replace(/\s+/g, '-').toLowerCase();
                    followingUsers = followingUsers.filter(user => user.id !== userId);
                } else {
                    // Follow
                    button.classList.add('following');
                    button.textContent = 'Following';
                    
                    // Add to following list
                    const userId = button.dataset.userId || name.replace(/\s+/g, '-').toLowerCase();
                    followingUsers.push({
                        id: userId,
                        name,
                        bio,
                        avatar
                    });
                }
                
                // Update UI
                updateFollowingUI();
            });
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('connection-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            document.querySelectorAll('.connection-card').forEach(card => {
                const name = card.querySelector('h4').textContent.toLowerCase();
                const bio = card.querySelector('p').textContent.toLowerCase();
                
                if (name.includes(searchTerm) || bio.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Update following UI
    function updateFollowingUI() {
        if (!followingListContainer || !followingCountElement || !noFollowingElement) return;
        
        // Update count
        followingCountElement.textContent = followingUsers.length;
        
        // Clear container
        followingListContainer.innerHTML = '';
        
        if (followingUsers.length === 0) {
            // Show no following message
            followingListContainer.appendChild(noFollowingElement);
        } else {
            // Add following items
            followingUsers.forEach(user => {
                const item = document.createElement('div');
                item.className = 'following-item';
                item.innerHTML = `
                    <div class="following-avatar" style="${user.avatar}"></div>
                    <div class="following-info">
                        <h4>${user.name}</h4>
                        <p>${user.bio}</p>
                    </div>
                    <button type="button" class="btn-unfollow" data-id="${user.id}">
                        <span class="material-symbols-rounded">close</span>
                    </button>
                `;
                followingListContainer.appendChild(item);
                
                // Add unfollow event
                const unfollowButton = item.querySelector('.btn-unfollow');
                unfollowButton.addEventListener('click', () => {
                    // Update follow button
                    const followButton = document.querySelector(`.btn-follow[data-user-id="${user.id}"]`);
                    if (followButton) {
                        followButton.classList.remove('following');
                        followButton.textContent = 'Follow';
                    } else {
                        // Find by name if data-user-id is not set
                        document.querySelectorAll('.connection-card').forEach(card => {
                            const cardName = card.querySelector('h4').textContent;
                            if (cardName === user.name) {
                                const btn = card.querySelector('.btn-follow');
                                if (btn) {
                                    btn.classList.remove('following');
                                    btn.textContent = 'Follow';
                                }
                            }
                        });
                    }
                    
                    // Remove from following list
                    followingUsers = followingUsers.filter(u => u.id !== user.id);
                    
                    // Update UI
                    updateFollowingUI();
                });
            });
        }
    }
}

// Save Basic Info
async function saveBasicInfo() {
    try {
        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const displayName = document.getElementById('display-name').value.trim();
        const username = document.getElementById('username').value.trim();
        const bio = document.getElementById('bio')?.value.trim() || '';
        const location = document.getElementById('location')?.value.trim() || '';
        const birthdate = document.getElementById('birthdate')?.value || '';
        
        // Set verification type to null (regular user) by default
        const verificationType = null;
        
        // Update user profile in Firebase Auth
        await currentUser.updateProfile({
            displayName: displayName
        });
        
        // Update user profile in database
        const updates = {
            firstName,
            lastName,
            displayName,
            username,
            bio,
            location,
            birthdate,
            verificationType,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user profile
        userProfile = {
            ...userProfile,
            ...updates
        };
        
        console.log('Basic info saved successfully');
        
    } catch (error) {
        console.error('Error saving basic info:', error);
        alert('Error saving basic info. Please try again.');
    }
}

// Save Profile Picture
async function saveProfilePicture() {
    try {
        if (!profileImageFile) {
            console.log('No profile picture to save');
            return;
        }
        
        // Show upload progress
        const uploadProgressContainer = document.querySelector('.upload-progress-container');
        const uploadProgressBar = document.querySelector('.upload-progress-bar');
        
        if (uploadProgressContainer && uploadProgressBar) {
            uploadProgressContainer.style.display = 'block';
            uploadProgressBar.style.width = '0%';
            
            // Simulate progress (in a real app, you would use XHR to track actual progress)
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 5;
                uploadProgressBar.style.width = `${Math.min(progress, 90)}%`;
                
                if (progress >= 90) {
                    clearInterval(progressInterval);
                }
            }, 100);
        }
        
        // Upload to ImageBB
        const imageURL = await uploadToImageBB(profileImageFile);
        
        if (!imageURL) {
            throw new Error('Failed to upload image');
        }
        
        // Complete progress bar
        if (uploadProgressBar) {
            uploadProgressBar.style.width = '100%';
            
            // Hide progress bar after a delay
            setTimeout(() => {
                if (uploadProgressContainer) {
                    uploadProgressContainer.style.display = 'none';
                }
            }, 1000);
        }
        
        // Update user profile in Firebase Auth
        await currentUser.updateProfile({
            photoURL: imageURL.url
        });
        
        // Add to profile history
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const profileHistoryRef = database.ref(`users/${currentUser.uid}/profileHistory`);
        
        await profileHistoryRef.push({
            photoURL: imageURL.url,
            deleteURL: imageURL.delete_url,
            timestamp
        });
        
        // Update user profile in database
        const updates = {
            photoURL: imageURL.url,
            updatedAt: timestamp
        };
        
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user profile
        userProfile = {
            ...userProfile,
            ...updates
        };
        
        // Update profile history UI
        updateProfileHistoryUI();
        
        console.log('Profile picture saved successfully');
        
    } catch (error) {
        console.error('Error saving profile picture:', error);
        alert('Error saving profile picture. Please try again.');
        
        // Hide progress bar on error
        const uploadProgressContainer = document.querySelector('.upload-progress-container');
        if (uploadProgressContainer) {
            uploadProgressContainer.style.display = 'none';
        }
    }
}

// Update Profile History UI
function updateProfileHistoryUI() {
    const historyContainer = document.querySelector('.history-images');
    const emptyMessage = document.querySelector('.history-empty');
    
    if (!historyContainer || !emptyMessage || !userProfile || !userProfile.profileHistory) {
        return;
    }
    
    // Clear container
    historyContainer.innerHTML = '';
    
    // Get profile history
    const profileHistory = userProfile.profileHistory;
    
    if (!profileHistory || Object.keys(profileHistory).length === 0) {
        // Show empty message
        emptyMessage.style.display = 'block';
        return;
    }
    
    // Hide empty message
    emptyMessage.style.display = 'none';
    
    // Add history items
    Object.entries(profileHistory)
        .sort((a, b) => b[1].timestamp - a[1].timestamp)
        .slice(0, 4) // Show only the last 4 images
        .forEach(([key, history]) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-image';
            historyItem.innerHTML = `
                <img src="${history.photoURL}" alt="Previous profile picture">
                <div class="history-image-actions">
                    <button type="button" class="btn-restore" data-key="${key}">
                        <span class="material-symbols-rounded">restore</span>
                    </button>
                </div>
            `;
            historyContainer.appendChild(historyItem);
            
            // Add restore event
            const restoreButton = historyItem.querySelector('.btn-restore');
            restoreButton.addEventListener('click', async () => {
                try {
                    // Update user profile in Firebase Auth
                    await currentUser.updateProfile({
                        photoURL: history.photoURL
                    });
                    
                    // Update user profile in database
                    const updates = {
                        photoURL: history.photoURL,
                        updatedAt: firebase.database.ServerValue.TIMESTAMP
                    };
                    
                    await database.ref(`users/${currentUser.uid}`).update(updates);
                    
                    // Update local user profile
                    userProfile = {
                        ...userProfile,
                        ...updates
                    };
                    
                    // Update profile image preview
                    const profileImage = document.getElementById('profile-image');
                    const profilePlaceholder = document.querySelector('.profile-placeholder');
                    const removeButton = document.querySelector('.btn-remove');
                    
                    if (profileImage && profilePlaceholder) {
                        profileImage.src = history.photoURL;
                        profileImage.style.display = 'block';
                        profilePlaceholder.style.display = 'none';
                        
                        // Show remove button
                        if (removeButton) {
                            removeButton.style.display = 'block';
                        }
                    }
                    
                    console.log('Profile picture restored successfully');
                    
                } catch (error) {
                    console.error('Error restoring profile picture:', error);
                    alert('Error restoring profile picture. Please try again.');
                }
            });
        });
}

// Save Interests
async function saveInterests() {
    try {
        // Update user profile in database
        const updates = {
            topicsFollowed: selectedInterests.map(interest => interest.id),
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user profile
        userProfile = {
            ...userProfile,
            ...updates
        };
        
        console.log('Interests saved successfully');
        
    } catch (error) {
        console.error('Error saving interests:', error);
        alert('Error saving interests. Please try again.');
    }
}

// Save Connections
async function saveConnections() {
    try {
        // Update user profile in database
        const updates = {
            following: followingUsers.map(user => user.id),
            'stats/following': followingUsers.length,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user profile
        userProfile = {
            ...userProfile,
            ...updates,
            stats: {
                ...userProfile.stats,
                following: followingUsers.length
            }
        };
        
        console.log('Connections saved successfully');
        
    } catch (error) {
        console.error('Error saving connections:', error);
        alert('Error saving connections. Please try again.');
    }
}

// Complete Profile Setup
async function completeProfileSetup() {
    try {
        // Update user profile in database
        const updates = {
            profileCompleted: true,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user profile
        userProfile = {
            ...userProfile,
            ...updates
        };
        
        console.log('Profile setup completed successfully');
        
    } catch (error) {
        console.error('Error completing profile setup:', error);
        alert('Error completing profile setup. Please try again.');
    }
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

// Helper Functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

// Add function to fix dark mode icons
function fixDarkModeIcons() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const stepChecks = document.querySelectorAll('.step-check');
    
    stepChecks.forEach(check => {
        if (isDarkMode) {
            check.style.color = 'var(--dark-surface)';
        } else {
            check.style.color = '';
        }
    });
    
    const completedStepIndicators = document.querySelectorAll('.progress-step.completed .step-indicator');
    completedStepIndicators.forEach(indicator => {
        if (isDarkMode) {
            indicator.style.backgroundColor = 'var(--accent-light)';
            indicator.style.borderColor = 'var(--accent-light)';
        } else {
            indicator.style.backgroundColor = '';
            indicator.style.borderColor = '';
        }
    });
} 