// Import Firebase functionality
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, query, orderByChild, limitToLast, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { firebaseConfig, getTopics, toggleTopicFollow, getUserFollowedTopics, suggestTopic, countUnreadNotifications, getUserProfile, getUserExperience } from './firebase-config.js';

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
    
    // Initialize app
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    
    // Initialize
    init();
    
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
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
                    <p>Loading topics...</p>
                </div>
            `;
        }
        
        // Fetch topics from Firebase
        const result = await getTopics();
        
        if (result.success) {
            allTopics = result.topics;
            filteredTopics = [...allTopics];
            
            // Sort topics
            sortTopics(currentSort);
            
            // Display topics
            displayTopics();
        } else {
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
        
        // Add event listeners
        addEventListeners();
    }
    
    function addEventListeners() {
        // Topic search
        if (topicSearch) {
            topicSearch.addEventListener('input', handleSearch);
        }
        
        // Sort select
        if (sortSelect) {
            sortSelect.addEventListener('change', handleSort);
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
        
        // Icon selection
        iconOptions.forEach(option => {
            option.addEventListener('click', () => {
                iconOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                selectedIcon = option.getAttribute('data-icon');
            });
        });
        
        // Pagination
        paginationBtns.forEach(btn => {
            if (!btn.disabled) {
                if (btn.textContent.includes('chevron_left')) {
                    btn.addEventListener('click', () => {
                        if (currentPage > 1) {
                            currentPage--;
                            updatePaginationUI();
                            displayTopics();
                        }
                    });
                } else if (btn.textContent.includes('chevron_right')) {
                    btn.addEventListener('click', () => {
                        const maxPage = Math.ceil(filteredTopics.length / TOPICS_PER_PAGE);
                        if (currentPage < maxPage) {
                            currentPage++;
                            updatePaginationUI();
                            displayTopics();
                        }
                    });
                } else {
                    btn.addEventListener('click', () => {
                        currentPage = parseInt(btn.textContent);
                        updatePaginationUI();
                        displayTopics();
                    });
                }
            }
        });
        
        // Topic actions delegated event listener
        if (topicsList) {
            topicsList.addEventListener('click', (e) => {
                // Follow/unfollow buttons
                const followBtn = e.target.closest('.follow-btn');
                if (followBtn) {
                    handleFollow(followBtn);
                }
                
                // View discussions button
                const viewBtn = e.target.closest('.view-discussions-btn');
                if (viewBtn) {
                    const topicId = viewBtn.getAttribute('data-topic');
                    if (topicId) {
                        window.location.href = `explore.html?topic=${topicId}`;
                    }
                }
            });
        }
    }
    
    // Handle topic search
    function handleSearch() {
        const query = topicSearch.value.trim().toLowerCase();
        
        if (query === '') {
            // Reset to original topics
            filteredTopics = [...allTopics];
        } else {
            // Filter topics by name or description
            filteredTopics = allTopics.filter(topic => 
                topic.name.toLowerCase().includes(query) || 
                topic.description.toLowerCase().includes(query)
            );
        }
        
        // Reset to first page
        currentPage = 1;
        updatePaginationUI();
        
        // Sort and display
        sortTopics(currentSort);
        displayTopics();
    }
    
    // Handle sort change
    function handleSort() {
        const sortBy = sortSelect.value;
        currentSort = sortBy;
        sortTopics(sortBy);
        displayTopics();
    }
    
    // Sort topics based on selected sort option
    function sortTopics(sortBy) {
        switch(sortBy) {
            case 'popular':
                filteredTopics.sort((a, b) => b.followers - a.followers);
                break;
            case 'newest':
                filteredTopics.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'posts':
                filteredTopics.sort((a, b) => b.discussionCount - a.discussionCount);
                break;
            case 'alphabetical':
                filteredTopics.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default:
                filteredTopics.sort((a, b) => b.followers - a.followers);
        }
    }
    
    // Display topics in the UI
    function displayTopics() {
        if (!topicsList) return;
        
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
            const isFeatured = index === 0 && currentPage === 1 && topic.featured;
            
            html += `
                <div class="topic-item ${isFeatured ? 'featured-topic' : ''}">
                    <div class="topic-icon ${topic.id}-icon">
                        <span class="material-symbols-rounded">${topic.icon}</span>
                    </div>
                    <div class="topic-details">
                        <div class="topic-header">
                            <h${isFeatured ? '2' : '3'}>${topic.name}</h${isFeatured ? '2' : '3'}>
                            <button class="btn btn-outline follow-btn ${isFollowing ? 'followed' : ''}" data-topic="${topic.id}">
                                <span class="material-symbols-rounded">${isFollowing ? 'check' : 'add'}</span>
                                ${isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        <p class="topic-description">${topic.description}</p>
                        <div class="topic-stats">
                            <div class="stat">
                                <span class="material-symbols-rounded">forum</span>
                                <span>${topic.discussionCount} Discussions</span>
                            </div>
                            <div class="stat">
                                <span class="material-symbols-rounded">groups</span>
                                <span>${formatNumber(topic.followers)} Followers</span>
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
    
    // Update pagination UI
    function updatePaginationUI() {
        const paginationContainer = document.querySelector('.topics-pagination');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(filteredTopics.length / TOPICS_PER_PAGE);
        
        // Clear existing buttons
        paginationContainer.innerHTML = '';
        
        // Don't show pagination if only one page
        if (totalPages <= 1) return;
        
        // Add previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.disabled = currentPage === 1;
        prevBtn.innerHTML = '<span class="material-symbols-rounded">chevron_left</span>';
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updatePaginationUI();
                displayTopics();
            }
        });
        paginationContainer.appendChild(prevBtn);
        
        // Add page buttons
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        // Adjust startPage if we're near the end
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // First page
        if (startPage > 1) {
            const firstBtn = document.createElement('button');
            firstBtn.className = 'pagination-btn';
            firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => {
                currentPage = 1;
                updatePaginationUI();
                displayTopics();
            });
            paginationContainer.appendChild(firstBtn);
            
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i.toString();
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                updatePaginationUI();
                displayTopics();
            });
            paginationContainer.appendChild(pageBtn);
        }
        
        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            
            const lastBtn = document.createElement('button');
            lastBtn.className = 'pagination-btn';
            lastBtn.textContent = totalPages.toString();
            lastBtn.addEventListener('click', () => {
                currentPage = totalPages;
                updatePaginationUI();
                displayTopics();
            });
            paginationContainer.appendChild(lastBtn);
        }
        
        // Add next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.innerHTML = '<span class="material-symbols-rounded">chevron_right</span>';
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                updatePaginationUI();
                displayTopics();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }
    
    // Format numbers for display (e.g. 1200 -> 1.2K)
    function formatNumber(num) {
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
        
        // Disable button and show loading state
        button.disabled = true;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="loading-spinner"></span>';
        
        const result = await toggleTopicFollow(topicId, currentUser.uid);
        
        if (result.success) {
            // Update button state
            const isFollowing = result.following;
            
            if (isFollowing) {
                button.classList.add('followed');
                button.innerHTML = `<span class="material-symbols-rounded">check</span> Following`;
                // Add to user followed topics
                if (!userFollowedTopics.includes(topicId)) {
                    userFollowedTopics.push(topicId);
                }
            } else {
                button.classList.remove('followed');
                button.innerHTML = `<span class="material-symbols-rounded">add</span> Follow`;
                // Remove from user followed topics
                userFollowedTopics = userFollowedTopics.filter(id => id !== topicId);
            }
            
            // Update topic follower count in the UI
            const topic = allTopics.find(t => t.id === topicId);
            if (topic) {
                topic.followers += isFollowing ? 1 : -1;
                
                // Update the follower count in the UI
                const followersStat = button.closest('.topic-item').querySelector('.stat:nth-child(2) span:last-child');
                if (followersStat) {
                    followersStat.textContent = formatNumber(topic.followers) + ' Followers';
                }
            }
        } else {
            // Restore original button state
            button.innerHTML = originalText;
            // Show error
            alert('Failed to update following status. Please try again.');
        }
        
        button.disabled = false;
    }
    
    // Open modal
    function openModal() {
        if (!currentUser) {
            // Redirect to sign in page if not logged in
            window.location.href = `signin.html?redirect=topics.html`;
            return;
        }
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    
    // Close modal
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable scrolling
        
        // Reset form
        document.getElementById('topic-name').value = '';
        document.getElementById('topic-description').value = '';
        iconOptions.forEach(option => option.classList.remove('selected'));
        selectedIcon = null;
    }
    
    // Handle suggest topic submission
    async function handleSuggestTopic() {
        if (!currentUser) {
            // Redirect to sign in page if not logged in
            window.location.href = `signin.html?redirect=topics.html`;
            return;
        }
        
        const topicName = document.getElementById('topic-name').value.trim();
        const topicDescription = document.getElementById('topic-description').value.trim();
        
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
        
        // Disable button and show loading state
        const submitBtn = document.querySelector('.suggest-topic');
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<span class="loading-spinner"></span> Submitting...';
        
        // Submit suggestion
        const result = await suggestTopic(currentUser.uid, {
            name: topicName,
            description: topicDescription,
            icon: selectedIcon
        });
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        
        if (result.success) {
            // Show success message
            alert(`Thank you for suggesting the topic "${topicName}". Our moderators will review it.`);
            
            // Close modal
            closeModal();
        } else {
            // Show error
            alert(`Failed to submit topic suggestion: ${result.error}`);
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
    
    // Update user experience UI
    async function updateUserExperienceUI(userId) {
        if (!userId) return;
        
        try {
            const result = await getUserExperience(userId);
            
            if (result.success) {
                const { level, title, exp, nextLevelExp, expToNextLevel } = result;
                
                // Update UI with level and exp
                const profileButton = document.querySelector('.profile-btn');
                if (profileButton) {
                    const levelUI = document.createElement('div');
                    levelUI.className = 'level-indicator';
                    levelUI.innerHTML = `
                        <span class="level-tag">Lv ${level}</span>
                    `;
                    
                    // Add level indicator to profile button
                    profileButton.appendChild(levelUI);
                }
            }
        } catch (error) {
            console.error('Error updating user experience UI:', error);
        }
    }
    
    // Update UI based on auth state
    async function updateAuthUI(user) {
        if (!loginBtn || !signupBtn) return;
        
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
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
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (profileBtn) profileBtn.style.display = 'none';
            
            // Hide notification badge
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
        }
    }
}); 