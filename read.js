import { getThread, getReplies, addReply, voteOnThread, voteOnReply, getCurrentUserId, getUserProfile, onAuthStateChange, database, ref, get, query, orderByChild, equalTo, limitToLast } from './firebase-config.js';

// Global variables
let currentUser = null;
let thread = null;
let replies = [];
let threadId = null;

// DOM element references
let threadContent = null;
let breadcrumbTopic = null;
let threadHeader = null;
let threadBody = null;
let threadActions = null;
let commentsSection = null;
let commentsList = null;
let commentForm = null;
let commentInput = null;
let commentSubmit = null;
let loadMoreCommentsBtn = null;
let repliesCount = null;
let viewsCount = null;
let createdDate = null;
let authorAvatar = null;
let authorName = null;
let authorJoined = null;
let postsCount = null;
let commentsCount = null;
let similarThreads = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Parse thread ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    threadId = urlParams.get('id');
    
    if (!threadId) {
        showError('Thread ID not found in URL. Please go back to the discussions page.');
        return;
    }
    
    // Initialize DOM elements
    threadContent = document.querySelector('.thread-content');
    breadcrumbTopic = document.querySelector('.current-topic');
    threadHeader = document.querySelector('.thread-header');
    threadBody = document.querySelector('.thread-body');
    threadActions = document.querySelector('.thread-actions');
    commentsSection = document.querySelector('.comments-section');
    commentsList = document.querySelector('.comments-list');
    commentForm = document.querySelector('.comment-form');
    commentInput = document.querySelector('.comment-input');
    commentSubmit = document.querySelector('.comment-submit');
    loadMoreCommentsBtn = document.querySelector('.load-more-comments button');
    
    // Sidebar elements
    repliesCount = document.querySelector('.replies-count');
    viewsCount = document.querySelector('.views-count');
    createdDate = document.querySelector('.created-date');
    authorAvatar = document.querySelector('.author-avatar');
    authorName = document.querySelector('.author-name');
    authorJoined = document.querySelector('.author-joined');
    postsCount = document.querySelector('.posts-count');
    commentsCount = document.querySelector('.comments-count');
    similarThreads = document.querySelector('.similar-threads');
    
    // Set up auth listener
    onAuthStateChange((user) => {
        currentUser = user;
        updateAuthUI(user);
        
        // If user signed in, update comment form
        if (commentForm && user) {
            commentForm.style.display = 'flex';
        } else if (commentForm) {
            commentForm.innerHTML = `
                <div class="sign-in-to-comment">
                    <p>Please <a href="signin.html?redirect=read.html?id=${threadId}">sign in</a> to join the discussion</p>
                </div>
            `;
        }
    });
    
    // Load thread and comments
    try {
        await loadThread();
        await loadComments();
    } catch (error) {
        console.error('Error loading thread:', error);
        showError('Failed to load the discussion. Please try again later.');
    }
    
    // Set up event listeners
    if (commentSubmit) {
        commentSubmit.addEventListener('click', handleCommentSubmit);
    }
    
    if (loadMoreCommentsBtn) {
        loadMoreCommentsBtn.addEventListener('click', loadMoreComments);
    }
    
    // Initialize features
    addProfileHoverCard();
    initDiscussionThreads(); // Ensure discussion threads are initialized even if no comments
    
    // Check for avatar images and replace with default if needed
    document.querySelectorAll('.comment-avatar, .user-avatar, .author-avatar').forEach(avatar => {
        const bgImg = getComputedStyle(avatar).backgroundImage;
        
        // If it doesn't have a background image or failed to load
        if (!bgImg || bgImg === 'none') {
            avatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
            avatar.style.display = 'flex';
            avatar.style.alignItems = 'center';
            avatar.style.justifyContent = 'center';
        } else {
            // Check if the image loads successfully
            const img = new Image();
            img.onerror = function() {
                avatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
                avatar.style.backgroundImage = 'none';
                avatar.style.display = 'flex';
                avatar.style.alignItems = 'center';
                avatar.style.justifyContent = 'center';
            };
            
            // Extract URL and check if it loads
            const imgUrl = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
            if (imgUrl && imgUrl[1]) {
                img.src = imgUrl[1];
            }
        }
    });
});

// Load thread and comments
async function loadThread() {
    try {
        const result = await getThread(threadId);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        thread = result.thread;
        renderThread(thread);
        
        // Load thread author info
        if (thread.authorId) {
            loadAuthorInfo(thread.authorId);
        }
        
        // Load similar threads
        loadSimilarThreads(thread.topic);
    } catch (error) {
        console.error('Error fetching thread:', error);
        showError('Failed to load the discussion. Please try again.');
    }
}

// Render thread data to the page
function renderThread(thread) {
    // Update breadcrumb
    if (breadcrumbTopic) {
        breadcrumbTopic.textContent = thread.title || 'Untitled Discussion';
    }
    
    // Update thread header
    if (threadHeader) {
        const createdDate = formatDate(thread.createdAt);
        
        threadHeader.innerHTML = `
            <div class="thread-meta">
                <span class="thread-topic">${thread.topic || 'General'}</span>
                <span class="thread-date">${createdDate}</span>
            </div>
            <h1 class="thread-title">${thread.title}</h1>
            <div class="thread-author-info">
                <a href="profile-view.html?uid=${thread.authorId}" class="author-profile-link">
                <div class="thread-author-avatar">
                    <img src="${thread.authorAvatar || 'images/default-avatar.png'}" alt="${thread.authorName || 'Anonymous'}" />
                </div>
                    <span class="thread-author-name">${thread.authorName || 'Anonymous'}</span>
                </a>
            </div>
        `;
    }
    
    // Update thread body
    if (threadBody) {
        threadBody.innerHTML = thread.content || '';
    }
    
    // Update thread actions
    if (threadActions) {
        const upvoteBtn = threadActions.querySelector('.upvote');
        const downvoteBtn = threadActions.querySelector('.downvote');
        const bookmarkBtn = threadActions.querySelector('.bookmark-button');
        
        if (upvoteBtn) {
            const upvoteCount = upvoteBtn.querySelector('.count');
            upvoteCount.textContent = thread.upvotes || 0;
            
            upvoteBtn.addEventListener('click', () => handleVote('up'));
        }
        
        if (downvoteBtn) {
            const downvoteCount = downvoteBtn.querySelector('.count');
            downvoteCount.textContent = thread.downvotes || 0;
            
            downvoteBtn.addEventListener('click', () => handleVote('down'));
        }
        
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', handleBookmark);
        }
    }
    
    // Update sidebar information
    if (repliesCount) repliesCount.textContent = thread.replyCount || 0;
    if (viewsCount) viewsCount.textContent = thread.viewCount || 0;
    if (createdDate) createdDate.textContent = formatDate(thread.createdAt);
}

// Load comments/replies
async function loadComments() {
    try {
        const result = await getReplies(threadId);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
    replies = result.replies || [];
    
    // Process replies to add author information where missing
            for (const reply of replies) {
        if (reply.authorId && (!reply.authorAvatar || !reply.authorName)) {
                    try {
                // Get user profile
                        const userRef = ref(database, `users/${reply.authorId}`);
                        const userSnapshot = await get(userRef);
                        
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            const profile = userData.profile || {};
                    
                        // Set author details if missing
                        if (!reply.authorName) {
                                reply.authorName = profile.displayName || userData.displayName || 'Anonymous';
                        }
                        
                        if (!reply.authorAvatar) {
                            reply.authorAvatar = profile.photoURL || userData.photoURL || profile.avatarUrl || 'images/default-avatar.png';
                        }
                            }
                        } catch (error) {
                    console.error(`Error fetching author details for reply ${reply.id}:`, error);
                        }
                    }
                }
                
    // Update reply count in thread
    if (repliesCount) {
        repliesCount.textContent = replies.length || 0;
    }
            
    // Show/hide load more button
            if (loadMoreCommentsBtn) {
        loadMoreCommentsBtn.parentElement.style.display = replies.length > 10 ? 'block' : 'none';
    }
    
    // Filter top-level comments (those without parent or those with parent that doesn't exist)
    const validParentIds = new Set(replies.map(reply => reply.id));
    const topLevelComments = replies.filter(reply => 
        !reply.parentId || (reply.parentId && !validParentIds.has(reply.parentId))
    );
    
    // Render comments
    renderComments(topLevelComments);
    
    // Initialize discussion threads
    initDiscussionThreads();
    
    } catch (error) {
    console.error('Error loading comments:', error);
        if (commentsList) {
            commentsList.innerHTML = `
                <div class="error-message">
                <p>Failed to load comments. Please try refreshing the page.</p>
        </div>
            `;
        }
    }
}

// Render comments to the page
function renderComments(comments) {
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
        const commentEl = createCommentElement(comment);
        commentsList.appendChild(commentEl);
    });
    
    // Add event listeners for comment actions
    setupCommentActions();
}

// Create a comment element
function createCommentElement(comment) {
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.dataset.id = comment.id;
    commentEl.dataset.authorId = comment.authorId || '';
    commentEl.dataset.parentId = comment.parentId || '';
    
    // Check if this comment has replies
    const hasReplies = replies.some(reply => reply.parentId === comment.id);
    commentEl.dataset.hasReplies = hasReplies.toString();
    
    const replyCount = replies.filter(reply => reply.parentId === comment.id).length;
    const commentDate = formatDate(comment.createdAt);
    const avatarUrl = comment.authorAvatar || 'images/default-avatar.png';
    
    commentEl.innerHTML = `
        <div class="comment-header">
            <a href="profile-view.html?uid=${comment.authorId}" class="comment-author-link">
                <div class="comment-avatar" style="background-image: url('${avatarUrl}')"></div>
                <div class="comment-info">
                    <div class="comment-author">${comment.authorName || 'Anonymous'}</div>
                    <div class="comment-meta">${commentDate}</div>
                </div>
            </a>
        </div>
        <div class="comment-body">
            <p>${comment.content}</p>
        </div>
        <div class="comment-footer">
            <div class="comment-action upvote" data-id="${comment.id}">
                <span class="material-symbols-rounded">thumb_up</span>
                <span class="count">${comment.upvotes || 0}</span>
            </div>
            <div class="comment-action downvote" data-id="${comment.id}">
                <span class="material-symbols-rounded">thumb_down</span>
                <span class="count">${comment.downvotes || 0}</span>
            </div>
            <div class="comment-action reply" data-id="${comment.id}">
                <span class="material-symbols-rounded">forum</span>
                <span>${hasReplies ? `Replies (${replyCount})` : 'Reply'}</span>
            </div>
        </div>
    `;
    
    // Add fallback for avatar image loading errors
    const avatarElement = commentEl.querySelector('.comment-avatar');
    if (avatarElement) {
        const img = new Image();
        img.onerror = function() {
            avatarElement.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
            avatarElement.style.backgroundImage = 'none';
            avatarElement.style.display = 'flex';
            avatarElement.style.alignItems = 'center';
            avatarElement.style.justifyContent = 'center';
        };
        img.src = avatarUrl;
    }
    
    return commentEl;
}

// Set up comment actions (votes, reply)
function setupCommentActions() {
    const commentUpvotes = document.querySelectorAll('.comment-action.upvote');
    const commentDownvotes = document.querySelectorAll('.comment-action.downvote');
    const commentReplies = document.querySelectorAll('.comment-action.reply');
    
    // Disable voting on own comments if user is logged in
    if (currentUser) {
        document.querySelectorAll('.comment').forEach(comment => {
            const authorId = comment.dataset.authorId;
            if (authorId === currentUser.uid) {
                const upvoteBtn = comment.querySelector('.upvote');
                const downvoteBtn = comment.querySelector('.downvote');
                
                if (upvoteBtn) {
                    upvoteBtn.classList.add('disabled');
                    upvoteBtn.title = 'You cannot vote on your own comment';
                }
                
                if (downvoteBtn) {
                    downvoteBtn.classList.add('disabled');
                    downvoteBtn.title = 'You cannot vote on your own comment';
                }
            }
        });
    }
    
    commentUpvotes.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('disabled')) {
                handleCommentVote(btn.dataset.id, 'up');
            }
        });
    });
    
    commentDownvotes.forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.classList.contains('disabled')) {
                handleCommentVote(btn.dataset.id, 'down');
            }
        });
    });
    
    commentReplies.forEach(btn => {
        btn.addEventListener('click', () => {
            const commentId = btn.dataset.id;
            const comment = document.querySelector(`.comment[data-id="${commentId}"]`);
            
            // Scroll to comment form
            if (commentForm) {
                commentForm.scrollIntoView({ behavior: 'smooth' });
                commentInput.focus();
                
                // Add a reply to tag
                const existingReplyTag = document.querySelector('.replying-to');
                if (existingReplyTag) {
                    existingReplyTag.remove();
                }
                
                const replyTag = document.createElement('div');
                replyTag.className = 'replying-to';
                replyTag.dataset.commentId = commentId;
                replyTag.innerHTML = `
                    <p>Replying to <strong>${comment.querySelector('.comment-author').textContent}</strong></p>
                    <button class="cancel-reply">
                        <span class="material-symbols-rounded">close</span>
                        </button>
                `;
                commentForm.insertBefore(replyTag, commentForm.firstChild);
                
                // Add event listener to cancel reply
                const cancelReply = replyTag.querySelector('.cancel-reply');
                if (cancelReply) {
                    cancelReply.addEventListener('click', () => {
                        replyTag.remove();
                    });
                }
            }
        });
    });
}

// Handle comment submission
async function handleCommentSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please sign in to comment');
        return;
    }
    
    const content = commentInput.value.trim();
    if (!content) {
        alert('Please enter a comment');
        return;
    }
    
    // Disable form while submitting
    commentSubmit.disabled = true;
    commentSubmit.innerHTML = '<span class="loading-spinner"></span> Posting...';
    
    try {
        // Create reply data
        const replyData = {
            content,
            authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Anonymous',
        authorAvatar: currentUser.photoURL || 'images/default-avatar.png'
        };
        
        // Check if this is a reply to another comment
        const replyingTo = document.querySelector('.replying-to');
        if (replyingTo) {
            const commentId = replyingTo.dataset.commentId;
            if (commentId) {
                replyData.parentId = commentId;
            }
        }
        
        console.log('Submitting reply:', replyData);
        
        // Add reply to Firebase
        const result = await addReply(threadId, replyData);
        
        console.log('Reply result:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Clear form
        commentInput.value = '';
        
        // Remove reply tag if exists
        if (replyingTo) {
            replyingTo.remove();
        }
        
        // Reload comments
        await loadComments();
        
        // Update reply count in sidebar
        if (repliesCount) {
            repliesCount.textContent = parseInt(repliesCount.textContent || '0') + 1;
        }
    } catch (error) {
        console.error('Error adding reply:', error);
        alert('Failed to post reply. Please try again.');
    } finally {
        // Re-enable form
        commentSubmit.disabled = false;
        commentSubmit.innerHTML = 'Reply';
    }
}

// Handle thread voting
async function handleVote(voteType) {
    if (!currentUser) {
        alert('Please sign in to vote');
        return;
    }
    
    // Prevent voting on own thread
    if (thread.authorId === currentUser.uid) {
        alert('You cannot vote on your own discussion');
        return;
    }
    
    try {
        const result = await voteOnThread(threadId, voteType);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Update UI
        const upvoteBtn = threadActions.querySelector('.upvote');
        const downvoteBtn = threadActions.querySelector('.downvote');
        
        if (upvoteBtn) {
            const upvoteCount = upvoteBtn.querySelector('.count');
            upvoteCount.textContent = result.upvotes || 0;
            
            if (voteType === 'up') {
                upvoteBtn.classList.toggle('active');
                downvoteBtn.classList.remove('active');
            }
        }
        
        if (downvoteBtn) {
            const downvoteCount = downvoteBtn.querySelector('.count');
            downvoteCount.textContent = result.downvotes || 0;
            
            if (voteType === 'down') {
                downvoteBtn.classList.toggle('active');
                upvoteBtn.classList.remove('active');
            }
        }
    } catch (error) {
        console.error('Error voting on thread:', error);
        alert('Failed to vote. Please try again.');
    }
}

// Handle comment voting
async function handleCommentVote(commentId, voteType) {
    if (!currentUser) {
        alert('Please sign in to vote');
        return;
    }
    
    // Get the comment element
    const comment = document.querySelector(`.comment[data-id="${commentId}"]`);
    if (!comment) return;
    
    // Get the comment author ID
    const authorId = comment.getAttribute('data-author-id');
    
    // Prevent voting on own comment
    if (authorId === currentUser.uid) {
        alert('You cannot vote on your own comment');
        return;
    }
    
    try {
        const result = await voteOnReply(threadId, commentId, voteType);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Update UI
        const upvoteBtn = comment.querySelector('.upvote');
        const downvoteBtn = comment.querySelector('.downvote');
        
        if (upvoteBtn) {
            const upvoteCount = upvoteBtn.querySelector('.count');
            upvoteCount.textContent = result.upvotes || 0;
            
            if (voteType === 'up') {
                upvoteBtn.classList.toggle('active');
                downvoteBtn.classList.remove('active');
            }
        }
        
        if (downvoteBtn) {
            const downvoteCount = downvoteBtn.querySelector('.count');
            downvoteCount.textContent = result.downvotes || 0;
            
            if (voteType === 'down') {
                downvoteBtn.classList.toggle('active');
                upvoteBtn.classList.remove('active');
            }
        }
    } catch (error) {
        console.error('Error voting on comment:', error);
        alert('Failed to vote on comment. Please try again.');
    }
}

// Handle bookmark
function handleBookmark() {
    if (!currentUser) {
        alert('Please sign in to bookmark discussions');
        return;
    }
    
    // Toggle bookmark UI state
    const bookmarkBtn = threadActions.querySelector('.bookmark-button');
    bookmarkBtn.classList.toggle('active');
    
    // TODO: Implement bookmark functionality with Firebase
    console.log('Bookmark functionality not yet implemented');
}

// Load more comments
function loadMoreComments() {
    // In this implementation we're loading all comments at once
    // This is just a placeholder for a pagination feature
    loadMoreCommentsBtn.parentElement.style.display = 'none';
}

// Load thread author information
async function loadAuthorInfo(authorId) {
    try {
        // Get user reference
        const userRef = ref(database, `users/${authorId}`);
        const userSnapshot = await get(userRef);
        
        if (!userSnapshot.exists()) {
            console.log('User not found');
            return;
        }
        
        const userData = userSnapshot.val();
        const profile = userData.profile || {};
        
        // Get photoURL from either profile or user data
    // Check all possible locations where avatar URL could be stored
    const photoURL = profile.photoURL || userData.photoURL || profile.avatarUrl || 'images/default-avatar.png';
    
    console.log('Author avatar URL:', photoURL); // Debug log
        
        // Update author info in thread header
        const authorAvatarEl = document.querySelector('.thread-author-avatar');
        const authorNameEl = document.querySelector('.thread-author-name');
        
        if (authorAvatarEl) {
        authorAvatarEl.style.backgroundImage = `url('${photoURL}')`;
        
        // Fallback if image fails to load
        const img = new Image();
        img.onerror = function() {
            authorAvatarEl.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
            authorAvatarEl.style.backgroundImage = 'none';
            authorAvatarEl.style.display = 'flex';
            authorAvatarEl.style.alignItems = 'center';
            authorAvatarEl.style.justifyContent = 'center';
        };
        img.src = photoURL;
        }
        
        if (authorNameEl) {
            authorNameEl.textContent = profile.displayName || userData.displayName || 'Anonymous';
        }
        
        // Update author info in sidebar
        if (authorAvatar) {
        authorAvatar.style.backgroundImage = `url('${photoURL}')`;
        
        // Fallback if image fails to load
        const img = new Image();
        img.onerror = function() {
            authorAvatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
            authorAvatar.style.backgroundImage = 'none';
            authorAvatar.style.display = 'flex';
            authorAvatar.style.alignItems = 'center';
            authorAvatar.style.justifyContent = 'center';
        };
        img.src = photoURL;
        }
        
            if (authorName) {
            authorName.textContent = profile.displayName || userData.displayName || 'Anonymous';
        }
        
        if (authorJoined && userData.createdAt) {
            authorJoined.textContent = `Member since: ${formatDate(userData.createdAt, true)}`;
        }
        
        // Update view count
        if (viewsCount && thread.viewCount) {
            viewsCount.textContent = thread.viewCount;
        }
        
        if (postsCount) {
            postsCount.textContent = userData.stats?.threadCount || 0;
        }
        
        if (commentsCount) {
            commentsCount.textContent = userData.stats?.replyCount || 0;
        }
    } catch (error) {
        console.error('Error loading author info:', error);
    }
}

// Load similar threads
async function loadSimilarThreads(topic) {
    if (!similarThreads || !topic) return;
    
    try {
        // Clear loading state
        similarThreads.innerHTML = '';
        
        // Get all threads and filter client-side
        const threadsRef = ref(database, 'threads');
        const allThreadsQuery = query(threadsRef, limitToLast(20));
        
        const snapshot = await get(allThreadsQuery);
        
        if (!snapshot.exists()) {
            similarThreads.innerHTML = '<p>No similar discussions found</p>';
            return;
        }
        
        let similarThreadsData = [];
        
        snapshot.forEach(childSnapshot => {
            const threadData = childSnapshot.val();
            threadData.id = childSnapshot.key;
            
            // Skip current thread, draft threads, and threads with different topics
            if (threadData.id !== threadId && 
                !threadData.isDraft && 
                threadData.topic === topic) {
                similarThreadsData.push(threadData);
            }
        });
        
        // Sort by creation date (newest first)
        similarThreadsData.sort((a, b) => b.createdAt - a.createdAt);
        
        // Limit to 3 threads
        similarThreadsData = similarThreadsData.slice(0, 3);
        
        if (similarThreadsData.length === 0) {
            similarThreads.innerHTML = '<p>No similar discussions found</p>';
            return;
        }
        
        // Fetch author info for each thread
        for (const threadData of similarThreadsData) {
            if (threadData.authorId) {
                try {
                    const userRef = ref(database, `users/${threadData.authorId}`);
                    const userSnapshot = await get(userRef);
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        const profile = userData.profile || {};
                        threadData.authorName = profile.displayName || userData.displayName || 'Anonymous';
                } else {
                        threadData.authorName = 'Anonymous';
                    }
                } catch (error) {
                    console.error('Error fetching author:', error);
                    threadData.authorName = 'Anonymous';
                }
            } else {
                threadData.authorName = 'Anonymous';
            }
            
            const threadEl = document.createElement('div');
            threadEl.className = 'similar-thread';
            threadEl.innerHTML = `
                <a href="read.html?id=${threadData.id}" class="similar-thread-title">${threadData.title}</a>
                <div class="similar-thread-meta">
                    <span>${threadData.authorName}</span>
                    <span>${formatDate(threadData.createdAt)}</span>
                </div>
            `;
            similarThreads.appendChild(threadEl);
        }
    } catch (error) {
        console.error('Error loading similar threads:', error);
        similarThreads.innerHTML = '<p>Failed to load similar discussions</p>';
    }
}

// Update UI based on auth state
function updateAuthUI(user) {
    const loginBtn = document.querySelector('.login-btn');
    const signupBtn = document.querySelector('.signup-btn');
    const profileBtn = document.querySelector('.profile-btn');
    
    if (!loginBtn || !signupBtn) return;
    
    currentUser = user; // Store current user for later use
    
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
            
            // Check if user is the author of the thread
            if (thread && thread.authorId === user.uid) {
                // Disable voting buttons if user is the author
                const upvoteBtn = document.querySelector('.thread-votes .upvote');
                const downvoteBtn = document.querySelector('.thread-votes .downvote');
                
                if (upvoteBtn) {
                    upvoteBtn.disabled = true;
                    upvoteBtn.title = 'You cannot vote on your own discussion';
                    upvoteBtn.classList.add('disabled');
                }
                
                if (downvoteBtn) {
                    downvoteBtn.disabled = true;
                    downvoteBtn.title = 'You cannot vote on your own discussion';
                    downvoteBtn.classList.add('disabled');
                }
            }
        } else {
            // User is signed out
            if (loginBtn) loginBtn.style.display = 'inline-flex';
            if (signupBtn) signupBtn.style.display = 'inline-flex';
            if (profileBtn) profileBtn.style.display = 'none';
        }
    }
    
    // Show error message
    function showError(message) {
    if (threadContent) {
        threadContent.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-rounded">error</span>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.href='explore.html'">Back to Discussions</button>
                </div>
            `;
    } else {
        // If thread content element doesn't exist, create an error message in the main container
        const container = document.querySelector('.read-container') || document.body;
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.innerHTML = `
            <span class="material-symbols-rounded">error</span>
            <h3>Something went wrong</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="window.location.href='explore.html'">Back to Discussions</button>
        `;
        container.prepend(errorEl);
    }
    
    console.error(message);
    }
    
    // Format date helper
    function formatDate(timestamp, fullDate = false) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        
        if (fullDate) {
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
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
    
    // Add profile hover card functionality
    function addProfileHoverCard() {
        if (!thread.authorData) return;
        
        // Create hover card element if it doesn't exist
        let hoverCard = document.querySelector('.profile-hover-card');
        if (!hoverCard) {
            hoverCard = document.createElement('div');
            hoverCard.className = 'profile-hover-card';
            document.body.appendChild(hoverCard);
        }
        
        // Populate hover card with author data
        hoverCard.innerHTML = `
            <div class="hover-card-content">
                <div class="hover-card-header">
                    <div class="hover-avatar" style="background-image: url('${thread.authorData.avatarUrl}')"></div>
                    <div class="hover-user-info">
                        <div class="hover-user-name">${thread.authorData.displayName}</div>
                        <div class="hover-user-joined">Member since: ${formatDate(thread.authorData.joinDate, true)}</div>
                    </div>
                        </div>
                <div class="hover-card-body">
                    <div class="hover-user-bio">${thread.authorData.bio || 'No bio available'}</div>
                    <div class="hover-user-stats">
                        <div class="hover-stat">
                            <span class="hover-stat-value">${thread.authorData.threadCount}</span>
                            <span class="hover-stat-label">Posts</span>
                        </div>
                        <div class="hover-stat">
                            <span class="hover-stat-value">${thread.authorData.replyCount}</span>
                            <span class="hover-stat-label">Comments</span>
                    </div>
                </div>
                    </div>
                <div class="hover-card-footer">
                    <a href="profile-view.html?uid=${thread.authorId}" class="hover-profile-link">View Full Profile</a>
                </div>
            `;
            
        // Add hover event listeners to author elements
        const authorLink = document.querySelector('.author-profile-link');
        if (authorLink) {
            authorLink.addEventListener('mouseenter', (e) => showHoverCard(e, thread.authorData, thread.authorId));
            authorLink.addEventListener('mouseleave', hideHoverCard);
        }
        
        // Also add hover to sidebar author info
        const sidebarAuthorInfo = document.querySelector('.author-info');
        if (sidebarAuthorInfo) {
            sidebarAuthorInfo.addEventListener('mouseenter', (e) => showHoverCard(e, thread.authorData, thread.authorId));
            sidebarAuthorInfo.addEventListener('mouseleave', hideHoverCard);
        }
        
        // Add hover to comment author links
        const commentAuthorLinks = document.querySelectorAll('.comment-author-link');
        commentAuthorLinks.forEach(link => {
            const commentEl = link.closest('.comment');
            if (commentEl) {
                const authorId = commentEl.dataset.authorId;
                if (authorId) {
                    // Fetch author data for this comment if needed
                    fetchCommentAuthorData(authorId, link);
                }
            }
        });
        
        function showHoverCard(e, authorData, authorId) {
            const rect = e.currentTarget.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            
            // Update hover card content with the specific author's data
            const hoverCardContent = hoverCard.querySelector('.hover-card-content');
            if (hoverCardContent && authorData) {
                hoverCardContent.innerHTML = `
                    <div class="hover-card-header">
                        <div class="hover-avatar" style="background-image: url('${authorData.avatarUrl}')"></div>
                        <div class="hover-user-info">
                            <div class="hover-user-name">${authorData.displayName}</div>
                            <div class="hover-user-joined">Member since: ${formatDate(authorData.joinDate, true)}</div>
                    </div>
                        </div>
                    <div class="hover-card-body">
                        <div class="hover-user-bio">${authorData.bio || 'No bio available'}</div>
                        <div class="hover-user-stats">
                            <div class="hover-stat">
                                <span class="hover-stat-value">${authorData.threadCount}</span>
                                <span class="hover-stat-label">Posts</span>
                        </div>
                            <div class="hover-stat">
                                <span class="hover-stat-value">${authorData.replyCount}</span>
                                <span class="hover-stat-label">Comments</span>
                        </div>
                        </div>
                    </div>
                    <div class="hover-card-footer">
                        <a href="profile.html?uid=${authorId}" class="hover-profile-link">View Full Profile</a>
                    </div>
                `;
            }
            
            // Calculate position
            let leftPos = rect.left + window.scrollX;
            
            // Adjust if would go off screen
            if (leftPos + 300 > windowWidth) {
                leftPos = windowWidth - 310;
            }
            
            // Position the hover card
            hoverCard.style.top = `${rect.bottom + window.scrollY + 10}px`;
            hoverCard.style.left = `${leftPos}px`;
            
            // Show the hover card
            hoverCard.classList.add('active');
        }
        
        function hideHoverCard() {
            // Hide the hover card with a small delay to allow moving to the card
            setTimeout(() => {
                if (!hoverCard.matches(':hover')) {
                    hoverCard.classList.remove('active');
                }
            }, 300);
        }
        
        // Allow hovering on the card itself
        hoverCard.addEventListener('mouseenter', () => {
            hoverCard.classList.add('active');
        });
        
        hoverCard.addEventListener('mouseleave', () => {
            hoverCard.classList.remove('active');
        });
        
        // Fetch author data for comments
        async function fetchCommentAuthorData(authorId, linkElement) {
            try {
                // Check if we already have this author's data cached
                if (!window.authorDataCache) {
                    window.authorDataCache = {};
                }
                
                if (window.authorDataCache[authorId]) {
                    // Use cached data
                    linkElement.addEventListener('mouseenter', (e) => showHoverCard(e, window.authorDataCache[authorId], authorId));
                    linkElement.addEventListener('mouseleave', hideHoverCard);
                    return;
                }
                
                // Fetch user data
                const userRef = ref(database, `users/${authorId}`);
                const userSnapshot = await get(userRef);
                
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    const profile = userData.profile || {};
                    
                    // Get photoURL from either profile or user data
                    const photoURL = profile.avatarUrl || userData.photoURL || 'images/default-avatar.png';
                    
                    // Create author data object
                    const authorData = {
                        displayName: profile.displayName || userData.displayName || 'Anonymous',
                        avatarUrl: photoURL,
                        bio: profile.bio || userData.bio || '',
                        joinDate: userData.createdAt,
                        threadCount: userData.stats?.threadCount || 0,
                        replyCount: userData.stats?.replyCount || 0
                    };
                    
                    // Cache the data
                    window.authorDataCache[authorId] = authorData;
                    
                    // Add event listeners
                    linkElement.addEventListener('mouseenter', (e) => showHoverCard(e, authorData, authorId));
                    linkElement.addEventListener('mouseleave', hideHoverCard);
                }
            } catch (error) {
                console.error('Error fetching comment author data:', error);
            }
        }
    }

// Initialize discussion threads sidebar functionality
function initDiscussionThreads() {
    // Elements
    const readContainer = document.querySelector('.read-container');
    
    // Create sidebar if it doesn't exist
    let discussionSidebar = document.querySelector('.discussion-sidebar');
    if (!discussionSidebar) {
        discussionSidebar = document.createElement('div');
        discussionSidebar.className = 'discussion-sidebar';
        document.body.appendChild(discussionSidebar);
        
        // Create sidebar header
        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'sidebar-header';
        sidebarHeader.innerHTML = '<h3>Discussion Thread</h3>';
        discussionSidebar.appendChild(sidebarHeader);
        
        // Create sidebar actions container
        const sidebarActions = document.createElement('div');
        sidebarActions.className = 'sidebar-actions';
        
        // Create fullscreen toggle button
        const fullscreenToggle = document.createElement('button');
        fullscreenToggle.className = 'fullscreen-toggle';
        fullscreenToggle.innerHTML = '<span class="material-symbols-rounded">fullscreen</span>';
        fullscreenToggle.setAttribute('aria-label', 'Toggle fullscreen');
        
        // Create close sidebar button
        const closeSidebarButton = document.createElement('button');
        closeSidebarButton.className = 'close-sidebar';
        closeSidebarButton.innerHTML = '<span class="material-symbols-rounded">close</span>';
        closeSidebarButton.setAttribute('aria-label', 'Close thread');
        
        // Add buttons to sidebar actions
        sidebarActions.appendChild(fullscreenToggle);
        sidebarActions.appendChild(closeSidebarButton);
        sidebarHeader.appendChild(sidebarActions);
        
        // Create thread container
        const threadContainer = document.createElement('div');
        threadContainer.id = 'thread-container';
        threadContainer.className = 'thread-container';
        discussionSidebar.appendChild(threadContainer);
        
        // Create overlay for mobile sidebar
        const sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        sidebarOverlay.style.position = 'fixed';
        sidebarOverlay.style.top = '0';
        sidebarOverlay.style.left = '0';
        sidebarOverlay.style.width = '100%';
        sidebarOverlay.style.height = '100%';
        sidebarOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        sidebarOverlay.style.zIndex = '999';
        sidebarOverlay.style.opacity = '0';
        sidebarOverlay.style.visibility = 'hidden';
        sidebarOverlay.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
        document.body.appendChild(sidebarOverlay);
        
        // Event Listeners
        closeSidebarButton.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        
        // Toggle fullscreen mode
        fullscreenToggle.addEventListener('click', function() {
            discussionSidebar.classList.toggle('fullscreen');
            updateFullscreenIcon();
        });
        
        function updateFullscreenIcon() {
            if (discussionSidebar.classList.contains('fullscreen')) {
                fullscreenToggle.innerHTML = '<span class="material-symbols-rounded">fullscreen_exit</span>';
            } else {
                fullscreenToggle.innerHTML = '<span class="material-symbols-rounded">fullscreen</span>';
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Escape to close sidebar
            if (e.key === 'Escape' && discussionSidebar.classList.contains('active')) {
                closeSidebar();
            }
            
            // Ctrl+Enter to submit reply
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                const replyInput = document.querySelector('.reply-input');
                const replySubmit = document.querySelector('.reply-submit');
                if (document.activeElement === replyInput && replySubmit) {
                    replySubmit.click();
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 1100 && discussionSidebar.classList.contains('active')) {
                sidebarOverlay.style.opacity = '0';
                sidebarOverlay.style.visibility = 'hidden';
            }
        });
    }
    
    // Setup Reply Buttons
    setupReplyButtons();
    
    // Close Sidebar Function
    function closeSidebar() {
        // Update container to hide sidebar
        if (readContainer) {
            readContainer.classList.remove('sidebar-open');
        }
        
        discussionSidebar.classList.remove('active');
        discussionSidebar.classList.remove('fullscreen');
        
        const sidebarOverlay = document.querySelector('.sidebar-overlay');
        if (sidebarOverlay) {
            sidebarOverlay.style.opacity = '0';
            sidebarOverlay.style.visibility = 'hidden';
        }
        
        const replyButtons = document.querySelectorAll('.comment-action.reply');
        replyButtons.forEach(button => button.classList.remove('active'));
        
        // Update fullscreen icon
        const fullscreenToggle = document.querySelector('.fullscreen-toggle');
        if (fullscreenToggle) {
            fullscreenToggle.innerHTML = '<span class="material-symbols-rounded">fullscreen</span>';
        }
    }
    
    // Setup Reply Buttons
    function setupReplyButtons() {
        const replyButtons = document.querySelectorAll('.comment-action.reply');
        replyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commentId = this.dataset.id;
                openThread(commentId);
            });
        });
    }
}

// Process and render replies correctly, including deeply nested ones
async function renderReplies(commentReplies, parentId, level = 0) {
    let html = '';
    
    // Build a map of all replies for quick reference
    const replyMap = new Map();
    commentReplies.forEach(reply => {
        replyMap.set(reply.id, reply);
    });
    
    // Get direct replies to the current parent
    const directReplies = commentReplies.filter(reply => reply.parentId === parentId);
    
    // Add each direct reply and recursively process its children
    for (const reply of directReplies) {
        // Determine if this is a nested reply
        const isNested = level > 0;
        
        // Add the current reply
        html += createThreadReplyHTML(reply, isNested);
        
        // Recursively get all children of this reply (up to 5 levels deep to prevent infinite recursion)
        if (level < 5) {
            html += await renderReplies(commentReplies, reply.id, level + 1);
        }
    }
    
    return html;
}

// Open Thread Function to show discussion thread in sidebar
async function openThread(commentId) {
    const readContainer = document.querySelector('.read-container');
    const discussionSidebar = document.querySelector('.discussion-sidebar');
    const threadContainer = document.getElementById('thread-container');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    
    if (!threadContainer || !discussionSidebar) return;
    
    // Update container to show sidebar
    if (readContainer) {
        readContainer.classList.add('sidebar-open');
    }
    
    // Show sidebar on mobile
    discussionSidebar.classList.add('active');
    if (sidebarOverlay) {
        sidebarOverlay.style.opacity = '1';
        sidebarOverlay.style.visibility = 'visible';
    }
    
    // Set active state on reply button
    const replyButtons = document.querySelectorAll('.comment-action.reply');
    replyButtons.forEach(button => button.classList.remove('active'));
    
    const replyButton = document.querySelector(`.comment-action.reply[data-id="${commentId}"]`);
    if (replyButton) {
        replyButton.classList.add('active');
    }
    
    // Set active state on the comment
    const comments = document.querySelectorAll('.comment');
    comments.forEach(comment => comment.classList.remove('active'));
    
    const activeComment = document.querySelector(`.comment[data-id="${commentId}"]`);
    if (activeComment) {
        activeComment.classList.add('active');
    }
    
    // Show loading state
    threadContainer.innerHTML = `
        <div class="loading-thread">
            <div class="loading-spinner"></div>
            <p>Loading thread...</p>
        </div>
    `;
    
    try {
        // Find the original comment
        const originalComment = replies.find(reply => reply.id === commentId);
        if (!originalComment) throw new Error('Comment not found');
        
        // Get all replies related to this thread (including replies to replies)
        const allThreadReplies = replies.filter(reply => {
            // Direct replies to this comment
            if (reply.parentId === commentId) return true;
            
            // Check if it's a nested reply by traversing up the chain
            let currentReply = reply;
            let parentFound = false;
            let depth = 0;
            const maxDepth = 10; // Prevent infinite loops
            
            while (currentReply.parentId && depth < maxDepth) {
                const parent = replies.find(r => r.id === currentReply.parentId);
                if (!parent) break;
                
                if (parent.id === commentId) {
                    parentFound = true;
                    break;
                }
                
                currentReply = parent;
                depth++;
            }
            
            return parentFound;
        });
        
        // Ensure all avatars are loaded
        for (const reply of [originalComment, ...allThreadReplies]) {
            if (reply.authorId && !reply.authorAvatar) {
                try {
                    const userRef = ref(database, `users/${reply.authorId}`);
                    const userSnapshot = await get(userRef);
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        const profile = userData.profile || {};
                        reply.authorAvatar = profile.photoURL || userData.photoURL || profile.avatarUrl || 'images/default-avatar.png';
                    }
                } catch (error) {
                    console.error(`Error fetching avatar for reply ${reply.id}:`, error);
                }
            }
        }
        
        // Create thread content
        let threadHTML = `
            <div class="thread-original-comment" data-id="${originalComment.id}">
                <div class="comment-avatar" style="background-image: url('${originalComment.authorAvatar || 'images/default-avatar.png'}')"></div>
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">${originalComment.authorName || 'Anonymous'}</div>
                        <div class="comment-meta">${formatDate(originalComment.createdAt)}</div>
                    </div>
                    <div class="comment-body">
                        <p>${originalComment.content}</p>
                    </div>
                </div>
            </div>
            
            <div class="thread-replies">
        `;
        
        // Check if there are any replies
        if (allThreadReplies.length > 0) {
            // Render all replies with proper nesting
            threadHTML += await renderReplies(allThreadReplies, commentId);
        } else {
            threadHTML += `
                <div class="empty-thread">
                    <span class="material-symbols-rounded">forum</span>
                    <p>No replies yet. Be the first to reply!</p>
                </div>
            `;
        }
        
        // Close thread-replies div and add reply form
        threadHTML += `
            </div>
            
            <div class="thread-reply-form">
                <div class="user-avatar">
                    ${currentUser?.photoURL 
                        ? `<img src="${currentUser.photoURL}" alt="${currentUser.displayName || 'User'}" onerror="this.onerror=null; this.innerHTML='<span class=\\'material-symbols-rounded\\'>person_outline</span>'; this.style.backgroundImage='none';">`
                        : `<span class="material-symbols-rounded">person_outline</span>`
                    }
                </div>
                <div class="reply-input-container">
                    <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                    <button class="btn btn-primary reply-submit" data-parent-id="${commentId}">Reply</button>
                </div>
            </div>
        `;
        
        // Load the thread content
        threadContainer.innerHTML = threadHTML;
        
        // Make sure the initial reply is directly to the main comment (not showing "Replying to")
        const replyInput = threadContainer.querySelector('.reply-input');
        if (replyInput) {
            // Clear any previous reply-to data
            replyInput.dataset.replyToId = commentId; // Set to the main comment ID
            
            // Remove any existing replying-to indicator
            const existingIndicator = threadContainer.querySelector('.replying-to-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
        }
        
        // Setup thread reply functionality
        setupThreadReplyButtons();
        setupThreadReplyForm();
        
        // Remove any "is-replying-to" classes
        threadContainer.querySelectorAll('.thread-reply.is-replying-to').forEach(reply => {
            reply.classList.remove('is-replying-to');
        });
        
        // Add fallback for avatar image loading errors
        threadContainer.querySelectorAll('.comment-avatar').forEach(avatar => {
            const bgImg = getComputedStyle(avatar).backgroundImage;
            
            // If it has a background image, check if it loads
            if (bgImg && bgImg !== 'none') {
                const img = new Image();
                img.onerror = function() {
                    avatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
                    avatar.style.backgroundImage = 'none';
                    avatar.style.display = 'flex';
                    avatar.style.alignItems = 'center';
                    avatar.style.justifyContent = 'center';
                };
                
                // Extract URL and check if it loads
                const imgUrl = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
                if (imgUrl && imgUrl[1]) {
                    img.src = imgUrl[1];
                }
            }
        });
        
    } catch (error) {
        console.error('Error loading thread:', error);
        threadContainer.innerHTML = `
            <div class="thread-error">
                <span class="material-symbols-rounded">error</span>
                <p>Failed to load thread. Please try again.</p>
            </div>
        `;
    }
}

// Helper function to create thread reply HTML
function createThreadReplyHTML(reply, isNested) {
    const avatarUrl = reply.authorAvatar || 'images/default-avatar.png';
    
    return `
        <div class="thread-reply ${isNested ? 'nested-reply' : ''}" data-id="${reply.id}">
            <div class="comment-avatar" style="background-image: url('${avatarUrl}')"></div>
            <div class="comment-content">
                <div class="comment-header">
                    <div class="comment-author">${reply.authorName || 'Anonymous'}</div>
                    <div class="comment-meta">${formatDate(reply.createdAt)}</div>
                </div>
                <div class="comment-body">
                    <p>${reply.content}</p>
                </div>
                <div class="comment-footer">
                    <button class="comment-action upvote" data-id="${reply.id}">
                        <span class="material-symbols-rounded">thumb_up</span>
                        <span class="count">${reply.upvotes || 0}</span>
                    </button>
                    <button class="comment-action reply-to-thread" data-author="${reply.authorName || 'Anonymous'}">
                        <span class="material-symbols-rounded">reply</span>
                        Reply
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Setup thread reply buttons
function setupThreadReplyButtons() {
    const threadReplyButtons = document.querySelectorAll('.comment-action.reply-to-thread');
    threadReplyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const replyForm = document.querySelector('.thread-reply-form');
            if (!replyForm) return;
            
            replyForm.style.display = 'flex';
            
            // Focus on textarea and add @ mention if replying to a specific comment
            const replyInput = replyForm.querySelector('.reply-input');
            if (!replyInput) return;
            
            replyInput.focus();
            
            // Get the author from data attribute
            const authorName = this.getAttribute('data-author');
            
            // Get the parent reply element
            const threadReply = this.closest('.thread-reply');
            if (!threadReply) {
                // If replying to the original comment
                const originalComment = document.querySelector('.thread-original-comment');
                if (originalComment) {
                    const parentId = originalComment.dataset.id;
                    replyInput.dataset.replyToId = parentId;
                    
                    // Only add @ mention if author name is available
                    if (authorName) {
                        replyInput.value = `@${authorName} `;
                        replyInput.setSelectionRange(authorName.length + 2, authorName.length + 2);
                    }
                }
                return;
            }
            
            // Store the ID of the comment being replied to
            const parentId = threadReply.dataset.id;
            replyInput.dataset.replyToId = parentId;
            
            // Add visual indicator to show which comment is being replied to
            document.querySelectorAll('.thread-reply').forEach(reply => {
                reply.classList.remove('is-replying-to');
            });
            threadReply.classList.add('is-replying-to');
            
            // Add @ mention if available
            if (authorName) {
                replyInput.value = `@${authorName} `;
                replyInput.setSelectionRange(authorName.length + 2, authorName.length + 2);
            }
            
            // Create a "replying to" indicator above the input
            const replyingToIndicator = document.createElement('div');
            replyingToIndicator.className = 'replying-to-indicator';
            
            // Remove any existing indicator
            const existingIndicator = replyForm.querySelector('.replying-to-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            replyingToIndicator.innerHTML = `
                <div class="replying-to-text">
                    <span class="material-symbols-rounded">reply</span>
                    Replying to ${authorName || 'comment'}
                </div>
                <button class="cancel-reply-to" type="button">
                    <span class="material-symbols-rounded">close</span>
                </button>
            `;
            
            replyForm.insertBefore(replyingToIndicator, replyForm.firstChild);
            
            // Add cancel button event listener
            const cancelButton = replyingToIndicator.querySelector('.cancel-reply-to');
            if (cancelButton) {
                cancelButton.addEventListener('click', function() {
                    replyingToIndicator.remove();
                    replyInput.dataset.replyToId = '';
                    replyInput.value = '';
                    threadReply.classList.remove('is-replying-to');
                });
            }
            
            // Scroll to reply form
            replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });
}

// Setup thread reply form
function setupThreadReplyForm() {
    const replySubmit = document.querySelector('.reply-submit');
    const replyInput = document.querySelector('.reply-input');
    
    if (replySubmit && replyInput) {
        replySubmit.addEventListener('click', async function() {
            const content = replyInput.value.trim();
            if (!content) {
                alert('Please enter a reply');
                return;
            }
            
            if (!currentUser) {
                alert('Please sign in to reply');
                return;
            }
            
            // Disable button
            replySubmit.disabled = true;
            replySubmit.innerHTML = '<span class="loading-spinner"></span> Posting...';
            
            try {
                // Determine the parent ID
                let parentId;
                
                // If replying to a reply (nested comment) and content starts with @
                if (content.startsWith('@') && replyInput.dataset.replyToId) {
                    // Get the ID from the replyInput's data attribute
                    parentId = replyInput.dataset.replyToId;
                } else {
                    // If replying directly to the original comment
                    parentId = replySubmit.dataset.parentId;
                }
                
                // Create reply data
                const replyData = {
                    content,
                    authorId: currentUser.uid,
                    authorName: currentUser.displayName || 'Anonymous',
                    authorAvatar: currentUser.photoURL || 'images/default-avatar.png',
                    parentId,
                    createdAt: new Date().toISOString()
                };
                
                // Add reply to Firebase
                const result = await addReply(threadId, replyData);
                
                if (result.error) {
                    throw new Error(result.error);
                }
                
                // Clear input
                replyInput.value = '';
                
                // Remove any replying-to indicator
                const replyingToIndicator = document.querySelector('.replying-to-indicator');
                if (replyingToIndicator) {
                    replyingToIndicator.remove();
                }
                
                // Clear reply-to data (but keep parentId as the main comment)
                if (content.startsWith('@')) {
                    // If this was a reply to a specific comment, reset to main comment
                    replyInput.dataset.replyToId = replySubmit.dataset.parentId;
                }
                
                // Remove any highlighting
                document.querySelectorAll('.thread-reply.is-replying-to').forEach(reply => {
                    reply.classList.remove('is-replying-to');
                });
                
                // Reload comments
                await loadComments();
                
                // Reopen the thread to show the new reply
                openThread(parentId);
                
                // Update reply count in sidebar
                if (repliesCount) {
                    repliesCount.textContent = parseInt(repliesCount.textContent || '0') + 1;
                }
                
            } catch (error) {
                console.error('Error adding reply:', error);
                alert('Failed to post reply. Please try again.');
            } finally {
                // Re-enable button
                replySubmit.disabled = false;
                replySubmit.innerHTML = 'Reply';
            }
        });
    }
} 