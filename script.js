document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    // Mobile Menu Functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const navLinks = document.querySelectorAll('nav a');
    const headerActions = document.querySelector('.header-actions');
    
    // Notifications Functionality
    initNotifications();
    
    // User menu functionality
    if (typeof initUserMenu === 'function') {
        initUserMenu();
    }
    
    // Update active nav link based on current page
    setActiveNavLink();
    
    // Update navbar for responsive views
    function handleResponsiveNavbar() {
        // Check if we're on desktop or mobile view
        const isDesktop = window.innerWidth > 768;
        
        // Handle the center navigation text for desktop vs mobile
        if (isDesktop) {
            // For desktop: Make sure the navigation is centered and no duplicate text
            if (nav) {
                // Remove any "Connections" text from nav if it exists from mobile view
                const existingNavLogo = nav.querySelector('.nav-logo');
                if (existingNavLogo) {
                    nav.removeChild(existingNavLogo);
                }
                
                // Make sure nav:before is not displayed on desktop (handled in CSS now)
                
                // Remove mobile classes
                nav.classList.remove('active');
                if (mobileMenuOverlay) {
                    mobileMenuOverlay.classList.remove('active');
                }
                
                // Reset body overflow
                document.body.style.overflow = '';
                document.body.classList.remove('menu-open');
            }
        } else {
            // For mobile: Make sure we have "Connections" text in the drawer
            if (nav && !nav.querySelector('.nav-logo')) {
                const navLogo = document.createElement('div');
                navLogo.classList.add('nav-logo');
                navLogo.textContent = 'Connections';
                nav.insertBefore(navLogo, nav.firstChild);
            }
        }
    }
    
    // Initialize notifications functionality
    function initNotifications() {
        const notificationBadges = document.querySelectorAll('.notification-badge');
        
        // Check for unread notifications count in localStorage
        let unreadCount = localStorage.getItem('unreadNotifications');
        
        // If no count in storage, check if user is logged in
        if (!unreadCount) {
            // For demo purposes, we'll randomly generate 0-5 notifications
            // In a real app, this would come from the server for logged-in users
            if (isUserLoggedIn()) {
                unreadCount = Math.floor(Math.random() * 5);
                localStorage.setItem('unreadNotifications', unreadCount);
            } else {
                unreadCount = 0;
            }
        }
        
        // Update all notification badges
        notificationBadges.forEach(badge => {
            badge.textContent = unreadCount;
            
            // Ensure notification badges show/hide based on count
            if (unreadCount > 0) {
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        });
        
        // Add notification badges to mobile menu
        if (nav) {
            const mobileNav = nav.cloneNode(false);
            const notificationsLink = document.createElement('a');
            notificationsLink.href = 'notifications.html';
            notificationsLink.className = 'nav-link mobile-notifications';
            
            const indicatorSpan = document.createElement('span');
            indicatorSpan.className = 'indicator';
            notificationsLink.appendChild(indicatorSpan);
            
            const textSpan = document.createElement('span');
            textSpan.textContent = 'Notifications';
            notificationsLink.appendChild(textSpan);
            
            if (unreadCount > 0) {
                const badgeSpan = document.createElement('span');
                badgeSpan.className = 'notification-badge';
                badgeSpan.textContent = unreadCount;
                notificationsLink.appendChild(badgeSpan);
            }
            
            // Add the notifications link to mobile drawer
            const mobileHeaderActions = nav.querySelector('.mobile-header-actions');
            if (mobileHeaderActions) {
                const mobileNotificationBtn = document.createElement('a');
                mobileNotificationBtn.href = 'notifications.html';
                mobileNotificationBtn.className = 'btn btn-icon notifications-btn';
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'material-symbols-rounded';
                iconSpan.textContent = 'notifications';
                mobileNotificationBtn.appendChild(iconSpan);
                
                if (unreadCount > 0) {
                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = 'notification-badge';
                    badgeSpan.textContent = unreadCount;
                    mobileNotificationBtn.appendChild(badgeSpan);
                }
                
                // Insert notification button before theme toggle
                const themeToggle = mobileHeaderActions.querySelector('.theme-toggle');
                if (themeToggle) {
                    mobileHeaderActions.insertBefore(mobileNotificationBtn, themeToggle);
                } else {
                    mobileHeaderActions.appendChild(mobileNotificationBtn);
                }
            }
        }
    }
    
    // Check if user is logged in
    function isUserLoggedIn() {
        return sessionStorage.getItem('currentUser') !== null;
    }
    
    // Set active navigation link based on current page
    function setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop();
        
        // Remove active class from all links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            if (linkPage === currentPage || 
                (currentPage === '' && linkPage === 'index.html') ||
                (currentPage === '/' && linkPage === 'index.html')) {
                link.classList.add('active');
            }
        });
    }
    
    // Improved mobile menu handling
    function setupMobileMenu() {
        if (!mobileMenuToggle || !nav || !mobileMenuOverlay) return;
        
        // Add Connections logo to the nav drawer (for mobile only)
        const navLogo = document.createElement('div');
        navLogo.classList.add('nav-logo');
        navLogo.textContent = 'Connections';
        
        // Insert at the beginning of nav (only for mobile)
        if (!nav.querySelector('.nav-logo') && window.innerWidth <= 768) {
            nav.insertBefore(navLogo, nav.firstChild);
        }
        
        // Move header actions inside nav for mobile view
        if (headerActions && window.innerWidth <= 768) {
            const headerActionsClone = headerActions.cloneNode(true);
            headerActionsClone.classList.add('mobile-header-actions');
            
            // Check if already moved to prevent duplicates
            if (!nav.querySelector('.mobile-header-actions')) {
                nav.appendChild(headerActionsClone);
                
                // Ensure event listeners are attached to cloned elements
                const mobileThemeToggle = headerActionsClone.querySelector('.theme-toggle');
                if (mobileThemeToggle) {
                    mobileThemeToggle.addEventListener('click', () => {
                        body.classList.toggle('dark-mode');
                        if (body.classList.contains('dark-mode')) {
                            localStorage.setItem('theme', 'dark');
                            initializeStars();
                        } else {
                            localStorage.setItem('theme', 'light');
                        }
                    });
                }
                
                // Ensure login/signup buttons are clickable
                const actionButtons = headerActionsClone.querySelectorAll('a.btn');
                actionButtons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        // Allow default action (navigation) and close menu
                        nav.classList.remove('active');
                        mobileMenuOverlay.classList.remove('active');
                        document.body.classList.remove('menu-open');
                        document.body.style.overflow = '';
                    });
                });
            }
        }
        
        // Toggle mobile menu with improved touchability
        mobileMenuToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default to fix iOS issues
            e.stopPropagation(); // Stop propagation to prevent immediate closing
            
            nav.classList.toggle('active');
            mobileMenuOverlay.classList.toggle('active');
            document.body.classList.toggle('menu-open');
            
            // Force hardware acceleration for smoother animations
            nav.style.transform = 'translateZ(0)';
            
            // Ensure proper overflow behavior
            if (nav.classList.contains('active')) {
                document.body.style.overflow = 'hidden'; // Prevent scrolling behind overlay
            } else {
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
        
        // Close menu when clicking overlay with improved touch handling
        mobileMenuOverlay.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default to fix iOS issues
            
            nav.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
            document.body.style.overflow = ''; // Restore scrolling
        });
        
        // Close menu when clicking a link - ensure all nav links work
        navLinks.forEach(link => {
            link.style.pointerEvents = 'auto'; // Ensure clickability
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
                document.body.classList.remove('menu-open');
                document.body.style.overflow = ''; // Restore scrolling
            });
        });
        
        // Close menu when pressing Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('active')) {
                nav.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
                document.body.classList.remove('menu-open');
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
        
        // Handle resize - reorganize elements based on screen size
        window.addEventListener('resize', () => {
            handleResponsiveNavbar();
            
            if (window.innerWidth <= 768) {
                // Move header actions to nav for mobile
                if (headerActions && !nav.querySelector('.mobile-header-actions')) {
                    const headerActionsClone = headerActions.cloneNode(true);
                    headerActionsClone.classList.add('mobile-header-actions');
                    nav.appendChild(headerActionsClone);
                    
                    // Ensure event listeners are attached to cloned elements
                    const mobileThemeToggle = headerActionsClone.querySelector('.theme-toggle');
                    if (mobileThemeToggle) {
                        mobileThemeToggle.addEventListener('click', () => {
                            body.classList.toggle('dark-mode');
                            if (body.classList.contains('dark-mode')) {
                                localStorage.setItem('theme', 'dark');
                                initializeStars();
                            } else {
                                localStorage.setItem('theme', 'light');
                            }
                        });
                    }
                }
                
                // Ensure logo is present
                if (!nav.querySelector('.nav-logo')) {
                    const navLogo = document.createElement('div');
                    navLogo.classList.add('nav-logo');
                    navLogo.textContent = 'Connections';
                    nav.insertBefore(navLogo, nav.firstChild);
                }
            } else {
                // Remove mobile header actions from nav for desktop
                const mobileHeaderActions = nav.querySelector('.mobile-header-actions');
                if (mobileHeaderActions) {
                    nav.removeChild(mobileHeaderActions);
                }
                
                // Reset menu state for desktop
                nav.classList.remove('active');
                mobileMenuOverlay.classList.remove('active');
                document.body.classList.remove('menu-open');
                document.body.style.overflow = '';
            }
        });
    }
    
    // Call setup for mobile menu
    setupMobileMenu();
    
    // Call initial responsive navbar handler
    handleResponsiveNavbar();
    
    // Simplified Stars Background
    const starsContainer = document.querySelector('.stars-container');
    let isInitialized = false;
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        initializeStars();
    } else if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    } else {
        // If no saved preference, check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            body.classList.add('dark-mode');
            initializeStars();
        }
    }
    
    // Toggle theme when button is clicked
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            
            // Save preference to localStorage
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark');
                initializeStars();
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
    }
    
    // Floating Cards Animation Enhancement
    const floatingCards = document.querySelectorAll('.floating-card');
    
    // Smooth scrolling for navigation links
    const smoothScrollLinks = document.querySelectorAll('nav a[href^="#"], .btn-outline');
    
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Only apply to links that point to an ID on the page
            const targetId = link.getAttribute('href');
            if (targetId.startsWith('#')) {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    // Smooth scroll to the element
                    window.scrollTo({
                        top: targetElement.offsetTop - 80, // Account for header height
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
    
    // Simplified stars initialization
    function initializeStars() {
        if (isInitialized) return;
        
        createStars();
        isInitialized = true;
    }
    
    function createStars() {
        // Clear existing stars
        if (!starsContainer) return;
        starsContainer.innerHTML = '';
        
        // Create static stars - fewer for better performance
        const starCount = Math.min(100, window.innerWidth / 15);
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            
            // Make some stars brighter
            if (Math.random() < 0.2) {
                star.classList.add('bright');
            }
            
            // Random position
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            
            // Random size (0.5px to 3px)
            const size = 0.5 + Math.random() * 2.5;
            
            // Random opacity
            const opacity = 0.5 + Math.random() * 0.5;
            
            // Apply styles with static animation
            star.style.cssText = `
                top: ${posY}%;
                left: ${posX}%;
                width: ${size}px;
                height: ${size}px;
                opacity: ${opacity};
                animation: twinkle ${2 + Math.random() * 3}s infinite ease-in-out;
                animation-delay: ${Math.random() * 5}s;
            `;
            
            starsContainer.appendChild(star);
        }
        
        // Add twinkling animation if not already added
        if (!document.getElementById('twinkle-animation')) {
            const style = document.createElement('style');
            style.id = 'twinkle-animation';
            style.textContent = `
                @keyframes twinkle {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (body.classList.contains('dark-mode') && starsContainer) {
            createStars();
        }
    });
    
    // Handle mobile devices
    function handleMobileDevices() {
        // Check if device is iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isIOS) {
            // Add iOS specific class
            document.body.classList.add('ios-device');
            
            // Fix iOS-specific issues with fixed positioning
            document.documentElement.style.height = '100%';
            document.body.style.height = '100%';
            document.body.style.position = 'relative';
            
            // Prevent iOS Safari elastic scrolling
            document.body.addEventListener('touchmove', function(e) {
                if (document.body.classList.contains('menu-open')) {
                    e.preventDefault();
                }
            }, { passive: false });
        }
        
        // Check if device is mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Add mobile specific class
            document.body.classList.add('mobile-device');
            
            // Reduce animations for better performance on mobile
            document.body.classList.add('reduced-motion');
        }
    }
    
    // Initialize mobile optimizations
    handleMobileDevices();
}); 