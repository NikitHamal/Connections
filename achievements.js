// Import Firebase functionality
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    firebaseConfig, 
    getUserAchievements, 
    getUserExperience, 
    getUserProfile, 
    countUnreadNotifications, 
    ACHIEVEMENTS, 
    LEVELS 
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const achievementsGrid = document.querySelector('.achievements-grid');
    const userProgress = document.querySelector('.user-progress');
    const notSignedInMsg = document.querySelector('.not-signed-in');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const userAvatar = document.querySelector('.user-avatar');
    const userName = document.querySelector('.user-name');
    const userLevelText = document.querySelector('.level-text');
    const totalExp = document.querySelector('.total-exp');
    const nextLevelExp = document.querySelector('.next-level');
    const progressBar = document.querySelector('.progress-bar');
    const statValues = document.querySelectorAll('.stat-value');
    const notificationBadge = document.querySelector('.notification-badge');
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    
    // State
    let currentUser = null;
    let userAchievements = [];
    let allAchievements = [];
    let currentCategory = 'all';
    let userStats = {};
    
    // Initialize app
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);
    
    // Set up auth state listener
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        updateAuthUI(user);
        
        if (user) {
            // Show user progress section and hide not signed in message
            userProgress.style.display = 'block';
            notSignedInMsg.style.display = 'none';
            
            // Load user data
            loadUserData(user.uid);
            
            // Update notification badge
            updateNotificationBadge();
        } else {
            // Hide user progress section and show not signed in message
            userProgress.style.display = 'none';
            notSignedInMsg.style.display = 'block';
            
            // Show placeholder achievements
            loadAllAchievements();
        }
    });
    
    // Initialize
    init();
    
    // Add event listeners
    addEventListeners();
    
    // Functions
    function init() {
        // Show loading state
        achievementsGrid.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading achievements...</p>
            </div>
        `;
        
        // Load all achievements
        loadAllAchievements();
    }
    
    function addEventListeners() {
        // Category buttons
        categoryButtons.forEach(button => {
            button.addEventListener('click', () => {
                const category = button.getAttribute('data-category');
                if (category === currentCategory) return;
                
                // Update active button
                categoryButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Update category and filter achievements
                currentCategory = category;
                filterAchievements();
            });
        });
    }
    
    // Load user data
    async function loadUserData(userId) {
        try {
            // Load achievements
            const achievementsResult = await getUserAchievements(userId);
            
            // Load experience
            const experienceResult = await getUserExperience(userId);
            
            // Load profile
            const profileResult = await getUserProfile(userId);
            
            if (achievementsResult.success && experienceResult.success && profileResult.success) {
                // Process user achievements
                userAchievements = achievementsResult.achievements;
                
                // Process experience data
                const expData = {
                    exp: experienceResult.exp,
                    level: experienceResult.level,
                    title: experienceResult.title,
                    nextLevelExp: experienceResult.nextLevelExp,
                    expToNextLevel: experienceResult.expToNextLevel
                };
                
                // Process profile data
                const profile = profileResult.profile || {};
                userStats = profile.stats || {};
                
                // Update UI
                updateUserProgressUI({
                    ...expData,
                    displayName: profile.displayName || 'Anonymous User',
                    avatarUrl: profile.avatarUrl,
                    stats: userStats
                });
                
                // Filter and display achievements
                filterAchievements();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            
            // Show error
            achievementsGrid.innerHTML = `
                <div class="error-state">
                    <span class="material-symbols-rounded">error</span>
                    <p>An error occurred while loading your achievements. Please try again later.</p>
                    <button class="btn btn-primary retry-btn">Retry</button>
                </div>
            `;
            
            const retryBtn = achievementsGrid.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => loadUserData(userId));
            }
        }
    }
    
    // Load all achievements
    function loadAllAchievements() {
        // Get all possible achievements from constants
        allAchievements = Object.values(ACHIEVEMENTS);
        
        // Filter by category
        filterAchievements();
    }
    
    // Filter achievements based on selected category
    function filterAchievements() {
        let filteredAchievements = [...allAchievements];
        
        // Apply category filter if not "all"
        if (currentCategory !== 'all') {
            filteredAchievements = filteredAchievements.filter(achievement => {
                // Map achievement IDs to categories
                const categories = {
                    'participation': ['FIRST_POST', 'POSTS_10'],
                    'community': ['FOLLOWER_5', 'COMMENT_10', 'UPVOTE_10'],
                    'topics': ['TOPICS_5'],
                    'special': [] // Special achievements can be added here
                };
                
                return categories[currentCategory].includes(achievement.id);
            });
        }
        
        // Update UI
        updateAchievementsUI(filteredAchievements);
    }
    
    // Update achievements UI
    function updateAchievementsUI(achievements) {
        if (achievements.length === 0) {
            achievementsGrid.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded">emoji_events</span>
                    <p>No achievements found in this category.</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        
        achievements.forEach(achievement => {
            // Check if user has earned this achievement
            const userAchievement = userAchievements.find(a => a.id === achievement.id);
            const isLocked = !userAchievement && currentUser;
            const isPlaceholder = !currentUser;
            
            html += `
                <div class="achievement-card ${isLocked || isPlaceholder ? 'locked' : ''}">
                    <div class="achievement-icon">
                        <span class="material-symbols-rounded">${achievement.icon}</span>
                    </div>
                    <h3 class="achievement-name">${achievement.name}</h3>
                    <p class="achievement-description">${achievement.description}</p>
                    <div class="achievement-reward">+${achievement.expReward} XP</div>
                    ${userAchievement ? `
                        <div class="achievement-date">
                            Earned ${formatDate(userAchievement.awardedAt)}
                        </div>
                        <div class="unlock-badge">Unlocked</div>
                    ` : ''}
                </div>
            `;
        });
        
        achievementsGrid.innerHTML = html;
    }
    
    // Update user progress UI
    function updateUserProgressUI(userData) {
        if (!userData) return;
        
        // Update user info
        userName.textContent = userData.displayName;
        userLevelText.textContent = `Level ${userData.level} - ${userData.title}`;
        
        // Update avatar
        if (userData.avatarUrl) {
            userAvatar.style.backgroundImage = `url(${userData.avatarUrl})`;
        } else {
            userAvatar.innerHTML = userData.displayName.charAt(0);
        }
        
        // Update experience
        totalExp.textContent = `${formatNumber(userData.exp)} XP`;
        
        // Next level progress
        if (userData.nextLevelExp) {
            const currentLevelExp = LEVELS.find(l => l.level === userData.level)?.expRequired || 0;
            const progressToNextLevel = userData.exp - currentLevelExp;
            const totalNeededForNext = userData.nextLevelExp - currentLevelExp;
            const progressPercent = Math.floor((progressToNextLevel / totalNeededForNext) * 100);
            
            nextLevelExp.textContent = `${formatNumber(userData.expToNextLevel)} XP to Level ${userData.level + 1}`;
            progressBar.style.width = `${progressPercent}%`;
        } else {
            // Max level reached
            nextLevelExp.textContent = 'Max level reached!';
            progressBar.style.width = '100%';
        }
        
        // Update stats
        const stats = userData.stats;
        if (stats) {
            // Posts
            statValues[0].textContent = formatNumber(stats.totalPosts || 0);
            
            // Comments
            statValues[1].textContent = formatNumber(stats.totalComments || 0);
            
            // Topics
            statValues[2].textContent = formatNumber(stats.uniqueTopics || 0);
            
            // Upvotes
            statValues[3].textContent = formatNumber(stats.upvotesReceived || 0);
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
    
    // Format date for display
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
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