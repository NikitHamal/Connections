import { getThread, getReplies, addReply, voteOnThread, voteOnReply, getCurrentUserId, getUserProfile, onAuthStateChange, database, ref, get, query, orderByChild, equalTo, limitToLast } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Parse thread ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const threadId = urlParams.get('id');
    
    if (!threadId) {
        showError('Thread ID not found in URL. Please go back to the discussions page.');
        return;
    }
    
    // DOM elements
    const threadContent = document.querySelector('.thread-content');
    const breadcrumbTopic = document.querySelector('.current-topic');
    const threadHeader = document.querySelector('.thread-header');
    const threadBody = document.querySelector('.thread-body');
    const threadActions = document.querySelector('.thread-actions');
    const commentsSection = document.querySelector('.comments-section');
    const commentsList = document.querySelector('.comments-list');
    const commentForm = document.querySelector('.comment-form');
    const commentInput = document.querySelector('.comment-input');
    const commentSubmit = document.querySelector('.comment-submit');
    const loadMoreCommentsBtn = document.querySelector('.load-more-comments button');
    
    // Sidebar elements
    const repliesCount = document.querySelector('.replies-count');
    const viewsCount = document.querySelector('.views-count');
    const createdDate = document.querySelector('.created-date');
    const authorAvatar = document.querySelector('.author-avatar');
    const authorName = document.querySelector('.author-name');
    const authorJoined = document.querySelector('.author-joined');
    const postsCount = document.querySelector('.posts-count');
    const commentsCount = document.querySelector('.comments-count');
    const similarThreads = document.querySelector('.similar-threads');
    
    // State
    let currentUser = null;
    let thread = null;
    let replies = [];
    
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
    if (commentForm) {
        commentForm.addEventListener('submit', handleCommentSubmit);
    }
    
    if (loadMoreCommentsBtn) {
        loadMoreCommentsBtn.addEventListener('click', loadMoreComments);
    }
    
    // Load thread data
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
                        <div class="thread-author-avatar" style="background-image: url('${thread.authorAvatar || 'images/default-avatar.png'}')"></div>
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
            
            replies = result.replies;
            
            if (replies.length === 0) {
                if (commentsList) {
                    commentsList.innerHTML = `
                        <div class="no-replies">
                            <p>No replies yet. Be the first to reply!</p>
                </div>
                    `;
                }
                if (loadMoreCommentsBtn) {
                    loadMoreCommentsBtn.parentElement.style.display = 'none';
                }
            } else {
                // Fetch author information for each reply
                for (const reply of replies) {
                    if (reply.authorId) {
                        try {
                            const userRef = ref(database, `users/${reply.authorId}`);
                            const userSnapshot = await get(userRef);
                            
                            if (userSnapshot.exists()) {
                                const userData = userSnapshot.val();
                                const profile = userData.profile || {};
                                reply.authorName = profile.displayName || userData.displayName || 'Anonymous';
                                reply.authorAvatar = profile.avatarUrl || 'images/default-avatar.png';
                            } else {
                                reply.authorName = 'Anonymous';
                                reply.authorAvatar = 'images/default-avatar.png';
                            }
                        } catch (error) {
                            console.error(`Error fetching author for reply ${reply.id}:`, error);
                            reply.authorName = 'Anonymous';
                            reply.authorAvatar = 'images/default-avatar.png';
                        }
                    } else {
                        reply.authorName = 'Anonymous';
                        reply.authorAvatar = 'images/default-avatar.png';
                    }
                }
                
                renderComments(replies);
                
                if (loadMoreCommentsBtn) {
                    loadMoreCommentsBtn.parentElement.style.display = replies.length >= 10 ? 'flex' : 'none';
                }
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
            if (commentsList) {
                commentsList.innerHTML = `
                    <div class="error-message">
                        <p>Failed to load comments. Please try again.</p>
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
        
        const commentDate = formatDate(comment.createdAt);
        
        commentEl.innerHTML = `
            <div class="comment-header">
                <a href="profile-view.html?uid=${comment.authorId}" class="comment-author-link">
                    <div class="comment-avatar" style="background-image: url('${comment.authorAvatar || 'images/default-avatar.png'}')"></div>
                    <div class="comment-info">
                        <div class="comment-author">${comment.authorName || 'Anonymous'}</div>
                        <div class="comment-meta">${commentDate}</div>
                    </div>
                </a>
            </div>
            <div class="comment-body">${comment.content}</div>
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
                    <span class="material-symbols-rounded">reply</span>
                    <span>Reply</span>
                </div>
            </div>
        `;
        
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
                authorName: currentUser.displayName || 'Anonymous'
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
            const photoURL = profile.avatarUrl || userData.photoURL || 'images/default-avatar.png';
            
            // Update author info in thread header
            const authorAvatarEl = document.querySelector('.thread-author-avatar');
            const authorNameEl = document.querySelector('.thread-author-name');
            
            if (authorAvatarEl) {
                authorAvatarEl.style.backgroundImage = `url(${photoURL})`;
            }
            
            if (authorNameEl) {
                authorNameEl.textContent = profile.displayName || userData.displayName || 'Anonymous';
            }
            
            // Update author info in sidebar
            if (authorAvatar) {
                authorAvatar.style.backgroundImage = `url(${photoURL})`;
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
            
            // Store author data in thread object for later use
            thread.authorData = {
                displayName: profile.displayName || userData.displayName || 'Anonymous',
                avatarUrl: photoURL,
                bio: profile.bio || userData.bio || '',
                joinDate: userData.createdAt,
                threadCount: userData.stats?.threadCount || 0,
                replyCount: userData.stats?.replyCount || 0
            };
            
            // Add profile hover card functionality
            addProfileHoverCard();
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
        threadContent.innerHTML = `
            <div class="error-message">
                <span class="material-symbols-rounded">error</span>
                <h3>Something went wrong</h3>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="window.location.href='explore.html'">Back to Discussions</button>
                </div>
            `;
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
                        <a href="profile-view.html?uid=${authorId}" class="hover-profile-link">View Full Profile</a>
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
}); 