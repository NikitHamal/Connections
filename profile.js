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
            // Check if there's a previous page in history
            if (document.referrer && document.referrer.includes(window.location.hostname)) {
                window.history.back();
            } else {
                // Default to home page if no referrer
                window.location.href = 'index.html';
            }
        });
    }
    
    // Initialize full-screen image viewer
    initImageViewer();
    
    // Profile tab switching
    const profileTabs = document.querySelectorAll('.profile-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');

    profileTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            profileTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active content
            profileTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                }
            });

            // Save active tab preference in localStorage
            localStorage.setItem('activeProfileTab', tabName);
            
            // Load content for the tab if it hasn't been loaded yet
            if (tabName === 'posts' && !document.querySelector('.profile-posts').hasAttribute('data-loaded')) {
                showPostsShimmer();
                loadProfilePosts(currentProfileData, currentProfileUid);
            } else if (tabName === 'activity' && !document.querySelector('.profile-activity-list').hasAttribute('data-loaded')) {
                showActivityShimmer();
                loadProfileActivity(currentProfileData);
            } else if (tabName === 'connections' && !document.querySelector('.profile-connections-list').hasAttribute('data-loaded')) {
                showConnectionsShimmer();
                loadProfileConnections(currentProfileData);
            }
        });
    });

    // Restore active tab from localStorage if available
    const savedTab = localStorage.getItem('activeProfileTab');
    if (savedTab) {
        const tabToActivate = document.querySelector(`.profile-tab[data-tab="${savedTab}"]`);
        if (tabToActivate) {
            tabToActivate.click();
        }
    }

    // Edit profile button functionality
    const editProfileBtn = document.querySelector('.profile-edit-btn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            window.location.href = 'edit-profile.html';
        });
    }

    // Share profile button functionality
    const shareProfileBtn = document.querySelector('.profile-action-btn[aria-label="Share profile"]');
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', () => {
            // Check if Web Share API is available
            if (navigator.share) {
                navigator.share({
                    title: document.title,
                    url: window.location.href
                })
                .catch(error => {
                    console.error('Error sharing:', error);
                });
            } else {
                // Fallback for browsers that don't support the Web Share API
                // Copy the URL to clipboard
                const dummy = document.createElement('input');
                document.body.appendChild(dummy);
                dummy.value = window.location.href;
                dummy.select();
                document.execCommand('copy');
                document.body.removeChild(dummy);
                
                // Show a toast or alert
                alert('Profile URL copied to clipboard!');
            }
        });
    }

    // Message buttons in connections tab
    const messageButtons = document.querySelectorAll('.profile-connection-action .btn');
    messageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const connectionCard = e.target.closest('.profile-connection-card');
            const connectionName = connectionCard.querySelector('.profile-connection-name').textContent;
            
            // This would typically open a chat interface or navigate to a messages page
            alert(`Chat with ${connectionName} will be implemented in the next phase.`);
        });
    });

    // Pro feature overlay toggle (for demo purposes)
    const proSection = document.querySelector('.profile-visitors-section');
    const proOverlay = document.querySelector('.profile-pro-overlay');
    const upgradeBtn = document.querySelector('.profile-upgrade-btn');
    
    // Function to toggle the pro overlay visibility
    function toggleProOverlay() {
        if (proOverlay) {
            const isHidden = proOverlay.style.display === 'none';
            proOverlay.style.display = isHidden ? 'flex' : 'none';
        }
    }
    
    // For demo purposes, clicking anywhere on the pro section toggles the overlay
    if (proSection && proOverlay) {
        proSection.addEventListener('click', (e) => {
            // Don't toggle if clicking on the upgrade button itself
            if (!e.target.closest('.profile-upgrade-btn')) {
                toggleProOverlay();
            }
        });
    }
    
    // Upgrade button functionality
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            alert('Upgrade to Pro functionality will be implemented in the next phase.');
            toggleProOverlay();
        });
    }

    // Store current profile data globally
    let currentProfileData = null;
    let currentProfileUid = null;

    // Initialize the page based on whether we're viewing our own profile or someone else's
    function initializeProfileView() {
        // Show shimmer loading effect for profile header
        showProfileShimmer();
        
        // Get the current user's UID and the profile UID from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const profileUid = urlParams.get('uid');
        
        // Check if the current user is logged in
        firebase.auth().onAuthStateChanged(function(currentUser) {
            if (profileUid) {
                // We're viewing someone else's profile
                currentProfileUid = profileUid;
                loadUserProfile(profileUid, currentUser);
            } else if (currentUser) {
                // No uid parameter, load the current user's profile
                currentProfileUid = currentUser.uid;
                loadUserProfile(currentUser.uid, currentUser);
            } else {
                // Not logged in and no profile specified, redirect to login
                window.location.href = 'signin.html?redirect=' + encodeURIComponent(window.location.href);
            }
        });
    }

    // Load user profile data from Firebase
    async function loadUserProfile(profileUid, currentUser) {
        try {
            // Get profile data from Firebase
            const profileSnapshot = await firebase.database().ref(`users/${profileUid}`).once('value');
            const profileData = profileSnapshot.val();
            
            if (!profileData) {
                console.error('Profile not found');
                // Handle profile not found (could redirect or show error)
                hideProfileShimmer();
                return;
            }
            
            // Store profile data globally
            currentProfileData = profileData;
            
            // Determine if this is the current user's profile
            const isOwnProfile = currentUser && currentUser.uid === profileUid;
            
            // Update UI with profile data
            updateProfileUI(profileData, isOwnProfile);
            
            // Load content for the active tab
            const activeTab = document.querySelector('.profile-tab.active');
            if (activeTab) {
                const tabName = activeTab.getAttribute('data-tab');
                if (tabName === 'posts') {
                    showPostsShimmer();
                    loadProfilePosts(profileData, profileUid);
                } else if (tabName === 'activity') {
                    showActivityShimmer();
                    loadProfileActivity(profileData);
                } else if (tabName === 'connections') {
                    showConnectionsShimmer();
                    loadProfileConnections(profileData);
                }
            }
            
        } catch (error) {
            console.error('Error loading profile:', error);
            hideProfileShimmer();
        }
    }

    // Update the profile UI with the loaded data
    function updateProfileUI(profileData, isOwnProfile) {
        // Remove shimmer effect
        hideProfileShimmer();
        
        // Update profile header
        document.querySelector('.profile-name').innerHTML = 
            `${profileData.displayName || 'User'}${profileData.verificationType ? renderVerificationBadge(profileData.verificationType) : ''}`;
        document.querySelector('.profile-username').textContent = profileData.username ? `@${profileData.username}` : '';
        
        // Update profile avatar if available
        const avatarImg = document.querySelector('.profile-avatar');
        if (profileData.photoURL) {
            avatarImg.src = profileData.photoURL;
            
            // Set the same image for the fullscreen viewer
            document.getElementById('fullscreen-image').src = profileData.photoURL;
        } else {
            // Use default avatar or placeholder
            avatarImg.src = 'https://via.placeholder.com/150';
            document.getElementById('fullscreen-image').src = 'https://via.placeholder.com/150';
        }
        
        // Update location if available
        const locationElements = document.querySelectorAll('.profile-meta-item span:last-child');
        if (profileData.location && locationElements.length > 0) {
            locationElements[0].textContent = profileData.location;
        }
        
        // Update join date
        if (locationElements.length > 1) {
            if (profileData.createdAt) {
                const joinDate = new Date(profileData.createdAt);
                const options = { year: 'numeric', month: 'long' };
                locationElements[1].textContent = `Joined ${joinDate.toLocaleDateString('en-US', options)}`;
            }
        }
        
        // Update bio if available
        const bioElement = document.querySelector('.profile-bio');
        if (bioElement && profileData.bio) {
            bioElement.textContent = profileData.bio;
        }
        
        // Handle profile actions based on whether this is the user's own profile
        const actionsContainer = document.querySelector('.profile-actions');
        if (actionsContainer) {
            if (isOwnProfile) {
                // Show edit button for own profile
                if (!actionsContainer.querySelector('.profile-edit-btn')) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'profile-edit-btn';
                    editBtn.innerHTML = '<span class="material-symbols-rounded">edit</span><span>Edit Profile</span>';
                    actionsContainer.appendChild(editBtn);
                    
                    // Add event listener to the edit button
                    editBtn.addEventListener('click', () => {
                        window.location.href = 'edit-profile.html';
                    });
                }
            } else {
                // Show follow button for other profiles
                const editBtn = actionsContainer.querySelector('.profile-edit-btn');
                if (editBtn) {
                    editBtn.remove();
                }
                
                const followBtn = document.createElement('button');
                followBtn.className = 'profile-edit-btn';
                followBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span><span>Follow</span>';
                actionsContainer.appendChild(followBtn);
                
                // Add event listener to the follow button
                followBtn.addEventListener('click', async () => {
                    const isFollowing = followBtn.classList.contains('following');
                    
                    try {
                        // Get current user
                        const currentUser = firebase.auth().currentUser;
                        if (!currentUser) throw new Error('User not authenticated');
                        
                        // Get current following list
                        const userRef = firebase.database().ref(`users/${currentUser.uid}`);
                        const snapshot = await userRef.child('following').once('value');
                        let following = snapshot.val() || [];
                        
                        if (Array.isArray(following)) {
                            if (isFollowing) {
                                // Remove from following
                                following = following.filter(id => id !== profileUid);
                                
                                // Update UI
                                followBtn.classList.remove('following');
                                followBtn.innerHTML = '<span class="material-symbols-rounded">person_add</span><span>Follow</span>';
                            } else {
                                // Add to following
                                following.push(profileUid);
                                
                                // Update UI
                                followBtn.classList.add('following');
                                followBtn.innerHTML = '<span class="material-symbols-rounded">how_to_reg</span><span>Following</span>';
                            }
                        } else {
                            // Initialize as array if not already
                            following = isFollowing ? [] : [profileUid];
                        }
                        
                        // Update in database
                        await userRef.update({
                            following,
                            'stats/following': following.length,
                            updatedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                        
                    } catch (error) {
                        console.error('Error updating follow status:', error);
                        alert('Error updating follow status. Please try again.');
                    }
                });
            }
        }
    }

    // Load the user's posts
    async function loadProfilePosts(profileData, profileUid) {
        const postsContainer = document.querySelector('.profile-posts');
        if (!postsContainer) return;
        
        try {
            // Get posts from Firebase
            const postsSnapshot = await firebase.database().ref('posts').orderByChild('authorId').equalTo(profileUid).once('value');
            const posts = postsSnapshot.val();
            
            // Clear loading state
            hidePostsShimmer();
            
            // Mark as loaded
            postsContainer.setAttribute('data-loaded', 'true');
            
            if (!posts) {
                // Show empty state if no posts
                postsContainer.innerHTML = `
                    <div class="profile-empty-state">
                        <span class="material-symbols-rounded">article</span>
                        <h4>No posts yet</h4>
                        <p>${profileData.displayName || 'This user'} hasn't published any posts yet.</p>
                    </div>
                `;
                return;
            }
            
            // Sort posts by date (newest first)
            const sortedPosts = Object.entries(posts)
                .sort(([, a], [, b]) => b.createdAt - a.createdAt);
            
            // Add posts to the container
            sortedPosts.forEach(([postId, post]) => {
                const postDate = new Date(post.createdAt);
                const formattedDate = postDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
                
                const postCard = document.createElement('div');
                postCard.className = 'profile-post-card';
                postCard.innerHTML = `
                    <div class="profile-post-image" style="background-image: url('${post.coverImage || 'https://source.unsplash.com/random/300x200?abstract'}')"></div>
                    <div class="profile-post-content">
                        <h3 class="profile-post-title">${post.title}</h3>
                        <p class="profile-post-excerpt">${post.excerpt || post.content.substring(0, 150) + '...'}</p>
                        <div class="profile-post-meta">
                            <div class="profile-post-date">
                                <span class="material-symbols-rounded">calendar_today</span>
                                <span>${formattedDate}</span>
                            </div>
                            <div class="profile-post-stats">
                                <div class="profile-post-stat">
                                    <span class="material-symbols-rounded">thumb_up</span>
                                    <span>${post.likes || 0}</span>
                                </div>
                                <div class="profile-post-stat">
                                    <span class="material-symbols-rounded">comment</span>
                                    <span>${post.comments ? Object.keys(post.comments).length : 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add click event to navigate to post
                postCard.addEventListener('click', () => {
                    window.location.href = `post.html?id=${postId}`;
                });
                
                postsContainer.appendChild(postCard);
            });
            
        } catch (error) {
            console.error('Error loading posts:', error);
            hidePostsShimmer();
            
            // Mark as loaded
            postsContainer.setAttribute('data-loaded', 'true');
            
            postsContainer.innerHTML = `
                <div class="profile-empty-state">
                    <span class="material-symbols-rounded">error</span>
                    <h4>Something went wrong</h4>
                    <p>We couldn't load the posts. Please try again later.</p>
                </div>
            `;
        }
    }

    // Load the user's activity
    function loadProfileActivity(profileData) {
        const activityContainer = document.querySelector('.profile-activity-list');
        if (!activityContainer) return;
        
        // For now, show empty state (will be implemented in future)
        setTimeout(() => {
            hideActivityShimmer();
            
            // Mark as loaded
            activityContainer.setAttribute('data-loaded', 'true');
            
            activityContainer.innerHTML = `
                <div class="profile-empty-state">
                    <span class="material-symbols-rounded">history</span>
                    <h4>No recent activity</h4>
                    <p>Activity tracking will be available soon.</p>
                </div>
            `;
        }, 1000);
    }

    // Load the user's connections
    function loadProfileConnections(profileData) {
        const connectionsContainer = document.querySelector('.profile-connections-list');
        if (!connectionsContainer) return;
        
        // Load suggested users for the connections tab
        loadSuggestedUsers();
    }

    // Initialize full-screen image viewer
    function initImageViewer() {
        const profileAvatar = document.querySelector('.profile-avatar-container');
        const imageViewer = document.getElementById('image-viewer');
        const closeButton = document.getElementById('image-viewer-close');
        const fullscreenImage = document.getElementById('fullscreen-image');
        
        if (profileAvatar && imageViewer && closeButton) {
            // Open image viewer when clicking on profile avatar
            profileAvatar.addEventListener('click', () => {
                imageViewer.classList.add('active');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            });
            
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

    // Add this function to render verification badges
    function renderVerificationBadge(verificationType) {
        if (!verificationType) return '';
        
        let icon = '';
        let tooltip = '';
        
        switch (verificationType) {
            case 'verified':
                icon = 'verified';
                tooltip = 'Verified Account';
                break;
            case 'pro':
                icon = 'workspace_premium';
                tooltip = 'Pro Member';
                break;
            case 'admin':
                icon = 'admin_panel_settings';
                tooltip = 'Administrator';
                break;
            case 'developer':
                icon = 'code';
                tooltip = 'Developer';
                break;
            default:
                return '';
        }
        
        return `<span class="verification-badge" data-type="${verificationType}" data-tooltip="${tooltip}">
            <span class="material-symbols-rounded">${icon}</span>
        </span>`;
    }

    // Add this function to fetch and display real users for follow options
    async function loadSuggestedUsers() {
        try {
            const connectionsSection = document.querySelector('.profile-connections-list');
            if (!connectionsSection) return;
            
            // Get current user
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) return;
            
            // Get users from Firebase
            const usersSnapshot = await firebase.database().ref('users').limitToFirst(10).once('value');
            const users = usersSnapshot.val();
            
            // Hide shimmer
            hideConnectionsShimmer();
            
            // Mark as loaded
            connectionsSection.setAttribute('data-loaded', 'true');
            
            if (!users) {
                connectionsSection.innerHTML = '<div class="profile-empty-state"><span class="material-symbols-rounded">group_off</span><h4>No users found</h4><p>We couldn\'t find any users to suggest right now.</p></div>';
                return;
            }
            
            // Filter out current user and already followed users
            const currentUserData = await firebase.database().ref(`users/${currentUser.uid}`).once('value');
            const currentUserProfile = currentUserData.val();
            const followingList = currentUserProfile.following || [];
            
            // Clear loading state
            connectionsSection.innerHTML = '';
            
            // Add users to the connections list
            Object.entries(users).forEach(([uid, userData]) => {
                // Skip current user
                if (uid === currentUser.uid) return;
                
                // Check if already following
                const isFollowing = followingList.includes(uid);
                
                // Create connection card
                const connectionCard = document.createElement('div');
                connectionCard.className = 'profile-connection-card';
                connectionCard.innerHTML = `
                    <div class="profile-connection-avatar" style="background-image: url('${userData.photoURL || 'https://via.placeholder.com/150'}')"></div>
                    <div class="profile-connection-name">
                        ${userData.displayName || 'User'}
                        ${userData.verificationType ? renderVerificationBadge(userData.verificationType) : ''}
                    </div>
                    <p class="profile-connection-bio">${userData.bio || 'No bio available'}</p>
                    <button class="btn btn-sm ${isFollowing ? 'btn-outline following' : 'btn-primary'}" data-user-id="${uid}">
                        ${isFollowing ? 'Following' : 'Follow'}
                    </button>
                `;
                
                // Add follow/unfollow functionality
                const followButton = connectionCard.querySelector('button');
                followButton.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent card click
                    
                    try {
                        const isCurrentlyFollowing = followButton.classList.contains('following');
                        
                        // Update UI immediately for better UX
                        if (isCurrentlyFollowing) {
                            followButton.classList.remove('following', 'btn-outline');
                            followButton.classList.add('btn-primary');
                            followButton.textContent = 'Follow';
                        } else {
                            followButton.classList.add('following', 'btn-outline');
                            followButton.classList.remove('btn-primary');
                            followButton.textContent = 'Following';
                        }
                        
                        // Get current following list
                        const userRef = firebase.database().ref(`users/${currentUser.uid}`);
                        const snapshot = await userRef.child('following').once('value');
                        let following = snapshot.val() || [];
                        
                        if (Array.isArray(following)) {
                            if (isCurrentlyFollowing) {
                                // Remove from following
                                following = following.filter(id => id !== uid);
                            } else {
                                // Add to following
                                following.push(uid);
                            }
                        } else {
                            // Initialize as array if not already
                            following = isCurrentlyFollowing ? [] : [uid];
                        }
                        
                        // Update in database
                        await userRef.update({
                            following,
                            'stats/following': following.length,
                            updatedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                        
                    } catch (error) {
                        console.error('Error updating follow status:', error);
                        
                        // Revert UI on error
                        if (followButton.classList.contains('following')) {
                            followButton.classList.remove('following', 'btn-outline');
                            followButton.classList.add('btn-primary');
                            followButton.textContent = 'Follow';
                        } else {
                            followButton.classList.add('following', 'btn-outline');
                            followButton.classList.remove('btn-primary');
                            followButton.textContent = 'Following';
                        }
                        
                        alert('Error updating follow status. Please try again.');
                    }
                });
                
                // Add click event to navigate to user profile
                connectionCard.addEventListener('click', () => {
                    window.location.href = `profile.html?uid=${uid}`;
                });
                
                connectionsSection.appendChild(connectionCard);
            });
            
        } catch (error) {
            console.error('Error loading suggested users:', error);
            hideConnectionsShimmer();
            
            // Mark as loaded
            const connectionsSection = document.querySelector('.profile-connections-list');
            if (connectionsSection) {
                connectionsSection.setAttribute('data-loaded', 'true');
                connectionsSection.innerHTML = '<div class="profile-empty-state"><span class="material-symbols-rounded">error</span><h4>Something went wrong</h4><p>We couldn\'t load the suggested users. Please try again later.</p></div>';
            }
        }
    }
    
    // Shimmer loading effect functions
    function showProfileShimmer() {
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader) {
            profileHeader.classList.add('loading');
            
            // Add shimmer class to elements
            const elements = profileHeader.querySelectorAll('.profile-name, .profile-username, .profile-meta-item, .profile-bio');
            elements.forEach(el => el.classList.add('shimmer'));
        }
    }
    
    function hideProfileShimmer() {
        const profileHeader = document.querySelector('.profile-header');
        if (profileHeader) {
            profileHeader.classList.remove('loading');
            
            // Remove shimmer class from elements
            const elements = profileHeader.querySelectorAll('.shimmer');
            elements.forEach(el => el.classList.remove('shimmer'));
        }
    }
    
    function showPostsShimmer() {
        const postsContainer = document.querySelector('.profile-posts');
        if (postsContainer) {
            postsContainer.innerHTML = '';
            postsContainer.classList.add('loading');
            
            // Create shimmer posts
            for (let i = 0; i < 3; i++) {
                const shimmerPost = document.createElement('div');
                shimmerPost.className = 'shimmer-post shimmer';
                shimmerPost.innerHTML = `
                    <div class="shimmer-post-image shimmer"></div>
                    <div class="shimmer-post-content">
                        <div class="shimmer-post-title shimmer"></div>
                        <div class="shimmer-post-excerpt shimmer"></div>
                        <div class="shimmer-post-meta">
                            <div class="shimmer-post-date shimmer"></div>
                            <div class="shimmer-post-stats shimmer"></div>
                        </div>
                    </div>
                `;
                postsContainer.appendChild(shimmerPost);
            }
        }
    }
    
    function hidePostsShimmer() {
        const postsContainer = document.querySelector('.profile-posts');
        if (postsContainer) {
            postsContainer.classList.remove('loading');
            postsContainer.innerHTML = '';
        }
    }
    
    function showActivityShimmer() {
        const activityContainer = document.querySelector('.profile-activity-list');
        if (activityContainer) {
            activityContainer.innerHTML = '';
            activityContainer.classList.add('loading');
            
            // Create shimmer activities
            for (let i = 0; i < 5; i++) {
                const shimmerActivity = document.createElement('div');
                shimmerActivity.className = 'shimmer';
                shimmerActivity.style.height = '60px';
                shimmerActivity.style.marginBottom = '12px';
                activityContainer.appendChild(shimmerActivity);
            }
        }
    }
    
    function hideActivityShimmer() {
        const activityContainer = document.querySelector('.profile-activity-list');
        if (activityContainer) {
            activityContainer.classList.remove('loading');
            activityContainer.innerHTML = '';
        }
    }
    
    function showConnectionsShimmer() {
        const connectionsContainer = document.querySelector('.profile-connections-list');
        if (connectionsContainer) {
            connectionsContainer.innerHTML = '';
            connectionsContainer.classList.add('loading');
            
            // Create shimmer connections
            for (let i = 0; i < 6; i++) {
                const shimmerConnection = document.createElement('div');
                shimmerConnection.className = 'shimmer-connection shimmer';
                shimmerConnection.innerHTML = `
                    <div class="shimmer-connection-avatar shimmer"></div>
                    <div class="shimmer-connection-name shimmer"></div>
                    <div class="shimmer-connection-bio shimmer"></div>
                    <div class="shimmer-connection-button shimmer"></div>
                `;
                connectionsContainer.appendChild(shimmerConnection);
            }
        }
    }
    
    function hideConnectionsShimmer() {
        const connectionsContainer = document.querySelector('.profile-connections-list');
        if (connectionsContainer) {
            connectionsContainer.classList.remove('loading');
            connectionsContainer.innerHTML = '';
        }
    }

    // Call the initialization function
    initializeProfileView();
}); 