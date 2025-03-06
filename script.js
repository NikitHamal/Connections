document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Functionality
    const themeToggle = document.querySelector('.theme-toggle');
    const body = document.body;
    
    // Mobile Menu Functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('nav');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const navLinks = document.querySelectorAll('nav a');
    
    // Toggle mobile menu
    mobileMenuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        mobileMenuOverlay.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking overlay
    mobileMenuOverlay.addEventListener('click', () => {
        nav.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
    
    // Close menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuOverlay.classList.remove('active');
            document.body.classList.remove('menu-open');
        });
    });
    
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
        if (body.classList.contains('dark-mode')) {
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