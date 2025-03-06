// Firebase references
const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    // Common Elements
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    
    // Sign Up Elements
    const signupFormStep1 = document.getElementById('signup-form-step1');
    const signupFormStep2 = document.getElementById('signup-form-step2');
    const stepIndicators = document.querySelectorAll('.step');
    const userEmailSpan = document.getElementById('user-email');
    const verificationInputs = document.querySelectorAll('.verification-input');
    const resendCodeBtn = document.getElementById('resend-code');
    const resendTimerSpan = document.getElementById('resend-timer');
    const backButton = document.querySelector('.btn-back');
    
    // Sign In Elements
    const signinForm = document.getElementById('signin-form');
    
    // Social Auth Buttons
    const googleAuthBtn = document.querySelector('.google-auth');
    const githubAuthBtn = document.querySelector('.github-auth');
    
    // Password Strength Meter
    const passwordInput = document.getElementById('password');
    const strengthSegments = document.querySelectorAll('.strength-segment');
    const strengthText = document.querySelector('.strength-text');
    
    // Toggle Password Visibility
    if (togglePasswordButtons) {
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', () => {
                const input = button.parentElement.querySelector('input');
                const icon = button.querySelector('.material-symbols-rounded');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = 'visibility';
                } else {
                    input.type = 'password';
                    icon.textContent = 'visibility_off';
                }
            });
        });
    }
    
    // Password Strength Meter
    if (passwordInput) {
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const strength = checkPasswordStrength(password);
            updatePasswordStrengthUI(strength);
        });
    }
    
    // Sign Up Form Step 1
    if (signupFormStep1) {
        signupFormStep1.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const termsChecked = document.getElementById('terms').checked;
            
            // Validate form
            let isValid = true;
            
            if (!validateEmail(email)) {
                showError('email-error', 'Please enter a valid email address');
                isValid = false;
            }
            
            if (password.length < 8) {
                showError('password-error', 'Password must be at least 8 characters');
                isValid = false;
            }
            
            if (password !== confirmPassword) {
                showError('confirm-password-error', 'Passwords do not match');
                isValid = false;
            }
            
            if (!termsChecked) {
                showError('terms-error', 'You must agree to the Terms of Service');
                isValid = false;
            }
            
            if (!isValid) return;
            
            try {
                // Check if email already exists
                const signInMethods = await auth.fetchSignInMethodsForEmail(email);
                
                if (signInMethods.length > 0) {
                    showError('email-error', 'This email is already registered');
                    return;
                }
                
                // Create user in Firebase
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Send email verification
                await user.sendEmailVerification();
                
                // Store email for verification step
                if (userEmailSpan) {
                    userEmailSpan.textContent = email;
                }
                
                // Move to step 2
                goToStep(2);
                
            } catch (error) {
                console.error('Error during signup:', error);
                showError('email-error', error.message);
            }
        });
    }
    
    // Sign Up Form Step 2 (Verification)
    if (signupFormStep2) {
        // Update the verification UI for email link verification
        const updateVerificationUI = () => {
            const codeContainer = document.querySelector('.verification-code-container');
            if (codeContainer) {
                // Clear existing content
                codeContainer.innerHTML = '';
                
                // Add instructions
                const instructions = document.createElement('div');
                instructions.className = 'verification-instructions';
                instructions.innerHTML = `
                    <p>We've sent a verification link to your email.</p>
                    <p>Please check your inbox and click the link to verify your account.</p>
                    <p>After verification, click the button below to continue.</p>
                `;
                codeContainer.appendChild(instructions);
                
                // Add refresh button
                const refreshBtn = document.createElement('button');
                refreshBtn.type = 'button';
                refreshBtn.className = 'btn btn-primary verification-refresh-btn';
                refreshBtn.innerHTML = `
                    <span class="material-symbols-rounded">refresh</span>
                    Check Verification Status
                `;
                codeContainer.appendChild(refreshBtn);
                
                // Add event listener to refresh button
                refreshBtn.addEventListener('click', async () => {
                    try {
                        // Reload the current user to get updated verification status
                        if (firebase.auth().currentUser) {
                            await firebase.auth().currentUser.reload();
                            const user = firebase.auth().currentUser;
                            
                            if (user.emailVerified) {
                                // User is verified, proceed
                                showError('verification-error', '');
                                
                                // Create user profile in database if not already created
                                await createUserProfile(user);
                                
                                // Redirect to profile setup
                                window.location.href = 'profile-setup.html';
                            } else {
                                showError('verification-error', 'Your email is not verified yet. Please check your inbox and click the verification link.');
                            }
                        } else {
                            showError('verification-error', 'User session expired. Please sign in again.');
                        }
                    } catch (error) {
                        console.error('Error checking verification status:', error);
                        showError('verification-error', error.message);
                    }
                });
            }
        };
        
        // Update the UI when the step is shown
        updateVerificationUI();
        
        // Handle resend code button
        if (resendCodeBtn) {
            // Update the button text
            resendCodeBtn.textContent = 'Resend Verification Email';
            
            resendCodeBtn.addEventListener('click', async () => {
                try {
                    if (firebase.auth().currentUser) {
                        await firebase.auth().currentUser.sendEmailVerification();
                        showError('verification-error', 'Verification email sent! Please check your inbox.');
                        
                        // Disable the button temporarily
                        resendCodeBtn.disabled = true;
                        
                        // Start countdown timer
                        startResendTimer();
                    } else {
                        showError('verification-error', 'User session expired. Please sign in again.');
                    }
                } catch (error) {
                    console.error('Error sending verification email:', error);
                    showError('verification-error', error.message);
                }
            });
        }
        
        // Handle back button
        if (backButton) {
            backButton.addEventListener('click', () => {
                goToStep(1);
            });
        }
        
        // Handle verification form submission
        signupFormStep2.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                // Check if the user is verified
                if (firebase.auth().currentUser) {
                    await firebase.auth().currentUser.reload();
                    const user = firebase.auth().currentUser;
                    
                    if (user.emailVerified) {
                        // User is verified, proceed
                        showError('verification-error', '');
                        
                        // Create user profile in database if not already created
                        await createUserProfile(user);
                        
                        // Redirect to profile setup
                        window.location.href = 'profile-setup.html';
                    } else {
                        showError('verification-error', 'Your email is not verified yet. Please check your inbox and click the verification link.');
                    }
                } else {
                    showError('verification-error', 'User session expired. Please sign in again.');
                }
            } catch (error) {
                console.error('Error during verification:', error);
                showError('verification-error', error.message);
            }
        });
    }
    
    // Sign In Form
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Clear previous errors
            clearErrors();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            
            // Validate form
            let isValid = true;
            
            if (!validateEmail(email)) {
                showError('email-error', 'Please enter a valid email address');
                isValid = false;
            }
            
            if (password.length < 1) {
                showError('password-error', 'Please enter your password');
                isValid = false;
            }
            
            if (!isValid) return;
            
            try {
                // Set persistence based on remember me
                const persistence = rememberMe ? 
                    firebase.auth.Auth.Persistence.LOCAL : 
                    firebase.auth.Auth.Persistence.SESSION;
                
                await auth.setPersistence(persistence);
                
                // Sign in user
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // Check if email is verified
                if (!user.emailVerified) {
                    // Send verification email again
                    await user.sendEmailVerification();
                    
                    showError('email-error', 'Please verify your email. A new verification email has been sent.');
                    return;
                }
                
                // Check if user has completed profile setup
                const userProfile = await getUserProfile(user.uid);
                
                if (!userProfile || !userProfile.profileCompleted) {
                    // Redirect to profile setup
                    window.location.href = 'profile-setup.html';
                } else {
                    // Redirect to home page
                    window.location.href = 'index.html';
                }
                
            } catch (error) {
                console.error('Error during sign in:', error);
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    showError('email-error', 'Invalid email or password');
                } else {
                    showError('email-error', error.message);
                }
            }
        });
    }
    
    // Social Authentication
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const userCredential = await auth.signInWithPopup(provider);
                const user = userCredential.user;
                
                // Check if user exists in database
                const userProfile = await getUserProfile(user.uid);
                
                if (!userProfile) {
                    // Create user profile
                    await createUserProfile(user);
                    
                    // Redirect to profile setup
                    window.location.href = 'profile-setup.html';
                } else if (!userProfile.profileCompleted) {
                    // Redirect to profile setup
                    window.location.href = 'profile-setup.html';
                } else {
                    // Redirect to home page
                    window.location.href = 'index.html';
                }
                
            } catch (error) {
                console.error('Error during Google sign in:', error);
                showError('email-error', error.message);
            }
        });
    }
    
    if (githubAuthBtn) {
        githubAuthBtn.addEventListener('click', async () => {
            try {
                const provider = new firebase.auth.GithubAuthProvider();
                const userCredential = await auth.signInWithPopup(provider);
                const user = userCredential.user;
                
                // Check if user exists in database
                const userProfile = await getUserProfile(user.uid);
                
                if (!userProfile) {
                    // Create user profile
                    await createUserProfile(user);
                    
                    // Redirect to profile setup
                    window.location.href = 'profile-setup.html';
                } else if (!userProfile.profileCompleted) {
                    // Redirect to profile setup
                    window.location.href = 'profile-setup.html';
                } else {
                    // Redirect to home page
                    window.location.href = 'index.html';
                }
                
            } catch (error) {
                console.error('Error during GitHub sign in:', error);
                showError('email-error', error.message);
            }
        });
    }
    
    // Check Authentication State
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('User is signed in:', user.email);
            
            // Update UI for authenticated user
            updateUIForAuthenticatedUser(user);
        } else {
            console.log('No user is signed in');
            
            // Update UI for unauthenticated user
            updateUIForUnauthenticatedUser();
        }
    });
});

// Helper Functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.form-error');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

function goToStep(stepNumber) {
    // Update step indicators
    const steps = document.querySelectorAll('.step');
    steps.forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        
        if (stepNum < stepNumber) {
            step.classList.add('completed');
        } else if (stepNum === stepNumber) {
            step.classList.add('active');
        }
    });
    
    // Update progress bar
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
        const progress = ((stepNumber - 1) / (steps.length - 1)) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // Show/hide forms
    const forms = document.querySelectorAll('.step-form');
    forms.forEach(form => {
        form.classList.remove('active');
    });
    
    const activeForm = document.getElementById(`signup-form-step${stepNumber}`);
    if (activeForm) {
        activeForm.classList.add('active');
    }
}

function simulateSendVerificationCode(email) {
    // This function is now just for backward compatibility
    // The actual verification is done via Firebase's sendEmailVerification
    console.log(`Verification email sent to ${email}`);
}

function checkPasswordStrength(password) {
    // Password strength criteria
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;
    
    let strength = 0;
    
    if (hasLowerCase) strength++;
    if (hasUpperCase) strength++;
    if (hasNumber) strength++;
    if (hasSpecialChar) strength++;
    if (isLongEnough) strength++;
    
    // Map strength score to categories
    if (password.length === 0) return 'empty';
    if (strength <= 2) return 'weak';
    if (strength <= 4) return 'medium';
    return 'strong';
}

function updatePasswordStrengthUI(strength) {
    const strengthSegments = document.querySelectorAll('.strength-segment');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthSegments.length || !strengthText) return;
    
    // Reset all segments
    strengthSegments.forEach(segment => {
        segment.className = 'strength-segment';
    });
    
    // Update UI based on strength
    switch (strength) {
        case 'empty':
            strengthText.textContent = 'Password strength';
            break;
        case 'weak':
            strengthSegments[0].classList.add('weak');
            strengthText.textContent = 'Weak';
            break;
        case 'medium':
            strengthSegments[0].classList.add('medium');
            strengthSegments[1].classList.add('medium');
            strengthSegments[2].classList.add('medium');
            strengthText.textContent = 'Medium';
            break;
        case 'strong':
            strengthSegments.forEach(segment => segment.classList.add('strong'));
            strengthText.textContent = 'Strong';
            break;
    }
}

async function createUserProfile(user) {
    try {
        // Extract user info
        const { uid, email, displayName, photoURL, emailVerified } = user;
        
        // Create timestamp
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        // Create user profile object
        const userProfile = {
            uid,
            email,
            displayName: displayName || '',
            photoURL: photoURL || '',
            emailVerified,
            createdAt: timestamp,
            updatedAt: timestamp,
            lastLoginAt: timestamp,
            profileCompleted: false,
            verificationStatus: {
                email: emailVerified,
                phone: false,
                identity: false
            },
            verificationTypes: ['email'],
            experiencePoints: 0,
            level: 1,
            subscription: 'free',
            stats: {
                followers: 0,
                following: 0,
                posts: 0,
                views: 0,
                profileViews: 0,
                likes: 0
            },
            topicsFollowed: [],
            profileHistory: [{
                photoURL: photoURL || '',
                timestamp
            }]
        };
        
        // Save to database
        await database.ref(`users/${uid}`).set(userProfile);
        
        return userProfile;
    } catch (error) {
        console.error('Error creating user profile:', error);
        throw error;
    }
}

async function getUserProfile(uid) {
    try {
        const snapshot = await database.ref(`users/${uid}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
}

function updateUIForAuthenticatedUser(user) {
    // Update login/signup buttons
    const loginBtn = document.querySelector('.header-actions .btn-secondary');
    const signupBtn = document.querySelector('.header-actions .btn-primary');
    
    if (loginBtn && signupBtn) {
        // Replace with user menu button
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        
        // Check if user menu already exists
        let userMenuBtn = document.querySelector('.user-menu-btn');
        
        if (!userMenuBtn) {
            // Create user menu button
            userMenuBtn = document.createElement('button');
            userMenuBtn.className = 'btn btn-secondary user-menu-btn';
            userMenuBtn.innerHTML = `
                <span class="material-symbols-rounded">account_circle</span>
                <span class="user-name">${user.displayName || 'Account'}</span>
            `;
            
            // Add to header actions
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(userMenuBtn);
            }
        } else {
            // Update existing user menu button
            const userName = userMenuBtn.querySelector('.user-name');
            if (userName) {
                userName.textContent = user.displayName || 'Account';
            }
        }
    }
}

function updateUIForUnauthenticatedUser() {
    // Update user menu button
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const loginBtn = document.querySelector('.header-actions .btn-secondary');
    const signupBtn = document.querySelector('.header-actions .btn-primary');
    
    if (userMenuBtn) {
        userMenuBtn.style.display = 'none';
    }
    
    if (loginBtn && signupBtn) {
        loginBtn.style.display = 'block';
        signupBtn.style.display = 'block';
    }
} 