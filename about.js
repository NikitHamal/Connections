document.addEventListener('DOMContentLoaded', function() {
    // Add subtle animation to sections when they come into view
    const aboutSections = document.querySelectorAll('.about-section');
    
    // Simple intersection observer to add animation when sections come into view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    // Set initial state and observe each section
    aboutSections.forEach(section => {
        section.style.opacity = 0;
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // Add hover effect to tech stack items
    const techItems = document.querySelectorAll('.tech-item');
    techItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            // Stagger the animation of other items
            techItems.forEach((otherItem, index) => {
                if (otherItem !== item) {
                    otherItem.style.transition = `transform 0.3s ease ${index * 0.05}s, background-color 0.3s ease`;
                    otherItem.style.transform = 'scale(0.95)';
                }
            });
        });
        
        item.addEventListener('mouseleave', function() {
            techItems.forEach(otherItem => {
                otherItem.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
                otherItem.style.transform = 'scale(1)';
            });
        });
    });
    
    // Add subtle animation to CTA button
    const ctaButton = document.querySelector('.about-cta .btn-primary');
    if (ctaButton) {
        ctaButton.addEventListener('mouseenter', function() {
            this.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
            this.style.transform = 'translateY(-3px) scale(1.05)';
        });
        
        ctaButton.addEventListener('mouseleave', function() {
            this.style.transition = 'transform 0.3s ease, background-color 0.3s ease';
            this.style.transform = 'translateY(0) scale(1)';
        });
    }
}); 