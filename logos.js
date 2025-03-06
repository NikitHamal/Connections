// Logo Showcase JavaScript

document.addEventListener('DOMContentLoaded', () => {
    initTypingText();
    initMorphingShape();
    initLogoCards();
});

// Initialize the typing text animation
function initTypingText() {
    const typingText = document.querySelector('.typing-text .text');
    if (!typingText) return;
    
    // Set the text content to be typed
    typingText.textContent = 'Connections';
}

// Initialize the morphing shape animation
function initMorphingShape() {
    // SVG morphing is handled by CSS animations
    // This function can be extended for more complex SVG manipulations
}

// Add interactive behaviors to logo cards
function initLogoCards() {
    const logoCards = document.querySelectorAll('.logo-card');
    
    logoCards.forEach(card => {
        // Add subtle movement on hover for 3D logos
        const threeDLogo = card.querySelector('.three-d-logo');
        if (threeDLogo) {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; // x position within the element
                const y = e.clientY - rect.top;  // y position within the element
                
                // Calculate rotation based on mouse position
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                // Apply the rotation
                threeDLogo.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            // Reset on mouse leave
            card.addEventListener('mouseleave', () => {
                threeDLogo.style.transform = '';
            });
        }
    });
    
    // Initialize the infinity connection animation
    const infinityConnections = document.querySelectorAll('.infinity-connection');
    infinityConnections.forEach(infinity => {
        const leftLoop = infinity.querySelector('.left');
        const rightLoop = infinity.querySelector('.right');
        
        if (leftLoop && rightLoop) {
            // Add pseudo-elements for the connecting lines
            const style = document.createElement('style');
            style.textContent = `
                .infinity-connection .left::before,
                .infinity-connection .right::before {
                    content: '';
                    position: absolute;
                    width: 40px;
                    height: 3px;
                    background-color: var(--accent);
                    top: 15px;
                }
                
                .infinity-connection .left::before {
                    right: -20px;
                    transform: rotate(-45deg);
                }
                
                .infinity-connection .right::before {
                    left: -20px;
                    transform: rotate(45deg);
                }
                
                .dark-mode .infinity-connection .left::before,
                .dark-mode .infinity-connection .right::before {
                    background-color: var(--accent-tertiary);
                }
            `;
            document.head.appendChild(style);
        }
    });
}

// Add a function to allow users to download logos
function downloadLogo(logoId) {
    // This is a placeholder function that would be implemented
    // with actual download functionality in a production environment
    console.log(`Downloading logo: ${logoId}`);
    
    // In a real implementation, this would:
    // 1. Capture the logo as an image (using html2canvas or similar)
    // 2. Convert to a downloadable format
    // 3. Trigger the download
    
    alert('Logo download feature would be implemented here.');
} 