document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const readContainer = document.querySelector('.read-container');
    const discussionSidebar = document.querySelector('.discussion-sidebar');
    const threadContainer = document.getElementById('thread-container');
    const replyButtons = document.querySelectorAll('.comment-action.reply');
    
    // Modify sidebar header to include fullscreen toggle
    const sidebarHeader = document.querySelector('.sidebar-header');
    
    // Create sidebar actions container
    const sidebarActions = document.createElement('div');
    sidebarActions.classList.add('sidebar-actions');
    
    // Create fullscreen toggle button
    const fullscreenToggle = document.createElement('button');
    fullscreenToggle.classList.add('fullscreen-toggle');
    fullscreenToggle.innerHTML = '<span class="material-symbols-rounded">fullscreen</span>';
    fullscreenToggle.setAttribute('aria-label', 'Toggle fullscreen');
    
    // Get close sidebar button - FIX: Just create a new button instead of trying to move the existing one
    const closeSidebarButton = document.createElement('button');
    closeSidebarButton.classList.add('close-sidebar');
    closeSidebarButton.innerHTML = '<span class="material-symbols-rounded">close</span>';
    closeSidebarButton.setAttribute('aria-label', 'Close thread');
    
    // Add buttons to sidebar actions
    sidebarActions.appendChild(fullscreenToggle);
    sidebarActions.appendChild(closeSidebarButton);
    
    // Clear and update the sidebar header
    while (sidebarHeader.children.length > 1) {
        sidebarHeader.removeChild(sidebarHeader.lastChild);
    }
    sidebarHeader.appendChild(sidebarActions);
    
    // Add Show Thread Button for mobile
    const showThreadButton = document.createElement('button');
    showThreadButton.classList.add('show-thread-button');
    showThreadButton.innerHTML = '<span class="material-symbols-rounded">chat</span>';
    showThreadButton.setAttribute('aria-label', 'Show discussion threads');
    document.body.appendChild(showThreadButton);
    
    // Create overlay for mobile sidebar
    const sidebarOverlay = document.createElement('div');
    sidebarOverlay.classList.add('sidebar-overlay');
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
    
    // Sample threads data - with improved thread structure
    const threads = {
        'comment-1': `
            <div class="thread-original-comment">
                <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait1')"></div>
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">Michael Chen</div>
                        <div class="comment-meta">2 hours ago</div>
                    </div>
                    <div class="comment-body">
                        <p>This article perfectly articulates why we need to continue studying classic literature. I've found that each time I revisit works like "To Kill a Mockingbird" or "1984," I discover new layers of meaning that I missed before. These books truly grow with you throughout your life.</p>
                    </div>
                </div>
            </div>
            
            <div class="thread-replies">
                <div class="thread-reply">
                    <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait4')"></div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">Aisha Patel</div>
                            <div class="comment-meta">1 hour ago</div>
                        </div>
                        <div class="comment-body">
                            <p>I completely agree, Michael! I actually teach high school literature, and it's amazing to see how students connect with these texts once they get past the initial resistance to the language or historical context.</p>
                        </div>
                        <div class="comment-footer">
                            <button class="comment-action upvote">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span class="count">12</span>
                            </button>
                            <button class="comment-action reply-to-thread" data-author="Aisha Patel">
                                <span class="material-symbols-rounded">reply</span>
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="thread-reply">
                    <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait5')"></div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">Thomas Reynolds</div>
                            <div class="comment-meta">45 minutes ago</div>
                        </div>
                        <div class="comment-body">
                            <p>Have you tried pairing classics with their modern adaptations? I've found that approach works really well—read a few chapters of Pride and Prejudice, then watch scenes from the 2005 film or even Bridget Jones's Diary.</p>
                        </div>
                        <div class="comment-footer">
                            <button class="comment-action upvote">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span class="count">8</span>
                            </button>
                            <button class="comment-action reply-to-thread" data-author="Thomas Reynolds">
                                <span class="material-symbols-rounded">reply</span>
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="thread-reply nested-reply">
                    <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait4')"></div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">Aisha Patel</div>
                            <div class="comment-meta">30 minutes ago</div>
                        </div>
                        <div class="comment-body">
                            <p>@Thomas Yes! That's exactly what I do. The modern adaptations help them see how the themes are still relevant, and then they're more willing to engage with the original text.</p>
                        </div>
                        <div class="comment-footer">
                            <button class="comment-action upvote">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span class="count">5</span>
                            </button>
                            <button class="comment-action reply-to-thread" data-author="Aisha Patel">
                                <span class="material-symbols-rounded">reply</span>
                                Reply
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="thread-reply-form">
                <div class="user-avatar">
                    <span class="material-symbols-rounded">person_outline</span>
                </div>
                <div class="reply-input-container">
                    <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                    <button class="btn btn-primary reply-submit">Reply</button>
                </div>
            </div>
        `,
        'comment-2': `
            <div class="thread-original-comment">
                <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait2')"></div>
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">Sarah Johnson</div>
                        <div class="comment-meta">5 hours ago</div>
                    </div>
                    <div class="comment-body">
                        <p>I appreciate the point about expanding the canon to include more diverse voices. So many brilliant works have been overlooked simply because they didn't come from traditional Western sources. I've been exploring literature from various African traditions recently, and the depth and wisdom in these stories is remarkable.</p>
                    </div>
                </div>
            </div>
            
            <div class="thread-replies">
                <div class="empty-thread">
                    <span class="material-symbols-rounded">forum</span>
                    <p>No replies yet. Be the first to reply!</p>
                </div>
            </div>
            
            <div class="thread-reply-form">
                <div class="user-avatar">
                    <span class="material-symbols-rounded">person_outline</span>
                </div>
                <div class="reply-input-container">
                    <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                    <button class="btn btn-primary reply-submit">Reply</button>
                </div>
            </div>
        `,
        'comment-3': `
            <div class="thread-original-comment">
                <div class="comment-avatar" style="background-image: url('https://source.unsplash.com/random/100x100/?portrait3')"></div>
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">James Wilson</div>
                        <div class="comment-meta">Yesterday</div>
                    </div>
                    <div class="comment-body">
                        <p>While I agree with much of this article, I think we should be careful not to place classics on too high a pedestal. There's incredible contemporary literature being written today that addresses modern issues in ways classics simply cannot. Perhaps we need to balance our reverence for the past with an openness to new voices and forms.</p>
                    </div>
                </div>
            </div>
            
            <div class="thread-replies">
                <div class="empty-thread">
                    <span class="material-symbols-rounded">forum</span>
                    <p>No replies yet. Be the first to reply!</p>
                </div>
            </div>
            
            <div class="thread-reply-form">
                <div class="user-avatar">
                    <span class="material-symbols-rounded">person_outline</span>
                </div>
                <div class="reply-input-container">
                    <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                    <button class="btn btn-primary reply-submit">Reply</button>
                </div>
            </div>
        `
    };
    
    // Check if featured image has a real image
    const featuredImage = document.querySelector('.article-featured-image');
    if (featuredImage) {
        // Get background-image url
        const bgImg = getComputedStyle(featuredImage).backgroundImage;
        
        // If it's a valid image URL (not none)
        if (bgImg && bgImg !== 'none') {
            // Check if image loads successfully
            const tempImg = new Image();
            tempImg.onload = function() {
                document.querySelector('.article-content').classList.add('has-image');
            };
            tempImg.onerror = function() {
                featuredImage.style.display = 'none';
            };
            
            // Extract URL and load image
            const imgUrl = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
            if (imgUrl && imgUrl[1]) {
                tempImg.src = imgUrl[1];
            }
        }
    }
    
    // Check for avatar images and replace with default if needed
    const avatars = document.querySelectorAll('.author-avatar, .user-avatar, .comment-avatar');
    avatars.forEach(avatar => {
        const bgImg = getComputedStyle(avatar).backgroundImage;
        
        // If it doesn't have a background image
        if (!bgImg || bgImg === 'none') {
            avatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
            avatar.style.backgroundImage = 'none';
        } else {
            // Check if the image loads
            const tempImg = new Image();
            tempImg.onerror = function() {
                avatar.innerHTML = '<span class="material-symbols-rounded">person_outline</span>';
                avatar.style.backgroundImage = 'none';
            };
            
            const imgUrl = bgImg.match(/url\(['"]?(.*?)['"]?\)/);
            if (imgUrl && imgUrl[1]) {
                tempImg.src = imgUrl[1];
            }
        }
    });
    
    // Implement show more/less for article body
    const articleBody = document.querySelector('.article-body');
    if (articleBody && articleBody.clientHeight > 500) {
        // Add truncated class
        articleBody.classList.add('truncated');
        
        // Create show more button
        const showMoreBtn = document.createElement('button');
        showMoreBtn.classList.add('show-more-btn');
        showMoreBtn.textContent = 'Show More';
        articleBody.after(showMoreBtn);
        
        // Add event listener
        showMoreBtn.addEventListener('click', function() {
            if (articleBody.classList.contains('truncated')) {
                articleBody.classList.remove('truncated');
                showMoreBtn.textContent = 'Show Less';
            } else {
                articleBody.classList.add('truncated');
                showMoreBtn.textContent = 'Show More';
                
                // Scroll back to the top of the article
                articleBody.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }
    
    // Open Thread Function
    function openThread(commentId) {
        // Update container to show sidebar
        readContainer.classList.add('sidebar-open');
        
        // Show sidebar on mobile
        discussionSidebar.classList.add('active');
        sidebarOverlay.style.opacity = '1';
        sidebarOverlay.style.visibility = 'visible';
        
        // Set active state on reply button
        replyButtons.forEach(button => button.classList.remove('active'));
        const replyButton = document.querySelector(`[data-comment-id="${commentId}"]`);
        if (replyButton) {
            replyButton.classList.add('active');
        }
        
        // Load thread content
        if (threads[commentId]) {
            threadContainer.innerHTML = threads[commentId];
        } else {
            // Get the original comment content
            const originalComment = document.querySelector(`#${commentId}`);
            if (originalComment) {
                const commentContent = originalComment.querySelector('.comment-content').cloneNode(true);
                threadContainer.innerHTML = `
                    <div class="thread-original-comment">
                        <div class="comment-avatar">
                            ${originalComment.querySelector('.comment-avatar').innerHTML}
                        </div>
                        ${commentContent.outerHTML}
                    </div>
                    <div class="thread-replies">
                        <div class="empty-thread">
                            <span class="material-symbols-rounded">forum</span>
                            <p>No replies yet. Be the first to reply!</p>
                        </div>
                    </div>
                    <div class="thread-reply-form">
                        <div class="user-avatar">
                            <span class="material-symbols-rounded">person_outline</span>
                        </div>
                        <div class="reply-input-container">
                            <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                            <button class="btn btn-primary reply-submit">Reply</button>
                        </div>
                    </div>
                `;
                
                // Store the thread content
                threads[commentId] = threadContainer.innerHTML;
            }
        }
        
        // Setup reply buttons in thread
        setupThreadReplyButtons();
        
        // Update fullscreen icon
        updateFullscreenIcon();
    }
    
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
    
    // Setup Thread Reply Buttons
    function setupThreadReplyButtons() {
        const threadReplyButtons = document.querySelectorAll('.comment-action.reply-to-thread');
        threadReplyButtons.forEach(button => {
            button.addEventListener('click', function() {
                const replyForm = document.querySelector('.thread-reply-form');
                replyForm.style.display = 'flex';
                
                // Focus on textarea and add @ mention if replying to a specific comment
                const replyInput = replyForm.querySelector('.reply-input');
                replyInput.focus();
                
                // Get the author from data attribute
                const authorName = this.getAttribute('data-author');
                if (authorName) {
                    replyInput.value = `@${authorName} `;
                    replyInput.setSelectionRange(authorName.length + 2, authorName.length + 2);
                } else {
                    // Fallback to finding author in parent element
                    const authorElement = this.closest('.thread-reply, .thread-original-comment').querySelector('.comment-author');
                    if (authorElement) {
                        const name = authorElement.textContent.trim();
                        replyInput.value = `@${name} `;
                        replyInput.setSelectionRange(name.length + 2, name.length + 2);
                    }
                }
            });
        });
    }
    
    // Close Sidebar Function
    function closeSidebar() {
        // Update container to hide sidebar
        readContainer.classList.remove('sidebar-open');
        
        discussionSidebar.classList.remove('active');
        discussionSidebar.classList.remove('fullscreen');
        sidebarOverlay.style.opacity = '0';
        sidebarOverlay.style.visibility = 'hidden';
        replyButtons.forEach(button => button.classList.remove('active'));
        
        // Update fullscreen icon
        updateFullscreenIcon();
    }
    
    // Vote Buttons
    const voteButtons = document.querySelectorAll('.vote-button, .comment-action.upvote, .comment-action.downvote');
    voteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const isUpvote = this.classList.contains('upvote');
            const isDownvote = this.classList.contains('downvote');
            const voteCountElement = this.querySelector('.vote-count, .count');
            
            // Toggle active state
            if (this.classList.contains('active')) {
                this.classList.remove('active');
                if (voteCountElement) {
                    let count = parseInt(voteCountElement.textContent);
                    if (isUpvote) count--;
                    if (isDownvote) count++;
                    voteCountElement.textContent = count;
                }
            } else {
                // Remove active from sibling if it exists (for article votes)
                const siblingSelector = isUpvote ? '.downvote' : '.upvote';
                const sibling = this.parentElement.querySelector(siblingSelector);
                if (sibling && sibling.classList.contains('active')) {
                    sibling.classList.remove('active');
                    const siblingCountElement = sibling.querySelector('.vote-count, .count');
                    if (siblingCountElement) {
                        let siblingCount = parseInt(siblingCountElement.textContent);
                        if (isUpvote) siblingCount++;
                        if (isDownvote) siblingCount--;
                        siblingCountElement.textContent = siblingCount;
                    }
                }
                
                this.classList.add('active');
                if (voteCountElement) {
                    let count = parseInt(voteCountElement.textContent);
                    if (isUpvote) count++;
                    if (isDownvote) count--;
                    voteCountElement.textContent = count;
                }
            }
        });
    });
    
    // Comment Form
    const commentForm = document.querySelector('.comment-form');
    const commentInput = document.querySelector('.comment-input');
    const commentSubmit = document.querySelector('.comment-submit');
    
    commentSubmit.addEventListener('click', function() {
        if (commentInput.value.trim() !== '') {
            // Create new comment
            const newComment = document.createElement('div');
            newComment.classList.add('comment');
            newComment.id = `comment-new-${Date.now()}`;
            newComment.innerHTML = `
                <div class="comment-avatar">
                    <span class="material-symbols-rounded">person_outline</span>
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <div class="comment-author">You</div>
                        <div class="comment-meta">Just now</div>
                    </div>
                    <div class="comment-body">
                        <p>${commentInput.value.trim()}</p>
                    </div>
                    <div class="comment-footer">
                        <button class="comment-action upvote">
                            <span class="material-symbols-rounded">thumb_up</span>
                            <span class="count">0</span>
                        </button>
                        <button class="comment-action downvote">
                            <span class="material-symbols-rounded">thumb_down</span>
                            <span class="count">0</span>
                        </button>
                        <button class="comment-action reply" data-comment-id="${newComment.id}">
                            <span class="material-symbols-rounded">reply</span>
                            Reply
                        </button>
                    </div>
                </div>
            `;
            
            // Add comment to the top of the list
            const commentsList = document.querySelector('.comments-list');
            commentsList.insertBefore(newComment, commentsList.firstChild);
            
            // Clear input
            commentInput.value = '';
            
            // Update comment count
            const commentsTitle = document.querySelector('.comments-title');
            const currentCount = parseInt(commentsTitle.textContent.match(/\d+/)[0]);
            commentsTitle.textContent = commentsTitle.textContent.replace(/\d+/, currentCount + 1);
            
            // Create empty thread for this comment
            threads[newComment.id] = `
                <div class="thread-original-comment">
                    <div class="comment-avatar">
                        <span class="material-symbols-rounded">person_outline</span>
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">You</div>
                            <div class="comment-meta">Just now</div>
                        </div>
                        <div class="comment-body">
                            <p>${commentInput.value.trim()}</p>
                        </div>
                    </div>
                </div>
                <div class="thread-replies">
                    <div class="empty-thread">
                        <span class="material-symbols-rounded">forum</span>
                        <p>No replies yet. Be the first to reply!</p>
                    </div>
                </div>
                <div class="thread-reply-form">
                    <div class="user-avatar">
                        <span class="material-symbols-rounded">person_outline</span>
                    </div>
                    <div class="reply-input-container">
                        <textarea class="reply-input" placeholder="Add to this discussion..."></textarea>
                        <button class="btn btn-primary reply-submit">Reply</button>
                    </div>
                </div>
            `;
            
            // Setup new reply button
            setupReplyButton(newComment.querySelector('.comment-action.reply'));
        }
    });
    
    // Reply Form in Thread
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reply-submit')) {
            const replyInput = e.target.parentElement.querySelector('.reply-input');
            const replyText = replyInput.value.trim();
            
            if (replyText !== '') {
                // Create new reply
                const newReply = document.createElement('div');
                newReply.classList.add('thread-reply');
                
                // Check if this is a nested reply (contains @mention)
                const isNested = replyText.startsWith('@');
                const mentionedUser = isNested ? replyText.split(' ')[0].substring(1) : null;
                
                if (isNested) {
                    newReply.classList.add('nested-reply');
                    
                    // Find the parent reply
                    const parentReply = Array.from(document.querySelectorAll('.thread-reply')).find(reply => {
                        const author = reply.querySelector('.comment-author').textContent.trim();
                        return author === mentionedUser;
                    });
                    
                    if (parentReply) {
                        // Find all nested replies that belong to this parent
                        const siblingReplies = Array.from(parentReply.parentNode.children)
                            .filter(child => {
                                if (!child.classList.contains('nested-reply')) return false;
                                const replyText = child.querySelector('.comment-body').textContent;
                                return replyText.startsWith(`@${mentionedUser}`);
                            });
                        
                        // Insert after the last sibling or parent
                        const lastSibling = siblingReplies[siblingReplies.length - 1];
                        if (lastSibling) {
                            lastSibling.after(newReply);
                        } else {
                            parentReply.after(newReply);
                        }
                    }
                }
                
                newReply.innerHTML = `
                    <div class="comment-avatar">
                        <span class="material-symbols-rounded">person_outline</span>
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <div class="comment-author">You</div>
                            <div class="comment-meta">Just now</div>
                        </div>
                        <div class="comment-body">
                            <p>${replyText}</p>
                        </div>
                        <div class="comment-footer">
                            <button class="comment-action upvote">
                                <span class="material-symbols-rounded">thumb_up</span>
                                <span class="count">0</span>
                            </button>
                            <button class="comment-action reply-to-thread" data-author="You">
                                <span class="material-symbols-rounded">reply</span>
                                Reply
                            </button>
                        </div>
                    </div>
                `;
                
                // If not nested or parent not found, add to main thread
                if (!isNested || !newReply.parentNode) {
                    // Find empty thread placeholder if it exists and remove it
                    const emptyThread = document.querySelector('.thread-replies .empty-thread');
                    if (emptyThread) {
                        emptyThread.remove();
                    }
                    
                    // Add reply to thread
                    const threadReplies = document.querySelector('.thread-replies');
                    threadReplies.appendChild(newReply);
                }
                
                // Clear input and reset form
                replyInput.value = '';
                const replyForm = document.querySelector('.thread-reply-form');
                if (replyForm) {
                    replyForm.style.display = 'flex';
                    replyForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                
                // Update thread content in storage
                const currentThread = document.querySelector('.thread-container');
                if (currentThread) {
                    const commentId = document.querySelector('.thread-original-comment')
                        .querySelector('.comment-content')
                        .getAttribute('data-comment-id');
                    if (commentId) {
                        threads[commentId] = currentThread.innerHTML;
                    }
                }
                
                // Setup new reply button
                setupThreadReplyButtons();
            }
        }
    });
    
    // Save Button
    const saveButton = document.querySelector('.save-button');
    saveButton.addEventListener('click', function() {
        this.classList.toggle('active');
        const saveIcon = this.querySelector('.material-symbols-rounded');
        if (this.classList.contains('active')) {
            saveIcon.textContent = 'bookmark_added';
            this.innerHTML = `<span class="material-symbols-rounded">bookmark_added</span> Saved`;
        } else {
            saveIcon.textContent = 'bookmark';
            this.innerHTML = `<span class="material-symbols-rounded">bookmark</span> Save`;
        }
    });
    
    // Share Button
    const shareButton = document.querySelector('.share-button');
    shareButton.addEventListener('click', function() {
        // Check if Web Share API is available
        if (navigator.share) {
            navigator.share({
                title: document.title,
                url: window.location.href
            }).catch(console.error);
        } else {
            // Fallback - copy to clipboard
            const tempInput = document.createElement('input');
            document.body.appendChild(tempInput);
            tempInput.value = window.location.href;
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Notify user
            const oldText = this.innerHTML;
            this.innerHTML = '<span class="material-symbols-rounded">check</span> Copied!';
            setTimeout(() => {
                this.innerHTML = oldText;
            }, 2000);
        }
    });
    
    // Setup Reply Buttons
    function setupReplyButton(button) {
        button.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            openThread(commentId);
        });
    }
    
    // Event Listeners
    replyButtons.forEach(setupReplyButton);
    
    closeSidebarButton.addEventListener('click', closeSidebar);
    
    showThreadButton.addEventListener('click', function() {
        // If no thread is active, show the first one
        if (!discussionSidebar.classList.contains('active')) {
            const firstComment = document.querySelector('.comment');
            if (firstComment) {
                const commentId = firstComment.id;
                openThread(commentId);
            }
        } else {
            closeSidebar();
        }
    });
    
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape to close sidebar
        if (e.key === 'Escape' && discussionSidebar.classList.contains('active')) {
            closeSidebar();
        }
        
        // Ctrl+Enter to submit comment
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            if (document.activeElement === commentInput) {
                commentSubmit.click();
            }
            
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
}); 