document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    initThemeToggle();
    
    // Mobile Menu Functionality
    initMobileMenu();
    
    // Notifications Functionality
    initNotifications();
    
    // Initialize all elements that should show shimmer effect while loading
    initShimmerElements();
    
    // Update active nav link based on current page
    setActiveNavLink();
    
    // Handle mobile devices
    handleMobileDevices();
    
    // Stars background
    initializeStars();
});

// Initialize theme toggle functionality
function initThemeToggle() {
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    if (!themeToggle) return;
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        body.classList.toggle('dark-mode', savedTheme === 'dark');
    } else {
        // Check for system preference
        const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        body.classList.toggle('dark-mode', prefersDarkMode);
    }
    
    // Theme toggle click handler
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        
        // Save preference
        const isDarkMode = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    });
}

// Initialize mobile menu functionality
function initMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const navLinks = document.querySelectorAll('nav a');
    const headerActions = document.querySelector('.header-actions');
    
    if (!mobileMenuToggle || !nav) return;
    
    // Handle responsive navbar setup
    handleResponsiveNavbar();
    setupMobileMenu();
    
    // Listen for window resize to adjust responsive behavior
    window.addEventListener('resize', handleResponsiveNavbar);
}

// Update navbar for responsive views
function handleResponsiveNavbar() {
    // Check if we're on desktop or mobile view
    const isDesktop = window.innerWidth > 768;
    const nav = document.querySelector('nav');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (!nav) return;
    
    // Handle the center navigation text for desktop vs mobile
    if (isDesktop) {
        // For desktop: Make sure the navigation is centered and no duplicate text
        // Remove any "Connections" text from nav if it exists from mobile view
        const existingNavLogo = nav.querySelector('.nav-logo');
        if (existingNavLogo) {
            nav.removeChild(existingNavLogo);
        }
        
        // Remove mobile classes
        nav.classList.remove('active');
        if (mobileMenuOverlay) {
            mobileMenuOverlay.classList.remove('active');
        }
        
        // Reset body overflow
        document.body.style.overflow = '';
        document.body.classList.remove('menu-open');
    }
}

// Initialize notifications functionality
function initNotifications() {
    const notificationBadges = document.querySelectorAll('.notification-badge');
    
    if (notificationBadges.length === 0) return;
    
    // Get unread count from localStorage (will be updated by user-menu.js)
    const unreadCount = localStorage.getItem('unreadNotifications') || 0;
    
    // Update all badges
    notificationBadges.forEach(badge => {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
}

// Initialize elements that should show shimmer effect while loading
function initShimmerElements() {
    // Add shimmer class to elements that should show loading state
    const dynContentElements = document.querySelectorAll(
        '.user-name-small, .user-menu-name, .user-avatar-small img, .user-menu-avatar img'
    );
    
    dynContentElements.forEach(el => {
        if (el) {
            el.classList.add('shimmer');
            
            // Remove shimmer after content is loaded
            if (el.tagName === 'IMG') {
                el.onload = () => el.classList.remove('shimmer');
            }
        }
    });
}

// Check if user is logged in (for pages not using user-menu.js)
function isUserLoggedIn() {
    return localStorage.getItem('userData') !== null;
}

// Update active nav link based on current page
function setActiveNavLink() {
    const navLinks = document.querySelectorAll('nav a');
    const currentPage = window.location.pathname.split('/').pop();
    
    if (navLinks.length === 0) return;
    
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
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    
    if (!mobileMenuToggle || !nav || !mobileMenuOverlay) return;
    
    // Toggle mobile menu on click
    mobileMenuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileMenuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
        
        // Prevent body scrolling when menu is open
        if (document.body.classList.contains('menu-open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close menu when clicking on overlay
    mobileMenuOverlay.addEventListener('click', () => {
        nav.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
    });
    
    // Close menu when clicking on a link
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
            document.body.style.overflow = '';
        });
    });
}

// Stars background animation
function initializeStars() {
    const starsContainer = document.querySelector('.stars-container');
    if (!starsContainer) return;
    
    // Check if reduced motion is preferred
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
        document.body.classList.add('reduced-motion');
        return;
    }
    
    // Clear existing stars if any
    starsContainer.innerHTML = '';
    
    // Create stars
    createStars();
}

function createStars() {
    const starsContainer = document.querySelector('.stars-container');
    if (!starsContainer) return;
    
    const starCount = Math.floor(window.innerWidth / 3);
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Random position
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        star.style.left = `${left}%`;
        star.style.top = `${top}%`;
        
        // Random size (0.5px to 2px)
        const size = 0.5 + Math.random() * 1.5;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        // Random brightness
        if (Math.random() > 0.8) {
            star.classList.add('bright');
        }
        
        // Add to container
        starsContainer.appendChild(star);
    }
}

// Handle iOS and other mobile devices
function handleMobileDevices() {
    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        document.body.classList.add('ios-device');
    }
    
    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        document.body.classList.add('mobile-device');
    }
}

// If we have a module system, export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initThemeToggle,
        initMobileMenu,
        handleResponsiveNavbar,
        initNotifications,
        isUserLoggedIn,
        setActiveNavLink,
        setupMobileMenu,
        initializeStars,
        createStars,
        handleMobileDevices
    };
} 