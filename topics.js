// Import Firebase functionality
import { 
    getTopics, 
    toggleTopicFollow, 
    getUserFollowedTopics, 
    suggestTopic, 
    countUnreadNotifications, 
    getUserProfile, 
    getUserExperience,
    database,
    ref,
    get,
    onAuthStateChanged,
    onValue
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const topicsList = document.querySelector('.topics-list');
    const topicSearch = document.getElementById('topic-search');
    const sortSelect = document.getElementById('sort-select');
    const suggestTopicBtn = document.querySelector('.suggest-topic-btn');
    const modal = document.getElementById('suggest-topic-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelTopicBtn = document.querySelector('.cancel-topic');
    const suggestTopicSubmitBtn = document.querySelector('.suggest-topic');
    const iconOptions = document.querySelectorAll('.icon-option');
    const paginationBtns = document.querySelectorAll('.pagination-btn');
    const notificationBadge = document.querySelector('.notification-badge');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    
    // State
    let currentUser = null;
    let allTopics = [];
    let filteredTopics = [];
    let selectedIcon = null;
    let currentSort = 'popular';
    let userFollowedTopics = [];
    let currentPage = 1;
    const TOPICS_PER_PAGE = 8;
    let searchTimeout;
    
    // Initialize
    init();
    
    // Set up auth state listener
    onAuthStateChanged((user) => {
        currentUser = user;
        updateAuthUI(user);
        
        if (user) {
            // Fetch user followed topics
            getUserFollowedTopics(user.uid).then(result => {
                if (result.success) {
                    userFollowedTopics = result.topics;
                    displayTopics();
                }
            });
            
            // Update notification badge
            updateNotificationBadge();
            
            // Display user experience level
            updateUserExperienceUI(user.uid);
        } else {
            userFollowedTopics = [];
            displayTopics();
        }
    });
    
    // Functions
    async function init() {
        // Show loading state
        if (topicsList) {
            topicsList.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>Loading topics from database...</p>
                </div>
            `;
        }
        
        // Fetch topics from Firebase
        try {
            console.log('Fetching topics from database...');
            const result = await getTopics();
            
            if (result.success) {
                console.log(`Topics fetched: ${result.topics.length} topics found`);
                
                // Display topic numbers in console for debugging
                if (result.topics.length > 0) {
                    console.table(result.topics.map(t => ({
                        id: t.id, 
                        name: t.name,
                        followers: t.followers || 0,
                        discussions: t.discussionCount || 0
                    })));
                }
                
                allTopics = result.topics;
                filteredTopics = [...allTopics];
                
                // Sort topics by the default sort option
                sortTopics(currentSort);
                
                // Display topics
                displayTopics();
                
                // Set up real-time listener for topic changes
                setupTopicListener();
            } else {
                console.error('Failed to fetch topics:', result.error);
                if (topicsList) {
                    topicsList.innerHTML = `
                        <div class="error-state">
                            <span class="material-symbols-rounded">error</span>
                            <p>Failed to load topics. Please try again later.</p>
                            <button class="btn btn-primary retry-btn">Retry</button>
                        </div>
                    `;
                    
                    const retryBtn = topicsList.querySelector('.retry-btn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', init);
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing topics:', error);
            if (topicsList) {
                topicsList.innerHTML = `
                    <div class="error-state">
                        <span class="material-symbols-rounded">error</span>
                        <p>An error occurred. Please try again later.</p>
                        <button class="btn btn-primary retry-btn">Retry</button>
                    </div>
                `;
                
                const retryBtn = topicsList.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', init);
                }
            }
        }
        
        // Add event listeners
        addEventListeners();
    }
    
    // Set up real-time listener for topic changes
    function setupTopicListener() {
        const topicsRef = ref(database, 'topics');
        onValue(topicsRef, (snapshot) => {
            if (snapshot.exists()) {
                const updatedTopics = [];
                snapshot.forEach(child => {
                    updatedTopics.push({
                        id: child.key,
                        ...child.val()
                    });
                });
                
                // Only update if there are actual changes
                if (JSON.stringify(updatedTopics) !== JSON.stringify(allTopics)) {
                    console.log('Topics updated in real-time');
                    allTopics = updatedTopics;
                    
                    // Reapply current filter and sort
                    if (topicSearch && topicSearch.value.trim() !== '') {
                        handleSearch();
                    } else {
                        filteredTopics = [...allTopics];
                        sortTopics(currentSort);
                        displayTopics();
                    }
                }
            }
        }, (error) => {
            console.error('Error in topic listener:', error);
        });
    }
    
    function addEventListeners() {
        // Topic search
        if (topicSearch) {
            topicSearch.addEventListener('input', function() {
                if (searchTimeout) clearTimeout(searchTimeout);
                searchTimeout = setTimeout(handleSearch, 300);
            });
        }
        
        // Sort select
        if (sortSelect) {
            sortSelect.addEventListener('change', handleSortChange);
        }
        
        // Modal events
        if (suggestTopicBtn) {
            suggestTopicBtn.addEventListener('click', openModal);
        }
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closeModal);
        }
        
        if (cancelTopicBtn) {
            cancelTopicBtn.addEventListener('click', closeModal);
        }
        
        if (suggestTopicSubmitBtn) {
            suggestTopicSubmitBtn.addEventListener('click', handleSuggestTopic);
        }
        
        // Close modal when clicking outside content
        if (modal) {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeModal();
                }
            });
        }
        
        // Icon selection
        if (iconOptions) {
            iconOptions.forEach(option => {
                option.addEventListener('click', () => {
                    iconOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedIcon = option.getAttribute('data-icon');
                });
            });
        }
        
        // Topic actions delegated event listener
        if (topicsList) {
            topicsList.addEventListener('click', (e) => {
                // Follow/unfollow buttons
                const followBtn = e.target.closest('.follow-btn');
                if (followBtn) {
                    e.preventDefault();
                    handleFollow(followBtn);
                    return;
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', e => {
            // Close modal with Escape key
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeModal();
            }
        });
    }
    
    // Handle topic search
    function handleSearch() {
        const query = topicSearch.value.trim().toLowerCase();
        
        if (query === '') {
            // Reset to all topics
            filteredTopics = [...allTopics];
        } else {
            // Filter topics by name, description
            filteredTopics = allTopics.filter(topic => 
                topic.name.toLowerCase().includes(query) || 
                (topic.description && topic.description.toLowerCase().includes(query))
            );
        }
        
        // Reset to first page
        currentPage = 1;
        
        // Apply current sort
        sortTopics(currentSort);
        
        // Display filtered topics
        displayTopics();
    }
    
    // Handle sort select change
    function handleSortChange() {
        const sortBy = document.getElementById('sort-select').value;
        console.log('Sorting by:', sortBy);
        
        // Sort all topics based on selection
        switch (sortBy) {
            case 'popular':
                filteredTopics.sort((a, b) => (b.followers || 0) - (a.followers || 0));
                break;
            case 'active':
                filteredTopics.sort((a, b) => (b.discussionCount || 0) - (a.discussionCount || 0));
                break;
            case 'newest':
                filteredTopics.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                    return dateB - dateA;
                });
                break;
            case 'alphabetical':
                filteredTopics.sort((a, b) => {
                    const nameA = a.name ? a.name.toLowerCase() : '';
                    const nameB = b.name ? b.name.toLowerCase() : '';
                    return nameA.localeCompare(nameB);
                });
                break;
        }
        
        // Reset to first page when sorting changes
        currentPage = 1;
        updatePagination();
        
        // Display the sorted topics
        displayTopics();
    }
    
    // Sort topics based on criteria
    function sortTopics(sortBy) {
        console.log('Sorting topics by:', sortBy);
        
        switch (sortBy) {
            case 'popular':
                // Sort by number of followers (descending)
                filteredTopics.sort((a, b) => (b.followers || 0) - (a.followers || 0));
                break;
                
            case 'newest':
                // Sort by creation date (descending)
                filteredTopics.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                break;
                
            case 'posts':
                // Sort by number of posts (descending)
                filteredTopics.sort((a, b) => (b.discussionCount || 0) - (a.discussionCount || 0));
                break;
                
            case 'alphabetical':
                // Sort alphabetically by name
                filteredTopics.sort((a, b) => a.name.localeCompare(b.name));
                break;
        }
    }
    
    // Display topics in the UI
    function displayTopics() {
        if (!topicsList) return;
        
        console.log('Displaying topics. Total:', filteredTopics.length);
        
        // Calculate pagination
        const startIndex = (currentPage - 1) * TOPICS_PER_PAGE;
        const endIndex = startIndex + TOPICS_PER_PAGE;
        const currentPageTopics = filteredTopics.slice(startIndex, endIndex);
        
        // Update pagination UI
        updatePaginationUI();
        
        // Empty message if no topics match filter
        if (currentPageTopics.length === 0) {
            topicsList.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">search_off</span>
                    <p>No topics match your search.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        // Add topics
        currentPageTopics.forEach((topic, index) => {
            const isFollowing = userFollowedTopics.includes(topic.id);
            const isFeatured = index === 0 && currentPage === 1;
            
            // Generate random class color if not assigned
            const topicColorClass = topic.colorClass || getTopicColorClass(topic.id);
            const topicIcon = topic.icon || 'topic';
            
            // Format stats with real numbers
            const formattedFollowers = formatNumber(topic.followers || 0);
            const formattedDiscussions = formatNumber(topic.discussionCount || 0);
            
            // Get creation date in readable format
            const createdDate = topic.createdAt ? new Date(topic.createdAt).toLocaleDateString() : 'Unknown date';
            
            html += `
                <div class="topic-item ${isFeatured ? 'featured-topic' : ''}" data-id="${topic.id}">
                    <div class="topic-icon ${topicColorClass}">
                        <span class="material-symbols-rounded">${topicIcon}</span>
                    </div>
                    <div class="topic-details">
                        <div class="topic-header">
                            <h${isFeatured ? '2' : '3'}>${topic.name || 'Unnamed Topic'}</h${isFeatured ? '2' : '3'}>
                            <button class="btn btn-outline follow-btn ${isFollowing ? 'followed' : ''}" data-topic="${topic.id}">
                                <span class="material-symbols-rounded">${isFollowing ? 'check' : 'add'}</span>
                                ${isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        <p class="topic-description">${topic.description || 'No description available.'}</p>
                        <div class="topic-stats">
                            <div class="stat">
                                <span class="material-symbols-rounded">forum</span>
                                <span>${formattedDiscussions} Discussions</span>
                            </div>
                            <div class="stat">
                                <span class="material-symbols-rounded">groups</span>
                                <span>${formattedFollowers} Followers</span>
                            </div>
                            <div class="stat created-date">
                                <span class="material-symbols-rounded">calendar_today</span>
                                <span>Created: ${createdDate}</span>
                            </div>
                            <div class="topic-action">
                                <a href="explore.html?topic=${topic.id}" class="btn btn-primary view-discussions-btn" data-topic="${topic.id}">
                                    View Discussions
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        topicsList.innerHTML = html;
    }
    
    // Generate consistent color class for a topic based on its ID
    function getTopicColorClass(topicId) {
        // List of predefined color classes
        const colorClasses = [
            'philosophy-icon', 'science-icon', 'literature-icon', 
            'current-affairs-icon', 'religion-icon', 'arts-icon', 
            'music-icon', 'technology-icon', 'history-icon',
            'psychology-icon', 'politics-icon', 'environment-icon'
        ];
        
        // Use the topic ID to consistently select a color class
        const hash = topicId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colorClasses[hash % colorClasses.length];
    }
    
    // Alias for updatePaginationUI for backward compatibility
    function updatePagination() {
        return updatePaginationUI();
    }
    
    // Update pagination UI
    function updatePaginationUI() {
        const paginationContainer = document.querySelector('.topics-pagination');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(filteredTopics.length / TOPICS_PER_PAGE);
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button class="pagination-btn prev ${currentPage === 1 ? 'disabled' : ''}" ${currentPage === 1 ? 'disabled' : ''}>
                <span class="material-symbols-rounded">chevron_left</span>
            </button>
        `;
        
        // Page numbers
        if (totalPages <= 5) {
            // Show all pages if 5 or fewer
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <button class="pagination-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `;
            }
        } else {
            // Show first page
            paginationHTML += `
                <button class="pagination-btn ${currentPage === 1 ? 'active' : ''}" data-page="1">
                    1
                </button>
            `;
            
            // Show ellipsis if current page is > 3
            if (currentPage > 3) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            
            // Show pages around current page
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                if (i === 1 || i === totalPages) continue; // Skip first and last pages as they're handled separately
                paginationHTML += `
                    <button class="pagination-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                        ${i}
                    </button>
                `;
            }
            
            // Show ellipsis if current page is < totalPages - 2
            if (currentPage < totalPages - 2) {
                paginationHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            
            // Show last page
            if (totalPages > 1) {
                paginationHTML += `
                    <button class="pagination-btn ${currentPage === totalPages ? 'active' : ''}" data-page="${totalPages}">
                        ${totalPages}
                    </button>
                `;
            }
        }
        
        // Next button
        paginationHTML += `
            <button class="pagination-btn next ${currentPage === totalPages ? 'disabled' : ''}" ${currentPage === totalPages ? 'disabled' : ''}>
                <span class="material-symbols-rounded">chevron_right</span>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
        
        // Add event listeners to new pagination buttons
        const pageButtons = paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)');
        pageButtons.forEach(btn => {
            if (btn.classList.contains('prev')) {
                btn.addEventListener('click', () => {
                    currentPage--;
                    updatePaginationUI();
                    displayTopics();
                });
            } else if (btn.classList.contains('next')) {
                btn.addEventListener('click', () => {
                    currentPage++;
                    updatePaginationUI();
                    displayTopics();
                });
            } else {
                const page = parseInt(btn.getAttribute('data-page'));
                if (page) {
                    btn.addEventListener('click', () => {
                        currentPage = page;
                        updatePaginationUI();
                        displayTopics();
                    });
                }
            }
        });
    }
    
    // Format numbers for display (adds K, M for thousands/millions)
    function formatNumber(num) {
        if (!num && num !== 0) return '0';
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    }
    
    // Handle follow/unfollow topic
    async function handleFollow(button) {
        if (!currentUser) {
            // Redirect to sign in page if not logged in
            window.location.href = `signin.html?redirect=topics.html`;
            return;
        }
        
        const topicId = button.getAttribute('data-topic');
        if (!topicId) return;
        
        // Get topic data before updating
        const topic = allTopics.find(t => t.id === topicId);
        if (!topic) {
            console.error('Topic not found:', topicId);
            return;
        }
        
        const isCurrentlyFollowing = userFollowedTopics.includes(topicId);
        
        // Cache original button state for error recovery
        const originalHTML = button.innerHTML;
        const wasFollowing = button.classList.contains('followed');
        
        // Immediately update UI optimistically
        if (wasFollowing) {
            // Unfollow action
            button.classList.remove('followed');
            button.innerHTML = `<span class="material-symbols-rounded">add</span> Follow`;
            
            // Optimistically update follower count
            const followersStat = button.closest('.topic-item').querySelector('.stat:nth-child(2) span:last-child');
            if (followersStat && topic.followers > 0) {
                const newCount = topic.followers - 1;
                followersStat.textContent = `${formatNumber(newCount)} Followers`;
            }
        } else {
            // Follow action
            button.classList.add('followed');
            button.innerHTML = `<span class="material-symbols-rounded">check</span> Following`;
            
            // Optimistically update follower count
            const followersStat = button.closest('.topic-item').querySelector('.stat:nth-child(2) span:last-child');
            if (followersStat) {
                const newCount = (topic.followers || 0) + 1;
                followersStat.textContent = `${formatNumber(newCount)} Followers`;
            }
        }
        
        // Disable button while API call is in progress
        button.disabled = true;
        
        try {
            console.log(`${wasFollowing ? 'Unfollowing' : 'Following'} topic:`, topicId);
            const result = await toggleTopicFollow(topicId, currentUser.uid);
            
            if (result.success) {
                // Update successful - update our local state
                if (result.following) {
                    // Successfully followed
                    if (!userFollowedTopics.includes(topicId)) {
                        userFollowedTopics.push(topicId);
                    }
                    console.log('Now following topic:', topicId);
                } else {
                    // Successfully unfollowed
                    userFollowedTopics = userFollowedTopics.filter(id => id !== topicId);
                    console.log('Unfollowed topic:', topicId);
                }
            } else {
                // Update failed - revert UI
                console.error('Failed to toggle topic follow:', result.error);
                
                // Restore original button state
                button.innerHTML = originalHTML;
                if (wasFollowing) {
                    button.classList.add('followed');
                } else {
                    button.classList.remove('followed');
                }
                
                // Restore follower count
                const followersStat = button.closest('.topic-item').querySelector('.stat:nth-child(2) span:last-child');
                if (followersStat) {
                    followersStat.textContent = `${formatNumber(topic.followers)} Followers`;
                }
                
                // Show error
                alert('Failed to update following status. Please try again.');
            }
        } catch (error) {
            console.error('Error following topic:', error);
            
            // Restore original button state
            button.innerHTML = originalHTML;
            if (wasFollowing) {
                button.classList.add('followed');
            } else {
                button.classList.remove('followed');
            }
            
            // Restore follower count
            const followersStat = button.closest('.topic-item').querySelector('.stat:nth-child(2) span:last-child');
            if (followersStat) {
                followersStat.textContent = `${formatNumber(topic.followers)} Followers`;
            }
            
            alert('An error occurred. Please try again.');
        } finally {
            button.disabled = false;
        }
    }
    
    // Open modal for suggesting topic
    function openModal() {
        if (!currentUser) {
            // Redirect to sign in page if not logged in
            window.location.href = `signin.html?redirect=topics.html`;
            return;
        }
        
        if (modal) {
            modal.classList.add('active');
            
            // Reset form
            const topicNameInput = document.getElementById('topic-name');
            const topicDescriptionInput = document.getElementById('topic-description');
            
            if (topicNameInput) topicNameInput.value = '';
            if (topicDescriptionInput) topicDescriptionInput.value = '';
            
            // Reset icon selection
            selectedIcon = null;
            iconOptions.forEach(option => option.classList.remove('selected'));
        }
    }
    
    // Close modal
    function closeModal() {
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // Handle suggest topic submission
    async function handleSuggestTopic() {
        if (!currentUser) {
            // Redirect to sign in page if not logged in
            window.location.href = `signin.html?redirect=topics.html`;
            return;
        }
        
        // Get form data
        const topicNameInput = document.getElementById('topic-name');
        const topicDescriptionInput = document.getElementById('topic-description');
        
        const topicName = topicNameInput?.value?.trim();
        const topicDescription = topicDescriptionInput?.value?.trim();
        
        // Validate form
        if (!topicName) {
            alert('Please enter a topic name');
            return;
        }
        
        if (!topicDescription) {
            alert('Please enter a topic description');
            return;
        }
        
        if (!selectedIcon) {
            alert('Please select an icon');
            return;
        }
        
        // Disable submit button and show loading state
        suggestTopicSubmitBtn.disabled = true;
        const originalText = suggestTopicSubmitBtn.innerHTML;
        suggestTopicSubmitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        
        try {
            // Create topic data
            const topicData = {
                name: topicName,
                description: topicDescription,
                icon: selectedIcon,
                createdAt: Date.now(),
                followers: 0,
                discussionCount: 0
            };
            
            console.log('Suggesting topic:', topicData);
            
            // Send to Firebase
            const result = await suggestTopic(currentUser.uid, topicData);
            
            if (result.success) {
                // Close modal
                closeModal();
                
                // Show success message
                alert('Thank you for your suggestion! Our team will review it shortly.');
                
                // Reset form
                if (topicNameInput) topicNameInput.value = '';
                if (topicDescriptionInput) topicDescriptionInput.value = '';
                selectedIcon = null;
                iconOptions.forEach(opt => opt.classList.remove('selected'));
            } else {
                alert('Failed to submit topic suggestion. Please try again.');
            }
        } catch (error) {
            console.error('Error suggesting topic:', error);
            alert('An error occurred. Please try again.');
        } finally {
            // Reset button
            suggestTopicSubmitBtn.disabled = false;
            suggestTopicSubmitBtn.innerHTML = originalText;
        }
    }
    
    // Update notification badge count
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
    
    // Update user experience level UI
    async function updateUserExperienceUI(userId) {
        if (!profileBtn) return;
        
        try {
            const result = await getUserExperience(userId);
            
            if (result.success) {
                const { experience, level, nextLevel } = result;
                
                // Add level indicator to profile button if it doesn't exist
                if (!profileBtn.querySelector('.user-level-badge')) {
                    const levelBadge = document.createElement('div');
                    levelBadge.className = 'user-level-badge';
                    levelBadge.innerHTML = `<span>${level}</span>`;
                    profileBtn.appendChild(levelBadge);
                } else {
                    // Update existing level badge
                    const levelBadge = profileBtn.querySelector('.user-level-badge span');
                    if (levelBadge) {
                        levelBadge.textContent = level;
                    }
                }
            }
        } catch (error) {
            console.error('Error updating user experience UI:', error);
        }
    }
    
    // Update auth UI based on user state
    async function updateAuthUI(user) {
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                const username = profileBtn.querySelector('.username');
                const avatar = profileBtn.querySelector('.avatar');
                
                if (username) {
                    username.textContent = user.displayName || 'User';
                }
                
                if (avatar) {
                    try {
                        const result = await getUserProfile(user.uid);
                        if (result.success && result.profile) {
                            if (result.profile.avatarUrl) {
                                avatar.style.backgroundImage = `url('${result.profile.avatarUrl}')`;
                            }
                            
                            if (username && result.profile.displayName) {
                                username.textContent = result.profile.displayName;
                            }
                        }
                    } catch (error) {
                        console.error('Error loading user profile:', error);
                    }
                }
            }
        } else {
            // User is signed out
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (profileBtn) profileBtn.style.display = 'none';
        }
    }
}); 