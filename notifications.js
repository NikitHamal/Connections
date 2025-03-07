// Import Firebase functionality
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, update, query, orderByChild, limitToLast, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { firebaseConfig, onAuthStateChange, getUserProfile } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function() {
    // DOM Elements
    const notificationsList = document.querySelector('.notifications-list');
    const loadingNotifications = document.querySelector('.loading-notifications');
    const notificationsEmpty = document.querySelector('.notifications-empty');
    const notificationsError = document.querySelector('.notifications-error');
    const markAllReadBtn = document.querySelector('.mark-all-read-btn');
    const loadMoreBtn = document.querySelector('.load-more button');
    const filterOptions = document.querySelectorAll('.filter-option');
    const notificationBadge = document.querySelector('.notification-badge');
    const retryBtn = document.querySelector('.retry-btn');
    
    // State
    let currentUser = null;
    let allNotifications = [];
    let filteredNotifications = [];
    let currentFilter = 'all';
    let lastNotificationTimestamp = null;
    let hasMoreNotifications = false;
    let isLoading = false;
    
    // Set up auth listener
    onAuthStateChange((user) => {
        currentUser = user;
        updateAuthUI(user);
        
        if (user) {
            // Load notifications once user is authenticated
            loadNotifications();
            
            // Set up real-time notifications listener
            setupNotificationsListener(user.uid);
        } else {
            // Show empty state if not logged in
            showEmptyNotifications("Please sign in to view notifications");
        }
    });
    
    // Event Listeners
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', handleMarkAllRead);
    }
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', handleLoadMore);
    }
    
    if (filterOptions) {
        filterOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const filter = option.dataset.filter;
                
                // Update active filter
                filterOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // Apply filter
                filterNotifications(filter);
            });
        });
    }
    
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            loadNotifications();
        });
    }
    
    // Load notifications
    async function loadNotifications(timestamp = null) {
        if (!currentUser || isLoading) return;
        
        isLoading = true;
        
        try {
            if (!timestamp) {
                // Initial load - show loading state
                showLoading();
            }
            
            // Fetch notifications from Firebase
            const notificationsRef = ref(getDatabase(), `notifications/${currentUser.uid}`);
            let notificationsQuery;
            
            if (timestamp) {
                // Load more - get notifications before the last one
                notificationsQuery = query(
                    notificationsRef,
                    orderByChild('timestamp'),
                    limitToLast(10)
                );
            } else {
                // Initial load - get latest notifications
                notificationsQuery = query(
                    notificationsRef,
                    orderByChild('timestamp'),
                    limitToLast(10)
                );
            }
            
            const snapshot = await get(notificationsQuery);
            
            if (!snapshot.exists()) {
                // No notifications
                showEmptyNotifications();
                return;
            }
            
            let notifications = [];
            snapshot.forEach((child) => {
                notifications.push({
                    id: child.key,
                    ...child.val()
                });
            });
            
            // Sort by timestamp in descending order (newest first)
            notifications.sort((a, b) => b.timestamp - a.timestamp);
            
            // Update state
            if (timestamp) {
                // Append to existing notifications
                allNotifications = [...allNotifications, ...notifications];
            } else {
                // Replace existing notifications
                allNotifications = notifications;
            }
            
            // Apply current filter
            filterNotifications(currentFilter, false);
            
            // TODO: Implement pagination properly
            hasMoreNotifications = notifications.length === 10;
            if (notifications.length > 0) {
                lastNotificationTimestamp = notifications[notifications.length - 1].timestamp;
            }
            
            // Update load more button
            updateLoadMoreButton();
            
            // Update notification badge
            updateNotificationBadge();
        } catch (error) {
            console.error('Error loading notifications:', error);
            showError();
        } finally {
            isLoading = false;
        }
    }
    
    // Filter notifications
    function filterNotifications(filter, updateUI = true) {
        currentFilter = filter;
        
        if (filter === 'all') {
            filteredNotifications = allNotifications;
        } else {
            filteredNotifications = allNotifications.filter(notification => 
                notification.type === filter
            );
        }
        
        if (updateUI) {
            renderNotifications();
            
            // Show empty state if no notifications match the filter
            if (filteredNotifications.length === 0 && allNotifications.length > 0) {
                showEmptyNotifications(`No ${filter} notifications`);
            }
        }
    }
    
    // Render notifications to the DOM
    function renderNotifications() {
        // Hide loading state
        if (loadingNotifications) {
            loadingNotifications.style.display = 'none';
        }
        
        // Hide empty state
        if (notificationsEmpty) {
            notificationsEmpty.style.display = 'none';
        }
        
        // Hide error state
        if (notificationsError) {
            notificationsError.style.display = 'none';
        }
        
        // Clear existing notifications except loading placeholder
        const existingNotifications = notificationsList.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            notification.remove();
        });
        
        // Add notifications to the list
        filteredNotifications.forEach(notification => {
            const notificationElement = createNotificationElement(notification);
            notificationsList.appendChild(notificationElement);
        });
        
        // Show empty state if no notifications
        if (filteredNotifications.length === 0) {
            showEmptyNotifications();
        }
    }
    
    // Create notification element
    function createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}-notification`;
        element.dataset.id = notification.id;
        
        // Add unread class if notification is unread
        if (!notification.read) {
            element.classList.add('unread');
        }
        
        // Set icon based on notification type
        let iconName;
        switch (notification.type) {
            case 'reply':
                iconName = 'reply';
                break;
            case 'like':
                iconName = 'thumb_up';
                break;
            case 'mention':
                iconName = 'alternate_email';
                break;
            case 'system':
                iconName = 'info';
                break;
            default:
                iconName = 'notifications';
        }
        
        // Format date
        const timeAgo = formatTimeAgo(notification.timestamp);
        
        // Create notification HTML
        element.innerHTML = `
            <div class="notification-icon">
                <span class="material-symbols-rounded">${iconName}</span>
            </div>
            <div class="notification-content">
                <div class="notification-text">
                    ${getNotificationText(notification)}
                </div>
                ${notification.excerpt ? `
                <div class="notification-excerpt">
                    "${notification.excerpt}"
                </div>
                ` : ''}
                <div class="notification-meta">
                    <span class="notification-time">${timeAgo}</span>
                </div>
            </div>
            <div class="notification-actions">
                ${!notification.read ? `
                <button class="notification-action mark-read" title="Mark as read" data-id="${notification.id}">
                    <span class="material-symbols-rounded">mark_email_read</span>
                </button>
                ` : ''}
            </div>
        `;
        
        // Add event listeners
        const markReadBtn = element.querySelector('.mark-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', () => {
                markAsRead(notification.id);
            });
        }
        
        // Make the notification clickable to navigate to the relevant content
        element.addEventListener('click', (e) => {
            // Don't navigate if clicking on the mark read button
            if (e.target.closest('.notification-action')) {
                return;
            }
            
            // Mark as read when clicked
            if (!notification.read) {
                markAsRead(notification.id);
            }
            
            // Navigate to the relevant content
            if (notification.link) {
                window.location.href = notification.link;
            }
        });
        
        return element;
    }
    
    // Get notification text based on type
    function getNotificationText(notification) {
        switch (notification.type) {
            case 'reply':
                return `<span class="actor">${notification.actorName || 'Someone'}</span> replied to your discussion <span class="target">${notification.targetTitle || 'your post'}</span>`;
            
            case 'like':
                return `<span class="actor">${notification.actorName || 'Someone'}</span> upvoted your ${notification.targetType || 'post'} in <span class="target">${notification.targetTitle || 'a discussion'}</span>`;
            
            case 'mention':
                return `<span class="actor">${notification.actorName || 'Someone'}</span> mentioned you in <span class="target">${notification.targetTitle || 'a discussion'}</span>`;
            
            case 'system':
                return notification.message || 'System notification';
            
            default:
                return notification.message || 'You have a new notification';
        }
    }
    
    // Mark notification as read
    async function markAsRead(notificationId) {
        if (!currentUser) return;
        
        try {
            const db = getDatabase();
            const notificationRef = ref(db, `notifications/${currentUser.uid}/${notificationId}`);
            
            // Update the notification
            await update(notificationRef, {
                read: true
            });
            
            // Update UI
            const notificationElement = document.querySelector(`.notification[data-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.classList.remove('unread');
                
                const markReadBtn = notificationElement.querySelector('.mark-read');
                if (markReadBtn) {
                    markReadBtn.remove();
                }
            }
            
            // Update local state
            const notificationIndex = allNotifications.findIndex(n => n.id === notificationId);
            if (notificationIndex !== -1) {
                allNotifications[notificationIndex].read = true;
            }
            
            // Update notification badge
            updateNotificationBadge();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }
    
    // Mark all notifications as read
    async function handleMarkAllRead() {
        if (!currentUser || allNotifications.length === 0) return;
        
        try {
            const db = getDatabase();
            const updates = {};
            
            // Create update object for all unread notifications
            allNotifications.forEach(notification => {
                if (!notification.read) {
                    updates[`notifications/${currentUser.uid}/${notification.id}/read`] = true;
                }
            });
            
            // Update all notifications at once
            await update(ref(db), updates);
            
            // Update local state
            allNotifications = allNotifications.map(notification => ({
                ...notification,
                read: true
            }));
            
            // Re-filter notifications
            filterNotifications(currentFilter);
            
            // Update notification badge
            updateNotificationBadge();
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    }
    
    // Handle load more button click
    async function handleLoadMore() {
        if (isLoading || !hasMoreNotifications) return;
        
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<span class="loading-spinner"></span> Loading...';
        
        await loadNotifications(lastNotificationTimestamp);
        
        loadMoreBtn.disabled = false;
        loadMoreBtn.textContent = 'Load More';
    }
    
    // Setup real-time notifications listener
    function setupNotificationsListener(userId) {
        const db = getDatabase();
        const notificationsRef = ref(db, `notifications/${userId}`);
        
        // Listen for new notifications
        onValue(notificationsRef, (snapshot) => {
            if (!snapshot.exists()) return;
            
            // Only reload if we have new notifications
            const currentCount = allNotifications.length;
            let newCount = 0;
            
            snapshot.forEach(() => {
                newCount++;
            });
            
            if (newCount > currentCount) {
                // Reload notifications
                loadNotifications();
            }
        });
    }
    
    // Update notification badge
    function updateNotificationBadge() {
        if (!notificationBadge) return;
        
        // Count unread notifications
        const unreadCount = allNotifications.filter(notification => !notification.read).length;
        
        if (unreadCount > 0) {
            notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            notificationBadge.style.display = 'flex';
        } else {
            notificationBadge.style.display = 'none';
        }
    }
    
    // Update load more button visibility
    function updateLoadMoreButton() {
        if (!loadMoreBtn) return;
        
        loadMoreBtn.disabled = !hasMoreNotifications;
        loadMoreBtn.parentElement.style.display = hasMoreNotifications ? 'block' : 'none';
    }
    
    // Show loading state
    function showLoading() {
        if (!loadingNotifications) return;
        
        loadingNotifications.style.display = 'block';
        notificationsEmpty.style.display = 'none';
        notificationsError.style.display = 'none';
    }
    
    // Show empty notifications state
    function showEmptyNotifications(message = 'No notifications yet') {
        if (!notificationsEmpty) return;
        
        const emptyTitle = notificationsEmpty.querySelector('h2');
        if (emptyTitle) {
            emptyTitle.textContent = message;
        }
        
        notificationsEmpty.style.display = 'flex';
        loadingNotifications.style.display = 'none';
        notificationsError.style.display = 'none';
    }
    
    // Show error state
    function showError() {
        if (!notificationsError) return;
        
        notificationsError.style.display = 'flex';
        loadingNotifications.style.display = 'none';
        notificationsEmpty.style.display = 'none';
    }
    
    // Update UI based on auth state
    function updateAuthUI(user) {
        const loginBtn = document.querySelector('.login-btn');
        const signupBtn = document.querySelector('.signup-btn');
        const profileBtn = document.querySelector('.profile-btn');
        const notificationsBtn = document.querySelector('.notifications-btn');
        
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
            
            if (notificationsBtn) {
                notificationsBtn.style.display = 'flex';
            }
        } else {
            // User is signed out
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (profileBtn) profileBtn.style.display = 'none';
            
            if (notificationsBtn) {
                notificationsBtn.style.display = 'none';
            }
        }
    }
    
    // Format timestamp to relative time
    function formatTimeAgo(timestamp) {
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