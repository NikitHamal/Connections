import { getRecentThreads, onAuthStateChange, getCurrentUserId, getUserProfile } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function() {
    const threadsContainer = document.querySelector('.discussion-threads');
    const loadMoreButton = document.querySelector('.load-more button');
    const searchInput = document.querySelector('.search-bar input');
    
    let lastThreadTimestamp = null;
    let hasMoreThreads = false;
    let isLoading = false;
    let searchTimeout = null;
    let currentUser = null;
    
    // Initialize
    initializeApp();
    
    // Set up auth listener
    onAuthStateChange((user) => {
        currentUser = user;
        updateAuthUI(user);
    });
    
    // Set up search functionality
    searchInput.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(handleSearch, 500);
    });
    
    // Load more button functionality
    loadMoreButton.addEventListener('click', handleLoadMore);
    
    async function initializeApp() {
        await loadThreads();
    }
    
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query === '') {
            // Reset to default view
            loadThreads();
            return;
        }
        
        isLoading = true;
        // Show loading state
        showLoading();
        
        // Send search request to backend
        searchThreads(query)
            .then(({ threads }) => {
                if (threads.length === 0) {
                    showNoThreadsMessage('No discussions found for "' + query + '"');
                } else {
                    displayThreads(threads);
                }
            })
            .catch((error) => {
                console.error('Error searching discussions:', error);
                showError('Failed to search discussions. Please try again.');
            })
            .finally(() => {
                isLoading = false;
                loadMoreButton.style.display = 'none'; // Hide load more for search results
            });
    }
    
    async function searchThreads(query) {
        // This is just a simple client-side search implementation
        // In a real app, you would have a server-side search endpoint
        try {
            const result = await getRecentThreads(50); // Get a larger batch for client-side filtering
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            const filteredThreads = result.threads.filter(thread => {
                return (
                    thread.title?.toLowerCase().includes(query) ||
                    thread.content?.toLowerCase().includes(query) ||
                    thread.topic?.toLowerCase().includes(query) ||
                    thread.authorName?.toLowerCase().includes(query)
                );
            });
            
            return { threads: filteredThreads };
        } catch (error) {
            console.error('Search error:', error);
            return { threads: [] };
        }
    }
    
    async function handleLoadMore() {
        const loadMoreButton = document.querySelector('.load-more button');
        if (!loadMoreButton || loadMoreButton.disabled) return;
        
        loadMoreButton.disabled = true;
        loadMoreButton.innerHTML = '<span class="loading-spinner"></span> Loading...';
        
        try {
            // Get the timestamp of the last thread in the list
            const threads = document.querySelectorAll('.discussion-thread:not(.loading)');
            if (threads.length === 0) return;
            
            // Get the last thread's timestamp from its data attribute
            const lastThread = threads[threads.length - 1];
            const lastThreadId = lastThread.querySelector('.thread-title').getAttribute('href').split('=')[1];
            
            // Find the thread in the DOM to get its creation timestamp
            const threadElements = document.querySelectorAll('.discussion-thread');
            let lastTimestamp = null;
            
            // Loop through all threads to find the last one's timestamp
            for (const threadEl of threadElements) {
                const threadLink = threadEl.querySelector('.thread-title');
                if (threadLink && threadLink.getAttribute('href').includes(lastThreadId)) {
                    // Get the timestamp from the date element
                    const dateText = threadEl.querySelector('.thread-date').textContent;
                    // Convert relative date back to timestamp (approximate)
                    const now = new Date();
                    if (dateText.includes('minute')) {
                        const minutes = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (minutes * 60 * 1000);
                    } else if (dateText.includes('hour')) {
                        const hours = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (hours * 60 * 60 * 1000);
                    } else if (dateText.includes('day')) {
                        const days = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (days * 24 * 60 * 60 * 1000);
                    } else if (dateText.includes('week')) {
                        const weeks = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (weeks * 7 * 24 * 60 * 60 * 1000);
                    } else if (dateText.includes('month')) {
                        const months = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (months * 30 * 24 * 60 * 60 * 1000);
                    } else if (dateText.includes('year')) {
                        const years = parseInt(dateText.match(/\d+/)[0]) || 1;
                        lastTimestamp = now.getTime() - (years * 365 * 24 * 60 * 60 * 1000);
                    } else if (dateText === 'Just now') {
                        lastTimestamp = now.getTime() - 60000; // 1 minute ago
                    } else {
                        // Default to 1 day ago if we can't parse
                        lastTimestamp = now.getTime() - (24 * 60 * 60 * 1000);
                    }
                    break;
                }
            }
            
            // If we couldn't determine the timestamp, use a default
            if (!lastTimestamp) {
                lastTimestamp = Date.now() - (24 * 60 * 60 * 1000); // 1 day ago
            }
            
            // Load more threads
            const moreThreads = await loadThreads(lastTimestamp);
            
            // Update button state based on results
            loadMoreButton.disabled = moreThreads.length === 0;
            loadMoreButton.innerHTML = 'Load More';
        } catch (error) {
            console.error('Error loading more threads:', error);
            loadMoreButton.innerHTML = 'Load More';
            loadMoreButton.disabled = false;
        }
    }
    
    async function loadThreads(timestamp = null) {
        try {
            showLoading();
            
            // Fetch threads with author information
            const threads = await getRecentThreads(10, timestamp);
            
            // If this is the first load, display threads
            if (!timestamp) {
                displayThreads(threads);
            } else {
                // If loading more, append threads
                appendThreads(threads);
            }
            
            // Update UI based on threads
            if (threads.length === 0) {
                showNoThreadsMessage();
            }
            
            // Enable load more button if we have threads
            const loadMoreButton = document.querySelector('.load-more button');
            if (loadMoreButton) {
                loadMoreButton.disabled = threads.length === 0;
            }
            
            return threads;
        } catch (error) {
            console.error('Error loading threads:', error);
            showError('Failed to load discussions. Please try again.');
            return [];
        }
    }
    
    function displayThreads(threads) {
        // Clear previous threads
        threadsContainer.innerHTML = '';
        
        // Add threads to the container
        threads.forEach(thread => {
            threadsContainer.appendChild(createThreadElement(thread));
        });
    }
    
    function appendThreads(threads) {
        // Append threads to the container
        threads.forEach(thread => {
            threadsContainer.appendChild(createThreadElement(thread));
        });
    }
    
    function createThreadElement(thread) {
        const threadEl = document.createElement('div');
        threadEl.className = 'discussion-thread';
        
        const threadDate = formatDate(thread.createdAt);
        const lastReplyDate = thread.updatedAt ? formatDate(thread.updatedAt) : threadDate;
        
        threadEl.innerHTML = `
            <div class="thread-main">
                <div class="thread-topic">${thread.topic || 'General'}</div>
                <a href="read.html?id=${thread.id}" class="thread-title">${thread.title}</a>
                <div class="thread-meta">
                    <div class="thread-author">
                        <span>By ${thread.authorName}</span>
                    </div>
                    <div class="thread-date">${threadDate}</div>
                </div>
            </div>
            <div class="thread-stats">
                <div class="stats-replies">
                    <span class="stats-count">${thread.replyCount || 0}</span> replies
                </div>
                <div class="stats-views">
                    <span class="stats-count">${thread.viewCount || 0}</span> views
                </div>
            </div>
            <div class="thread-last-post">
                <div class="last-post-date">${lastReplyDate}</div>
                <div class="last-post-author">
                    ${thread.lastReplyAuthor || thread.authorName}
                </div>
            </div>
        `;
        
        return threadEl;
    }
    
    function showLoading() {
        threadsContainer.innerHTML = '';
        
        // Create loading placeholders
        for (let i = 0; i < 5; i++) {
            const loadingThread = document.createElement('div');
            loadingThread.className = 'discussion-thread loading';
            loadingThread.innerHTML = `
                <div class="thread-main">
                    <div class="loading-topic"></div>
                    <div class="loading-title"></div>
                    <div class="loading-meta"></div>
                </div>
                <div class="thread-stats">
                    <div class="loading-stats"></div>
                </div>
                <div class="thread-last-post">
                    <div class="loading-last-post"></div>
                </div>
            `;
            threadsContainer.appendChild(loadingThread);
        }
        
        loadMoreButton.style.display = 'none';
    }
    
    function showNoThreadsMessage(message = 'No discussions found') {
        threadsContainer.innerHTML = `
            <div class="no-threads-message">
                <span class="material-symbols-rounded">forum</span>
                <h3>${message}</h3>
                <p>Be the first to start a discussion!</p>
                <a href="write.html" class="btn btn-primary">Start a Discussion</a>
            </div>
        `;
        
        loadMoreButton.style.display = 'none';
    }
    
    function showError(message) {
        threadsContainer.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-rounded">error</span>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">Try Again</button>
            </div>
        `;
        
        loadMoreButton.style.display = 'none';
    }
    
    function updateAuthUI(user) {
        const loginBtn = document.querySelector('.login-btn');
        const signupBtn = document.querySelector('.signup-btn');
        const profileBtn = document.querySelector('.profile-btn');
        
        if (!loginBtn || !signupBtn) return;
        
        if (user) {
            // User is signed in
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (profileBtn) {
                profileBtn.style.display = 'flex';
                
                // Try to get the user's profile data
                getUserProfile(user.uid).then(result => {
                    if (result.success && result.profile) {
                        const username = document.querySelector('.username');
                        const avatar = document.querySelector('.avatar');
                        
                        if (username) {
                            username.textContent = result.profile.displayName || 'User';
                        }
                        
                        if (avatar && result.profile.avatarUrl) {
                            avatar.style.backgroundImage = `url(${result.profile.avatarUrl})`;
                        }
                    }
                });
            }
        } else {
            // User is signed out
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (profileBtn) profileBtn.style.display = 'none';
        }
    }
    
    // Helper function for debouncing
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
    
    // Format date helper
    function formatDate(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 30) {
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } else if (diffDay > 1) {
            return `${diffDay} days ago`;
        } else if (diffDay === 1) {
            return 'yesterday';
        } else if (diffHour >= 1) {
            return `${diffHour}h ago`;
        } else if (diffMin >= 1) {
            return `${diffMin}m ago`;
        } else {
            return 'just now';
        }
    }
}); 