// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, push, get, set, update, query, orderByChild, limitToLast, onValue, equalTo } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnuHbSv6BniMyf3ltSZTSrIFa_92bHB-o",
    authDomain: "storm-blogs.firebaseapp.com",
    databaseURL: "https://storm-blogs-default-rtdb.firebaseio.com",
    projectId: "storm-blogs",
    storageBucket: "storm-blogs.firebasestorage.app",
    messagingSenderId: "158567556221",
    appId: "1:158567556221:web:855dfa074fc5b65e68fd14",
    measurementId: "G-16WVQ25D8P"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Ensure user is authenticated
const ensureAuth = async () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((result) => resolve(result.user))
          .catch((error) => {
            console.error("Error signing in anonymously:", error);
            resolve(null);
          });
      }
    });
  });
};

// EXPERIENCE & LEVEL CONSTANTS
const EXP = {
  CREATE_POST: 50,
  RECEIVE_UPVOTE: 10,
  GIVE_UPVOTE: 2,
  RECEIVE_COMMENT: 5,
  WRITE_COMMENT: 10,
  FIRST_POST: 100,
  FOLLOW_TOPIC: 5
};

const LEVELS = [
  { level: 1, expRequired: 0, title: "Novice" },
  { level: 2, expRequired: 100, title: "Beginner" },
  { level: 3, expRequired: 300, title: "Contributor" },
  { level: 4, expRequired: 600, title: "Regular" },
  { level: 5, expRequired: 1000, title: "Enthusiast" },
  { level: 6, expRequired: 1500, title: "Scholar" },
  { level: 7, expRequired: 2500, title: "Authority" },
  { level: 8, expRequired: 4000, title: "Expert" },
  { level: 9, expRequired: 6000, title: "Master" },
  { level: 10, expRequired: 10000, title: "Sage" }
];

const ACHIEVEMENTS = {
  FIRST_POST: {
    id: "first_post",
    name: "First Post",
    description: "Published your first discussion",
    icon: "edit_note",
    expReward: 100
  },
  FOLLOWER_5: {
    id: "follower_5",
    name: "Small Following",
    description: "5 people follow your discussions",
    icon: "group",
    expReward: 150
  },
  UPVOTE_10: {
    id: "upvote_10",
    name: "Quality Content",
    description: "Received 10 upvotes on your discussions",
    icon: "thumb_up",
    expReward: 200
  },
  COMMENT_10: {
    id: "comment_10",
    name: "Conversation Starter",
    description: "Received 10 comments on your discussions",
    icon: "forum",
    expReward: 150
  },
  TOPICS_5: {
    id: "topics_5",
    name: "Versatile",
    description: "Posted in 5 different topics",
    icon: "category",
    expReward: 250
  },
  POSTS_10: {
    id: "posts_10",
    name: "Prolific",
    description: "Published 10 discussions",
    icon: "article",
    expReward: 300
  }
};

// ===== TOPICS MANAGEMENT =====

// Get all topics
export const getTopics = async () => {
  try {
    const topicsRef = ref(database, 'topics');
    const snapshot = await get(topicsRef);
    
    if (snapshot.exists()) {
      const topics = [];
      snapshot.forEach(child => {
        topics.push({
          id: child.key,
          ...child.val()
        });
      });
      
      return { success: true, topics };
    } else {
      await initializeDefaultTopics();
      return getTopics();
    }
  } catch (error) {
    console.error("Error getting topics:", error);
    return { success: false, error: "Failed to load topics" };
  }
};

// Initialize default topics if none exist
const initializeDefaultTopics = async () => {
  const defaultTopics = [
    {
      id: 'philosophy',
      name: 'Philosophy',
      description: 'Explore fundamental questions about knowledge, existence, and ethics through thoughtful discourse and analysis.',
      icon: 'psychology',
      followers: 1200,
      discussionCount: 487,
      createdAt: Date.now() - 1000000000,
      featured: true
    },
    {
      id: 'science',
      name: 'Science',
      description: 'Discover the latest breakthroughs and timeless principles of scientific inquiry.',
      icon: 'science',
      followers: 945,
      discussionCount: 356,
      createdAt: Date.now() - 900000000
    },
    {
      id: 'literature',
      name: 'Literature',
      description: 'Discuss classic and contemporary works that shape our understanding of humanity.',
      icon: 'menu_book',
      followers: 876,
      discussionCount: 412,
      createdAt: Date.now() - 800000000
    },
    {
      id: 'current-affairs',
      name: 'Current Affairs',
      description: 'Engage with thoughtful analysis of today\'s most pressing issues and events.',
      icon: 'news',
      followers: 723,
      discussionCount: 289,
      createdAt: Date.now() - 700000000
    },
    {
      id: 'religion',
      name: 'Religion',
      description: 'Explore spiritual traditions and their influence on culture and society.',
      icon: 'brightness_7',
      followers: 615,
      discussionCount: 231,
      createdAt: Date.now() - 600000000
    },
    {
      id: 'arts',
      name: 'Arts',
      description: 'Celebrate creative expression across various mediums and traditions.',
      icon: 'palette',
      followers: 489,
      discussionCount: 178,
      createdAt: Date.now() - 500000000
    },
    {
      id: 'music',
      name: 'Music',
      description: 'Discuss music theory, history, genres, and the impact of sound on culture.',
      icon: 'music_note',
      followers: 354,
      discussionCount: 142,
      createdAt: Date.now() - 400000000
    },
    {
      id: 'technology',
      name: 'Technology',
      description: 'Explore innovations, digital trends, and the impact of technology on society.',
      icon: 'computer',
      followers: 865,
      discussionCount: 324,
      createdAt: Date.now() - 300000000
    }
  ];
  
  const topicsRef = ref(database, 'topics');
  
  for (const topic of defaultTopics) {
    const { id, ...topicData } = topic;
    const topicRef = ref(database, `topics/${id}`);
    await set(topicRef, topicData);
  }
  
  console.log("Default topics initialized");
};

// Follow/Unfollow a topic
export const toggleTopicFollow = async (topicId, userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    // Check if user is already following this topic
    const userTopicRef = ref(database, `users/${userId}/following/topics/${topicId}`);
    const userTopicSnapshot = await get(userTopicRef);
    const isFollowing = userTopicSnapshot.exists();
    
    // Get topic reference
    const topicRef = ref(database, `topics/${topicId}`);
    const topicSnapshot = await get(topicRef);
    
    if (!topicSnapshot.exists()) {
      return { success: false, error: "Topic not found" };
    }
    
    // Get current follower count
    const topic = topicSnapshot.val();
    const currentFollowers = topic.followers || 0;
    
    if (isFollowing) {
      // Unfollow
      await set(userTopicRef, null);
      await update(topicRef, { followers: currentFollowers - 1 });
      return { success: true, following: false };
    } else {
      // Follow
      await set(userTopicRef, true);
      await update(topicRef, { followers: currentFollowers + 1 });
      
      // Award exp for following a topic
      await addExperience(userId, EXP.FOLLOW_TOPIC, `Followed the ${topic.name} topic`);
      
      return { success: true, following: true };
    }
  } catch (error) {
    console.error("Error toggling topic follow:", error);
    return { success: false, error: "Failed to update topic follow status" };
  }
};

// Check if user is following topics
export const getUserFollowedTopics = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const userTopicsRef = ref(database, `users/${userId}/following/topics`);
    const snapshot = await get(userTopicsRef);
    
    if (snapshot.exists()) {
      return { success: true, topics: Object.keys(snapshot.val()) };
    } else {
      return { success: true, topics: [] };
    }
  } catch (error) {
    console.error("Error getting user followed topics:", error);
    return { success: false, error: "Failed to get followed topics" };
  }
};

// Suggest a new topic
export const suggestTopic = async (userId, topicData) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const suggestionsRef = ref(database, 'topicSuggestions');
    const newSuggestionRef = push(suggestionsRef);
    
    await set(newSuggestionRef, {
      ...topicData,
      suggestedBy: userId,
      createdAt: Date.now(),
      status: 'pending'
    });
    
    return { success: true, id: newSuggestionRef.key };
  } catch (error) {
    console.error("Error suggesting topic:", error);
    return { success: false, error: "Failed to submit topic suggestion" };
  }
};

// ===== EXPERIENCE & LEVELING SYSTEM =====

// Add experience points to a user
export const addExperience = async (userId, amount, reason) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    // Get current user profile
    const userProfileRef = ref(database, `users/${userId}/profile`);
    const profileSnapshot = await get(userProfileRef);
    
    let currentExp = 0;
    let currentLevel = 1;
    
    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.val();
      currentExp = profile.exp || 0;
      currentLevel = profile.level || 1;
    }
    
    // Calculate new exp and level
    const newExp = currentExp + amount;
    const newLevel = calculateLevel(newExp);
    
    // Update the user's profile
    await update(userProfileRef, {
      exp: newExp,
      level: newLevel.level,
      levelTitle: newLevel.title
    });
    
    // Log the experience gain
    const expLogRef = ref(database, `users/${userId}/expLog`);
    const newLogRef = push(expLogRef);
    await set(newLogRef, {
      amount,
      reason,
      timestamp: Date.now(),
      totalExp: newExp
    });
    
    const result = { 
      success: true, 
      newExp, 
      previousLevel: currentLevel, 
      newLevel: newLevel.level 
    };
    
    // If user leveled up, include that in the response
    if (newLevel.level > currentLevel) {
      result.levelUp = true;
      result.levelTitle = newLevel.title;
      
      // Create notification for level up
      await createNotification(userId, {
        type: 'level_up',
        title: 'Level Up!',
        message: `You've reached level ${newLevel.level}: ${newLevel.title}`,
        timestamp: Date.now(),
        read: false,
        link: 'achievements.html'
      });
    }
    
    return result;
  } catch (error) {
    console.error("Error adding experience:", error);
    return { success: false, error: "Failed to update experience" };
  }
};

// Calculate user level based on exp
function calculateLevel(exp) {
  // Find the highest level the user has reached
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (exp >= LEVELS[i].expRequired) {
      return {
        level: LEVELS[i].level,
        title: LEVELS[i].title,
        currentExp: exp,
        nextLevelExp: i < LEVELS.length - 1 ? LEVELS[i + 1].expRequired : null,
        expToNextLevel: i < LEVELS.length - 1 ? LEVELS[i + 1].expRequired - exp : 0
      };
    }
  }
  
  // Default to level 1 if something goes wrong
  return { level: 1, title: "Novice" };
}

// Get user's experience and level
export const getUserExperience = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const userProfileRef = ref(database, `users/${userId}/profile`);
    const profileSnapshot = await get(userProfileRef);
    
    if (profileSnapshot.exists()) {
      const profile = profileSnapshot.val();
      const exp = profile.exp || 0;
      const level = calculateLevel(exp);
      
      return { 
        success: true, 
        exp, 
        level: level.level,
        title: level.title,
        nextLevelExp: level.nextLevelExp,
        expToNextLevel: level.expToNextLevel
      };
    } else {
      return { 
        success: true, 
        exp: 0, 
        level: 1,
        title: "Novice",
        nextLevelExp: LEVELS[1].expRequired,
        expToNextLevel: LEVELS[1].expRequired
      };
    }
  } catch (error) {
    console.error("Error getting user experience:", error);
    return { success: false, error: "Failed to get user experience" };
  }
};

// ===== ACHIEVEMENTS SYSTEM =====

// Award an achievement to a user
export const awardAchievement = async (userId, achievementId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    // Check if achievement exists
    const achievement = ACHIEVEMENTS[achievementId];
    if (!achievement) {
      return { success: false, error: "Achievement not found" };
    }
    
    // Check if user already has this achievement
    const userAchievementRef = ref(database, `users/${userId}/achievements/${achievementId}`);
    const achievementSnapshot = await get(userAchievementRef);
    
    if (achievementSnapshot.exists()) {
      return { success: true, alreadyAwarded: true };
    }
    
    // Award the achievement
    await set(userAchievementRef, {
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      awardedAt: Date.now()
    });
    
    // Award experience
    const expResult = await addExperience(userId, achievement.expReward, `Earned achievement: ${achievement.name}`);
    
    // Create notification
    await createNotification(userId, {
      type: 'achievement',
      title: 'New Achievement!',
      message: `You've earned the "${achievement.name}" achievement`,
      timestamp: Date.now(),
      read: false,
      link: 'achievements.html',
      icon: achievement.icon
    });
    
    return { success: true, achievement, expAwarded: achievement.expReward, ...expResult };
  } catch (error) {
    console.error("Error awarding achievement:", error);
    return { success: false, error: "Failed to award achievement" };
  }
};

// Get user's achievements
export const getUserAchievements = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const userAchievementsRef = ref(database, `users/${userId}/achievements`);
    const snapshot = await get(userAchievementsRef);
    
    if (snapshot.exists()) {
      const achievements = [];
      snapshot.forEach(child => {
        achievements.push(child.val());
      });
      
      return { success: true, achievements };
    } else {
      return { success: true, achievements: [] };
    }
  } catch (error) {
    console.error("Error getting user achievements:", error);
    return { success: false, error: "Failed to get achievements" };
  }
};

// Check and award achievements based on stats
export const checkAchievements = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    // Get user stats
    const userStatsRef = ref(database, `users/${userId}/stats`);
    const statsSnapshot = await get(userStatsRef);
    
    if (!statsSnapshot.exists()) {
      return { success: true, achievementsAwarded: [] };
    }
    
    const stats = statsSnapshot.val();
    const achievementsAwarded = [];
    
    // Check each achievement condition
    if (stats.totalPosts >= 1) {
      const result = await awardAchievement(userId, 'FIRST_POST');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.FIRST_POST);
      }
    }
    
    if (stats.followers >= 5) {
      const result = await awardAchievement(userId, 'FOLLOWER_5');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.FOLLOWER_5);
      }
    }
    
    if (stats.upvotesReceived >= 10) {
      const result = await awardAchievement(userId, 'UPVOTE_10');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.UPVOTE_10);
      }
    }
    
    if (stats.commentsReceived >= 10) {
      const result = await awardAchievement(userId, 'COMMENT_10');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.COMMENT_10);
      }
    }
    
    if (stats.uniqueTopics >= 5) {
      const result = await awardAchievement(userId, 'TOPICS_5');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.TOPICS_5);
      }
    }
    
    if (stats.totalPosts >= 10) {
      const result = await awardAchievement(userId, 'POSTS_10');
      if (result.success && !result.alreadyAwarded) {
        achievementsAwarded.push(ACHIEVEMENTS.POSTS_10);
      }
    }
    
    return { success: true, achievementsAwarded };
  } catch (error) {
    console.error("Error checking achievements:", error);
    return { success: false, error: "Failed to check achievements" };
  }
};

// Update user stats when posting
export const updateUserStats = async (userId, statUpdates) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const userStatsRef = ref(database, `users/${userId}/stats`);
    const statsSnapshot = await get(userStatsRef);
    
    let currentStats = {};
    
    if (statsSnapshot.exists()) {
      currentStats = statsSnapshot.val();
    }
    
    // Update stats with new values
    const updatedStats = { ...currentStats };
    
    for (const [key, value] of Object.entries(statUpdates)) {
      updatedStats[key] = (currentStats[key] || 0) + value;
    }
    
    // Update the database
    await set(userStatsRef, updatedStats);
    
    // Check for new achievements
    await checkAchievements(userId);
    
    return { success: true, stats: updatedStats };
  } catch (error) {
    console.error("Error updating user stats:", error);
    return { success: false, error: "Failed to update user stats" };
  }
};

// Get top users for leaderboard
export const getLeaderboard = async (limit = 20) => {
  try {
    const usersRef = ref(database, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      return { success: true, users: [] };
    }
    
    const usersData = [];
    
    usersSnapshot.forEach(userSnapshot => {
      const userId = userSnapshot.key;
      const userData = userSnapshot.val();
      
      // Only include users with profiles
      if (userData.profile) {
        usersData.push({
          uid: userId,
          displayName: userData.profile.displayName || 'Anonymous User',
          avatarUrl: userData.profile.avatarUrl || null,
          level: userData.profile.level || 1,
          exp: userData.profile.exp || 0,
          levelTitle: userData.profile.levelTitle || 'Novice',
          stats: userData.stats || {},
          joinDate: userData.profile.createdAt || Date.now()
        });
      }
    });
    
    // Sort by exp (highest first)
    usersData.sort((a, b) => b.exp - a.exp);
    
    // Take only the requested limit
    const leaderboard = usersData.slice(0, limit);
    
    return { success: true, users: leaderboard };
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return { success: false, error: "Failed to get leaderboard" };
  }
};

// Export the thread creation function with exp and achievement integration
export const createThread = async (threadData) => {
  try {
    const user = await ensureAuth();
    if (!user.uid) {
      return { success: false, error: "Authentication required" };
    }
    
    const threadsRef = ref(database, 'threads');
    const newThreadRef = push(threadsRef);
    
    // Prepare thread data
    const thread = {
      ...threadData,
      authorId: user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      views: 0,
      upvotes: 0,
      downvotes: 0,
      replies: 0
    };
    
    // Save thread to database
    await set(newThreadRef, thread);
    
    // Get topic reference to update count
    if (thread.topic) {
      const topicRef = ref(database, `topics/${thread.topic}/discussionCount`);
      const topicSnapshot = await get(ref(database, `topics/${thread.topic}`));
      
      if (topicSnapshot.exists()) {
        const topic = topicSnapshot.val();
        await set(topicRef, (topic.discussionCount || 0) + 1);
      }
    }
    
    // Update user stats
    const userStatsRef = ref(database, `users/${user.uid}/stats`);
    const userStatsSnapshot = await get(userStatsRef);
    let userStats = {};
    
    if (userStatsSnapshot.exists()) {
      userStats = userStatsSnapshot.val();
    }
    
    // Check if this is user's first post in this topic
    const topicsPostedIn = userStats.topicsPostedIn || {};
    const isNewTopic = !topicsPostedIn[thread.topic];
    
    // Update stats
    const updatedStats = {
      ...userStats,
      totalPosts: (userStats.totalPosts || 0) + 1,
      topicsPostedIn: {
        ...topicsPostedIn,
        [thread.topic]: true
      },
      uniqueTopics: isNewTopic ? (userStats.uniqueTopics || 0) + 1 : (userStats.uniqueTopics || 0)
    };
    
    await set(userStatsRef, updatedStats);
    
    // Award experience for creating a thread
    const expResult = await addExperience(user.uid, EXP.CREATE_POST, "Created a new discussion");
    
    // Check if this is user's first post ever
    if (updatedStats.totalPosts === 1) {
      await awardAchievement(user.uid, 'FIRST_POST');
    }
    
    // Check other achievements
    await checkAchievements(user.uid);
    
    return { 
      success: true, 
      threadId: newThreadRef.key,
      expGained: EXP.CREATE_POST,
      levelUp: expResult.levelUp
    };
  } catch (error) {
    console.error("Error creating thread:", error);
    return { success: false, error: "Failed to create thread" };
  }
};

// Count unread notifications
export const countUnreadNotifications = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const notificationsRef = ref(database, `users/${userId}/notifications`);
    const snapshot = await get(notificationsRef);
    
    if (!snapshot.exists()) {
      return { success: true, count: 0 };
    }
    
    let count = 0;
    snapshot.forEach((child) => {
      if (child.val() && !child.val().read) {
        count++;
      }
    });
    
    return { success: true, count };
  } catch (error) {
    console.error("Error counting unread notifications:", error);
    return { success: false, error: "Failed to count notifications" };
  }
};

// Create a new notification
export const createNotification = async (userId, notificationData) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const notificationsRef = ref(database, `users/${userId}/notifications`);
    const newNotificationRef = push(notificationsRef);
    
    await set(newNotificationRef, notificationData);
    
    return { success: true, id: newNotificationRef.key };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error: "Failed to create notification" };
  }
};

// Get user profile data
export const getUserProfile = async (userId) => {
  if (!userId) return { success: false, error: "User not authenticated" };
  
  try {
    const userProfileRef = ref(database, `users/${userId}/profile`);
    const snapshot = await get(userProfileRef);
    
    if (snapshot.exists()) {
      return { success: true, profile: snapshot.val() };
    } else {
      return { success: true, profile: null };
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { success: false, error: "Failed to fetch user profile" };
  }
};

// Add a reply to a thread
export const addReply = async (threadId, replyData) => {
  try {
    console.log('Starting addReply with threadId:', threadId, 'and data:', replyData);
    
    const user = await ensureAuth();
    if (!user.uid) {
      console.error('Authentication required for addReply');
      return { success: false, error: "Authentication required" };
    }
    
    // Create the reply
    const repliesRef = ref(database, `replies/${threadId}`);
    const newReplyRef = push(repliesRef);
    
    // Prepare reply data
    const reply = {
      ...replyData,
      authorId: user.uid,
      createdAt: Date.now(),
      upvotes: 0,
      downvotes: 0
    };
    
    console.log('Saving reply to database:', reply);
    
    // Save reply to database
    await set(newReplyRef, reply);
    
    // Update thread's reply count and last updated time
    const threadRef = ref(database, `threads/${threadId}`);
    const threadSnapshot = await get(threadRef);
    
    if (threadSnapshot.exists()) {
      const thread = threadSnapshot.val();
      
      // Update thread with reply count and timestamp
      const updates = { 
        replyCount: (thread.replyCount || 0) + 1,
        updatedAt: Date.now() 
      };
      
      console.log('Updating thread with:', updates);
      await update(threadRef, updates);
      
      // If this thread belongs to another user, update their stats and send notification
      if (thread.authorId && thread.authorId !== user.uid) {
        // Update thread author's stats (comments received)
        await updateUserStats(thread.authorId, { commentsReceived: 1 });
        
        // Send notification to thread author
        await createNotification(thread.authorId, {
          type: 'comment',
          title: 'New Comment',
          message: `Someone commented on your discussion "${thread.title.substring(0, 30)}${thread.title.length > 30 ? '...' : ''}"`,
          threadId,
          actorId: user.uid,
          timestamp: Date.now(),
          read: false
        });
      }
    }
    
    // Update commenter's stats
    await updateUserStats(user.uid, { totalComments: 1 });
    
    // Award experience for commenting
    await addExperience(user.uid, EXP.WRITE_COMMENT, "Posted a comment");
    
    console.log('Reply added successfully with ID:', newReplyRef.key);
    
    return { 
      success: true, 
      replyId: newReplyRef.key,
      expGained: EXP.WRITE_COMMENT 
    };
  } catch (error) {
    console.error("Error adding reply:", error);
    return { success: false, error: "Failed to add reply" };
  }
};

// Get replies for a thread
export const getReplies = async (threadId, limit = 50) => {
  try {
    const repliesRef = ref(database, `replies/${threadId}`);
    const snapshot = await get(repliesRef);
    
    if (!snapshot.exists()) {
      return { success: true, replies: [] };
    }
    
    const replies = [];
    snapshot.forEach(child => {
      replies.push({
        id: child.key,
        ...child.val()
      });
    });
    
    // Sort by createdAt (newest first)
    replies.sort((a, b) => b.createdAt - a.createdAt);
    
    // Limit the number of replies
    const limitedReplies = replies.slice(0, limit);
    
    // Fetch author information for each reply
    const repliesWithAuthors = await Promise.all(
      limitedReplies.map(async (reply) => {
        if (reply.authorId) {
          try {
            const userRef = ref(database, `users/${reply.authorId}`);
            const userSnapshot = await get(userRef);
            
            if (userSnapshot.exists()) {
              const userData = userSnapshot.val();
              const profile = userData.profile || {};
              reply.authorName = profile.displayName || userData.displayName || 'Anonymous';
              reply.authorAvatar = profile.avatarUrl || null;
            } else {
              reply.authorName = 'Anonymous';
            }
          } catch (error) {
            console.error(`Error fetching author for reply ${reply.id}:`, error);
            reply.authorName = 'Anonymous';
          }
        } else {
          reply.authorName = 'Anonymous';
        }
        return reply;
      })
    );
    
    return { success: true, replies: repliesWithAuthors };
  } catch (error) {
    console.error("Error fetching replies:", error);
    return { success: false, error: "Failed to fetch replies" };
  }
};

// Vote on a reply
export const voteOnReply = async (threadId, replyId, voteType) => {
  try {
    const user = await ensureAuth();
    if (!user.uid) {
      return { success: false, error: "Authentication required" };
    }
    
    const replyRef = ref(database, `replies/${threadId}/${replyId}`);
    const replySnapshot = await get(replyRef);
    
    if (!replySnapshot.exists()) {
      return { success: false, error: "Reply not found" };
    }
    
    const reply = replySnapshot.val();
    const userVotesRef = ref(database, `votes/replies/${replyId}/${user.uid}`);
    const userVoteSnapshot = await get(userVotesRef);
    const currentVote = userVoteSnapshot.exists() ? userVoteSnapshot.val() : null;
    
    let upvotes = reply.upvotes || 0;
    let downvotes = reply.downvotes || 0;
    
    // Remove existing vote if any
    if (currentVote === 'up') {
      upvotes--;
    } else if (currentVote === 'down') {
      downvotes--;
    }
    
    // Add new vote if not removing the current vote
    if (currentVote !== voteType) {
      if (voteType === 'up') {
        upvotes++;
        await set(userVotesRef, 'up');
        
        // Award experience for receiving an upvote
        if (reply.authorId && reply.authorId !== user.uid) {
          await addExperience(reply.authorId, EXP.RECEIVE_UPVOTE, "Received an upvote on a comment");
          await updateUserStats(reply.authorId, { upvotesReceived: 1 });
        }
        
        // Award experience for giving an upvote
        await addExperience(user.uid, EXP.GIVE_UPVOTE, "Gave an upvote");
      } else if (voteType === 'down') {
        downvotes++;
        await set(userVotesRef, 'down');
      } else {
        await set(userVotesRef, null);
      }
    } else {
      // User is toggling off their vote
      await set(userVotesRef, null);
    }
    
    await update(replyRef, { upvotes, downvotes });
    
    return { success: true, upvotes, downvotes };
  } catch (error) {
    console.error("Error voting on reply:", error);
    return { success: false, error: "Failed to vote on reply" };
  }
};

// Get a single thread by ID
export const getThread = async (threadId) => {
  try {
    const user = await ensureAuth();
    const userId = user ? user.uid : null;
    
    const threadRef = ref(database, `threads/${threadId}`);
    const snapshot = await get(threadRef);
    
    if (!snapshot.exists()) {
      return { success: false, error: "Thread not found" };
    }
    
    // Get thread data
    const thread = snapshot.val();
    thread.id = threadId;
    
    // Only increment view count if:
    // 1. User is not the author
    // 2. User hasn't viewed this thread before (or it's been a day since last view)
    if (userId && userId !== thread.authorId) {
      // Check if user has viewed this thread before
      const viewsRef = ref(database, `threadViews/${threadId}`);
      const viewsSnapshot = await get(viewsRef);
      
      let shouldIncrementView = true;
      const now = Date.now();
      
      // If user has viewed this thread before, check when
      if (viewsSnapshot.exists()) {
        const views = viewsSnapshot.val();
        if (views[userId]) {
          const lastViewTime = views[userId];
          // Only count as a new view if it's been at least 24 hours
          if (now - lastViewTime < 24 * 60 * 60 * 1000) {
            shouldIncrementView = false;
          }
        }
      }
      
      if (shouldIncrementView) {
        // Increment view count
        const viewCount = (thread.viewCount || 0) + 1;
        await update(threadRef, { viewCount: viewCount });
        
        // Update thread object with new view count
        thread.viewCount = viewCount;
        
        // Record this view with timestamp
        const viewData = {};
        viewData[userId] = now;
        await update(viewsRef, viewData);
      }
    }
    
    // Get author information
    let authorData = {};
    if (thread.authorId) {
      const userProfileResult = await getUserProfile(thread.authorId);
      if (userProfileResult.success && userProfileResult.profile) {
        authorData = {
          authorName: userProfileResult.profile.displayName || 'Anonymous',
          authorAvatar: userProfileResult.profile.avatarUrl || null,
        };
      }
    }
    
    return { 
      success: true, 
      thread: {
        ...thread,
        ...authorData
      }
    };
  } catch (error) {
    console.error("Error fetching thread:", error);
    return { success: false, error: "Failed to fetch thread" };
  }
};

// Vote on a thread
export const voteOnThread = async (threadId, voteType) => {
  try {
    const user = await ensureAuth();
    if (!user.uid) {
      return { success: false, error: "Authentication required" };
    }
    
    const threadRef = ref(database, `threads/${threadId}`);
    const threadSnapshot = await get(threadRef);
    
    if (!threadSnapshot.exists()) {
      return { success: false, error: "Thread not found" };
    }
    
    const thread = threadSnapshot.val();
    const userVotesRef = ref(database, `votes/threads/${threadId}/${user.uid}`);
    const userVoteSnapshot = await get(userVotesRef);
    const currentVote = userVoteSnapshot.exists() ? userVoteSnapshot.val() : null;
    
    let upvotes = thread.upvotes || 0;
    let downvotes = thread.downvotes || 0;
    
    // Remove existing vote if any
    if (currentVote === 'up') {
      upvotes--;
    } else if (currentVote === 'down') {
      downvotes--;
    }
    
    // Add new vote if not removing the current vote
    if (currentVote !== voteType) {
      if (voteType === 'up') {
        upvotes++;
        await set(userVotesRef, 'up');
        
        // Award experience for receiving an upvote
        if (thread.authorId && thread.authorId !== user.uid) {
          await addExperience(thread.authorId, EXP.RECEIVE_UPVOTE, "Received an upvote on a discussion");
          await updateUserStats(thread.authorId, { upvotesReceived: 1 });
          
          // Check achievements after receiving upvotes
          await checkAchievements(thread.authorId);
        }
        
        // Award experience for giving an upvote
        await addExperience(user.uid, EXP.GIVE_UPVOTE, "Gave an upvote");
      } else if (voteType === 'down') {
        downvotes++;
        await set(userVotesRef, 'down');
      } else {
        await set(userVotesRef, null);
      }
    } else {
      // User is toggling off their vote
      await set(userVotesRef, null);
    }
    
    await update(threadRef, { upvotes, downvotes });
    
    return { success: true, upvotes, downvotes };
  } catch (error) {
    console.error("Error voting on thread:", error);
    return { success: false, error: "Failed to vote on thread" };
  }
};

// Get recent threads
export const getRecentThreads = async (limit = 10, startAfter = null, topicId = null) => {
    try {
        // Ensure user is authenticated
        const user = await ensureAuth();
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Reference to the threads in the database
        const threadsRef = ref(database, 'threads');

        // Create a query to fetch threads
        let threadsQuery;
        if (topicId) {
            // If a specific topic is provided, filter by topic
            threadsQuery = query(
                threadsRef, 
                orderByChild('topicId'), 
                equalTo(topicId),
                limitToLast(limit)
            );
        } else {
            // If no topic specified, fetch most recent threads
            threadsQuery = query(
                threadsRef, 
                limitToLast(limit)
            );
        }

        // Fetch the threads
        const snapshot = await get(threadsQuery);

        if (!snapshot.exists()) {
            return [];
        }

        // Convert snapshot to array of threads
        const threadsData = [];
        snapshot.forEach((childSnapshot) => {
            const threadData = childSnapshot.val();
            threadData.id = childSnapshot.key;
            
            // Skip draft threads
            if (!threadData.isDraft) {
                threadsData.push(threadData);
            }
        });

        // Sort threads by creation time (most recent first)
        threadsData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // If startAfter is provided, slice the array
        let resultThreads = startAfter 
            ? threadsData.filter(thread => thread.createdAt < startAfter).slice(0, limit)
            : threadsData.slice(0, limit);

        // Fetch author information for each thread
        const threadsWithAuthors = await Promise.all(
            resultThreads.map(async (thread) => {
                if (thread.authorId) {
                    try {
                        const userRef = ref(database, `users/${thread.authorId}`);
                        const userSnapshot = await get(userRef);
                        
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            thread.authorName = userData.displayName || 'Anonymous User';
                            thread.authorAvatar = userData.photoURL || null;
                        } else {
                            thread.authorName = 'Anonymous User';
                        }
                    } catch (error) {
                        console.error(`Error fetching author for thread ${thread.id}:`, error);
                        thread.authorName = 'Anonymous User';
                    }
                } else {
                    thread.authorName = 'Anonymous User';
                }
                return thread;
            })
        );

        return threadsWithAuthors;
    } catch (error) {
        console.error('Error fetching recent threads:', error);
        throw error;
    }
};

// Bookmark a thread
export const toggleBookmark = async (threadId) => {
  try {
    const user = await ensureAuth();
    if (!user.uid) {
      return { success: false, error: "Authentication required" };
    }
    
    const bookmarkRef = ref(database, `users/${user.uid}/bookmarks/${threadId}`);
    const bookmarkSnapshot = await get(bookmarkRef);
    
    if (bookmarkSnapshot.exists()) {
      // Remove bookmark
      await set(bookmarkRef, null);
      return { success: true, bookmarked: false };
    } else {
      // Add bookmark
      await set(bookmarkRef, { 
        addedAt: Date.now() 
      });
      return { success: true, bookmarked: true };
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return { success: false, error: "Failed to toggle bookmark" };
  }
};

// Check if a thread is bookmarked
export const isThreadBookmarked = async (threadId) => {
  try {
    const user = await ensureAuth();
    if (!user.uid) {
      return { success: false, error: "Authentication required" };
    }
    
    const bookmarkRef = ref(database, `users/${user.uid}/bookmarks/${threadId}`);
    const bookmarkSnapshot = await get(bookmarkRef);
    
    return { success: true, bookmarked: bookmarkSnapshot.exists() };
  } catch (error) {
    console.error("Error checking bookmark:", error);
    return { success: false, error: "Failed to check bookmark" };
  }
};

// Get the current user's ID
export const getCurrentUserId = () => {
  const auth = getAuth();
  const user = auth.currentUser;
  return user ? user.uid : null;
};

// Listen for auth state changes (alias for onAuthStateChanged for backward compatibility)
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Re-export existing functions
export {
  firebaseConfig,
  app,
  auth,
  database,
  storage,
  ensureAuth,
  onAuthStateChanged,
  EXP,
  LEVELS,
  ACHIEVEMENTS,
  // Database functions
  ref,
  push,
  get,
  set,
  update,
  query,
  orderByChild,
  limitToLast,
  onValue,
  equalTo,
  // Storage functions
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
}; 