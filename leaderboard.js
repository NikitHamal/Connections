// Import Firebase functionality
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { firebaseConfig, getLeaderboard, getUserExperience, getUserProfile, countUnreadNotifications, LEVELS } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const topUsersContainer = document.querySelector('.top-users');
    const leaderboardTableBody = document.querySelector('.leaderboard-table-body');
    const myStatusContainer = document.querySelector('.my-status-content');
    const tabs = document.querySelectorAll('.tab');
    const notificationBadge = document.querySelector('.notification-badge');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    
    // State
    let currentUser = null;
    let allUsers = [];
    let currentTab = 'all-time'; // all-time, this-month, this-week
    
    // Initialize app
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);
        
        if (user) {
            // Update notification badge
            updateNotificationBadge();
            
            // Load user profile
            loadUserProfile(user.uid);
        } else {
            // Clear user profile section
            updateUserProfileUI(null);
        }
    });
    
    // Initialize
    init();
    
    // Add event listeners
    addEventListeners();
    
    // Functions
    async function init() {
        // Show loading state
        leaderboardTableBody.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading leaderboard data...</p>
            </div>
        `;
        
        // Fetch leaderboard data
        await loadLeaderboard();
    }
    
    function addEventListeners() {
        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                if (tabId === currentTab) return;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                currentTab = tabId;
                filterLeaderboard(currentTab);
            });
        });
    }
    
    // Load leaderboard data
    async function loadLeaderboard() {
        try {
            const result = await getLeaderboard(50);
            
            if (result.success) {
                allUsers = result.users;
                
                // Filter and display users
                filterLeaderboard(currentTab);
            } else {
                // Show error
                leaderboardTableBody.innerHTML = `
                    <div class="error-state">
                        <span class="material-symbols-rounded">error</span>
                        <p>Failed to load leaderboard data. Please try again later.</p>
                        <button class="btn btn-primary retry-btn">Retry</button>
                    </div>
                `;
                
                const retryBtn = leaderboardTableBody.querySelector('.retry-btn');
                if (retryBtn) {
                    retryBtn.addEventListener('click', loadLeaderboard);
                }
            }
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            
            // Show error
            leaderboardTableBody.innerHTML = `
                <div class="error-state">
                    <span class="material-symbols-rounded">error</span>
                    <p>An error occurred while loading the leaderboard. Please try again later.</p>
                    <button class="btn btn-primary retry-btn">Retry</button>
                </div>
            `;
            
            const retryBtn = leaderboardTableBody.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', loadLeaderboard);
            }
        }
    }
    
    // Filter leaderboard based on selected tab
    function filterLeaderboard(tab) {
        let filteredUsers = [...allUsers];
        
        // Apply time filter
        if (tab === 'this-month') {
            const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            filteredUsers = filteredUsers.filter(user => user.joinDate >= oneMonthAgo);
        } else if (tab === 'this-week') {
            const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            filteredUsers = filteredUsers.filter(user => user.joinDate >= oneWeekAgo);
        }
        
        // Sort by exp (highest first)
        filteredUsers.sort((a, b) => b.exp - a.exp);
        
        // Update UI
        updateLeaderboardUI(filteredUsers);
    }
    
    // Update leaderboard UI
    function updateLeaderboardUI(users) {
        // Update top 3 users
        updateTopUsersUI(users.slice(0, 3));
        
        // Update leaderboard table
        updateLeaderboardTableUI(users);
    }
    
    // Update top users UI
    function updateTopUsersUI(topUsers) {
        // Clear loading placeholders
        const firstPlace = topUsersContainer.querySelector('.first-place');
        const secondPlace = topUsersContainer.querySelector('.second-place');
        const thirdPlace = topUsersContainer.querySelector('.third-place');
        
        // Update first place
        if (topUsers.length > 0) {
            const user = topUsers[0];
            updateTopUserSlot(firstPlace, user, 1);
        } else {
            updateTopUserSlot(firstPlace, null, 1);
        }
        
        // Update second place
        if (topUsers.length > 1) {
            const user = topUsers[1];
            updateTopUserSlot(secondPlace, user, 2);
        } else {
            updateTopUserSlot(secondPlace, null, 2);
        }
        
        // Update third place
        if (topUsers.length > 2) {
            const user = topUsers[2];
            updateTopUserSlot(thirdPlace, user, 3);
        } else {
            updateTopUserSlot(thirdPlace, null, 3);
        }
    }
    
    // Update a single top user slot
    function updateTopUserSlot(element, user, rank) {
        const avatar = element.querySelector('.top-user-avatar');
        const name = element.querySelector('.top-user-name');
        const levelText = element.querySelector('.level-text');
        const exp = element.querySelector('.top-user-exp');
        
        if (user) {
            // User data available
            name.textContent = user.displayName;
            levelText.textContent = `Level ${user.level} ${user.levelTitle ? `- ${user.levelTitle}` : ''}`;
            exp.textContent = `${formatNumber(user.exp)} XP`;
            
            if (user.avatarUrl) {
                avatar.style.backgroundImage = `url(${user.avatarUrl})`;
            } else {
                avatar.style.backgroundImage = '';
                avatar.innerHTML = `<span class="avatar-placeholder">${user.displayName.charAt(0)}</span>`;
            }
        } else {
            // No user data
            name.textContent = '—';
            levelText.textContent = 'Level 0';
            exp.textContent = '0 XP';
            avatar.style.backgroundImage = '';
            avatar.innerHTML = '';
        }
    }
    
    // Update leaderboard table UI
    function updateLeaderboardTableUI(users) {
        if (users.length === 0) {
            leaderboardTableBody.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">leaderboard</span>
                    <p>No users found for this time period.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        users.forEach((user, index) => {
            const rank = index + 1;
            const isCurrentUser = currentUser && user.uid === currentUser.uid;
            
            html += `
                <div class="leaderboard-table-row ${isCurrentUser ? 'is-me' : ''}">
                    <div class="table-cell rank-cell">${rank}</div>
                    <div class="table-cell user-cell">
                        <div class="user-avatar" ${user.avatarUrl ? `style="background-image: url(${user.avatarUrl})"` : ''}>${!user.avatarUrl ? user.displayName.charAt(0) : ''}</div>
                        <span>${user.displayName}</span>
                    </div>
                    <div class="table-cell level-cell">
                        <div class="level-badge">
                            <span class="material-symbols-rounded">military_tech</span>
                            <span class="level-text">Level ${user.level}</span>
                        </div>
                    </div>
                    <div class="table-cell exp-cell">${formatNumber(user.exp)} XP</div>
                    <div class="table-cell posts-cell">${user.stats && user.stats.totalPosts ? formatNumber(user.stats.totalPosts) : '0'}</div>
                </div>
            `;
        });
        
        leaderboardTableBody.innerHTML = html;
    }
    
    // Load user profile and update UI
    async function loadUserProfile(userId) {
        try {
            // Get user experience data
            const expResult = await getUserExperience(userId);
            
            // Get user profile data
            const profileResult = await getUserProfile(userId);
            
            if (expResult.success && profileResult.success) {
                const expData = {
                    exp: expResult.exp,
                    level: expResult.level,
                    title: expResult.title,
                    nextLevelExp: expResult.nextLevelExp,
                    expToNextLevel: expResult.expToNextLevel
                };
                
                const profileData = profileResult.profile || {};
                
                // Find user rank in leaderboard
                const userRank = findUserRank(userId);
                
                // Update UI
                updateUserProfileUI({
                    ...expData,
                    displayName: profileData.displayName || 'Anonymous User',
                    avatarUrl: profileData.avatarUrl,
                    stats: profileData.stats || {},
                    rank: userRank
                });
            } else {
                updateUserProfileUI(null);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            updateUserProfileUI(null);
        }
    }
    
    // Find user rank in leaderboard
    function findUserRank(userId) {
        if (!allUsers.length) return null;
        
        // Find index of user
        const index = allUsers.findIndex(user => user.uid === userId);
        
        return index !== -1 ? index + 1 : null;
    }
    
    // Update user profile UI
    function updateUserProfileUI(userData) {
        if (!myStatusContainer) return;
        
        if (userData) {
            // User is signed in and profile loaded
            const myAvatar = myStatusContainer.querySelector('.my-avatar');
            const myName = myStatusContainer.querySelector('.my-name');
            const myRank = myStatusContainer.querySelector('.my-rank');
            const levelValue = myStatusContainer.querySelector('.my-stat:nth-child(1) .stat-value');
            const expValue = myStatusContainer.querySelector('.my-stat:nth-child(2) .stat-value');
            const postsValue = myStatusContainer.querySelector('.my-stat:nth-child(3) .stat-value');
            const expToNext = myStatusContainer.querySelector('.exp-to-next');
            const expBar = myStatusContainer.querySelector('.exp-bar');
            
            // Update values
            myName.textContent = userData.displayName;
            myRank.textContent = userData.rank ? `#${userData.rank} on the leaderboard` : 'Not ranked yet';
            levelValue.textContent = `${userData.level} (${userData.title})`;
            expValue.textContent = formatNumber(userData.exp);
            postsValue.textContent = userData.stats && userData.stats.totalPosts ? formatNumber(userData.stats.totalPosts) : '0';
            
            // Next level progress
            if (userData.nextLevelExp) {
                const currentLevelExp = LEVELS.find(l => l.level === userData.level)?.expRequired || 0;
                const progressToNextLevel = userData.exp - currentLevelExp;
                const totalNeededForNext = userData.nextLevelExp - currentLevelExp;
                const progressPercent = Math.floor((progressToNextLevel / totalNeededForNext) * 100);
                
                expToNext.textContent = `${formatNumber(userData.expToNextLevel)} XP needed`;
                expBar.style.width = `${progressPercent}%`;
            } else {
                // Max level reached
                expToNext.textContent = 'Max level reached!';
                expBar.style.width = '100%';
            }
            
            // Avatar
            if (userData.avatarUrl) {
                myAvatar.style.backgroundImage = `url(${userData.avatarUrl})`;
                myAvatar.innerHTML = '';
            } else {
                myAvatar.style.backgroundImage = '';
                myAvatar.innerHTML = `<span class="avatar-placeholder">${userData.displayName.charAt(0)}</span>`;
            }
        } else {
            // User is not signed in or profile failed to load
            myStatusContainer.innerHTML = `
                <div class="my-status-info">
                    <div class="avatar my-avatar"></div>
                    <div class="my-details">
                        <span class="my-name">Not signed in</span>
                        <span class="my-rank">Sign in to see your ranking</span>
                    </div>
                </div>
                <div class="sign-in-prompt">
                    <p>Sign in to track your experience and earn achievements</p>
                    <a href="signin.html?redirect=leaderboard.html" class="btn btn-primary">Sign In</a>
                </div>
            `;
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
    
    // Update UI based on auth state
    async function updateAuthUI(user) {
        if (!loginBtn || !signupBtn) return;
        
        if (user) {
            // User is signed in
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            
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
            loginBtn.style.display = 'inline-flex';
            signupBtn.style.display = 'inline-flex';
            profileBtn.style.display = 'none';
            
            // Hide notification badge
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
        }
    }
    
    // Format numbers for display (e.g. 1200 -> 1.2K)
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    }
}); 