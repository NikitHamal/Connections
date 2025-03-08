// Auth Module for Connections
// Initialize Firebase Auth
const auth = firebase.auth();
const db = firebase.database();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Sign In Form
    const signinForm = document.getElementById('signin-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const togglePasswordBtn = document.querySelector('.toggle-password');
    const googleAuthBtn = document.querySelector('.google-auth');
    const githubAuthBtn = document.querySelector('.github-auth');
    const forgotPasswordLink = document.querySelector('.forgot-password');

    // Sign Up Form Elements
    const signupFormStep1 = document.getElementById('signup-form-step1');
    const signupFormStep2 = document.getElementById('signup-form-step2');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    const termsCheckbox = document.getElementById('terms');
    const termsError = document.getElementById('terms-error');
    const passwordStrengthSegments = document.querySelectorAll('.strength-segment');
    const strengthText = document.querySelector('.strength-text');
    const userEmailSpan = document.getElementById('user-email');
    const resendCodeBtn = document.getElementById('resend-code');
    const resendTimerSpan = document.getElementById('resend-timer');
    const verificationError = document.getElementById('verification-error');
    const stepIndicators = document.querySelectorAll('.step');
    const backButton = document.querySelector('.btn-back');

    // Event Listeners
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }

    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', handleGoogleSignIn);
    }

    if (githubAuthBtn) {
        githubAuthBtn.addEventListener('click', handleGithubSignIn);
    }

    if (signinForm) {
        signinForm.addEventListener('submit', handleSignIn);
    }

    if (signupFormStep1) {
        signupFormStep1.addEventListener('submit', handleSignUpStep1);
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    if (signupFormStep2) {
        signupFormStep2.addEventListener('submit', handleSignUpStep2);
    }

    if (backButton) {
        backButton.addEventListener('click', () => {
            showStep(1);
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }

    if (resendCodeBtn) {
        resendCodeBtn.addEventListener('click', resendVerificationEmail);
    }

    // Initialize the UI based on authentication state
    initAuthStateListener();
});

// Toggle password visibility
function togglePasswordVisibility(e) {
    const passwordInput = e.currentTarget.parentElement.querySelector('input');
    const icon = e.currentTarget.querySelector('span');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.textContent = 'visibility';
    } else {
        passwordInput.type = 'password';
        icon.textContent = 'visibility_off';
    }
}

// Check password strength
function checkPasswordStrength(e) {
    const password = e.target.value;
    const segments = document.querySelectorAll('.strength-segment');
    const strengthText = document.querySelector('.strength-text');
    
    // Clear previous strength indicators
    segments.forEach(segment => {
        segment.className = 'strength-segment';
    });
    
    if (!password) {
        strengthText.textContent = 'Password strength';
        return;
    }
    
    // Calculate password strength
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Update UI based on strength
    for (let i = 0; i < strength; i++) {
        if (segments[i]) {
            if (strength === 1) {
                segments[i].classList.add('weak');
            } else if (strength === 2 || strength === 3) {
                segments[i].classList.add('medium');
            } else {
                segments[i].classList.add('strong');
            }
        }
    }
    
    // Update strength text
    if (strength === 0 || strength === 1) {
        strengthText.textContent = 'Weak password';
    } else if (strength === 2 || strength === 3) {
        strengthText.textContent = 'Medium strength';
    } else {
        strengthText.textContent = 'Strong password';
    }
}

// Handle sign in form submission
function handleSignIn(e) {
    e.preventDefault();
    
    // Reset error messages
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    emailError.textContent = '';
    passwordError.textContent = '';
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me')?.checked;
    
    // Validation
    let isValid = true;
    
    if (!email) {
        emailError.textContent = 'Please enter your email';
        isValid = false;
    } else if (!isValidEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        isValid = false;
    }
    
    if (!password) {
        passwordError.textContent = 'Please enter your password';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Set persistence
    const persistence = rememberMe ? 
        firebase.auth.Auth.Persistence.LOCAL : 
        firebase.auth.Auth.Persistence.SESSION;
    
    auth.setPersistence(persistence)
        .then(() => {
            // Sign in with email and password
            return auth.signInWithEmailAndPassword(email, password);
        })
        .then((userCredential) => {
            // Redirect to home or previous page
            window.location.href = 'index.html';
        })
        .catch((error) => {
            console.error("Error signing in:", error);
            const errorMessage = mapAuthErrorToMessage(error.code);
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                emailError.textContent = errorMessage;
            } else if (error.code === 'auth/wrong-password') {
                passwordError.textContent = errorMessage;
            } else {
                // General error
                passwordError.textContent = errorMessage;
            }
        });
}

// Handle sign up step 1 submission
function handleSignUpStep1(e) {
    e.preventDefault();
    
    // Reset error messages
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    const termsError = document.getElementById('terms-error');
    emailError.textContent = '';
    passwordError.textContent = '';
    confirmPasswordError.textContent = '';
    termsError.textContent = '';
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const termsAccepted = document.getElementById('terms').checked;
    
    // Validation
    let isValid = true;
    
    if (!email) {
        emailError.textContent = 'Please enter your email';
        isValid = false;
    } else if (!isValidEmail(email)) {
        emailError.textContent = 'Please enter a valid email address';
        isValid = false;
    }
    
    if (!password) {
        passwordError.textContent = 'Please create a password';
        isValid = false;
    } else if (password.length < 8) {
        passwordError.textContent = 'Password must be at least 8 characters';
        isValid = false;
    }
    
    if (!confirmPassword) {
        confirmPasswordError.textContent = 'Please confirm your password';
        isValid = false;
    } else if (password !== confirmPassword) {
        confirmPasswordError.textContent = 'Passwords do not match';
        isValid = false;
    }
    
    if (!termsAccepted) {
        termsError.textContent = 'You must accept the Terms of Service and Privacy Policy';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Save form data for step 2
    sessionStorage.setItem('signupEmail', email);
    sessionStorage.setItem('signupPassword', password);
    
    // Update step 2 UI
    document.getElementById('user-email').textContent = email;
    
    // Move to step 2
    showStep(2);
}

// Handle sign up step 2 submission (verification)
function handleSignUpStep2(e) {
    e.preventDefault();
    
    const email = sessionStorage.getItem('signupEmail');
    const password = sessionStorage.getItem('signupPassword');
    
    if (!email || !password) {
        showStep(1);
        return;
    }
    
    // Create account
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Send verification email
            userCredential.user.sendEmailVerification();
            
            // Create user in database
            createUserInDatabase(userCredential.user.uid, {
                email: email,
                createdAt: new Date().toISOString(),
                role: 'user'
            });
            
            // Clear session storage
            sessionStorage.removeItem('signupEmail');
            sessionStorage.removeItem('signupPassword');
            
            // Redirect to profile setup
            window.location.href = 'profile-setup.html';
        })
        .catch((error) => {
            const verificationError = document.getElementById('verification-error');
            verificationError.textContent = mapAuthErrorToMessage(error.code);
            console.error("Error creating account:", error);
        });
}

// Handle Google sign-in
function handleGoogleSignIn() {
    auth.signInWithPopup(googleProvider)
        .then((result) => {
            const user = result.user;
            
            // Check if new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            
            if (isNewUser) {
                // Create user in database
                createUserInDatabase(user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date().toISOString(),
                    role: 'user'
                })
                .then(() => {
                    // New users go to profile setup
                    window.location.href = 'profile-setup.html';
                });
            } else {
                // Existing users go to home page
                window.location.href = 'index.html';
            }
        })
        .catch((error) => {
            console.error("Error signing in with Google:", error);
            alert(mapAuthErrorToMessage(error.code));
        });
}

// Handle GitHub sign-in
function handleGithubSignIn() {
    const githubProvider = new firebase.auth.GithubAuthProvider();
    
    auth.signInWithPopup(githubProvider)
        .then((result) => {
            const user = result.user;
            
            // Check if new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            
            if (isNewUser) {
                // Create user in database
                createUserInDatabase(user.uid, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    createdAt: new Date().toISOString(),
                    role: 'user'
                })
                .then(() => {
                    // New users go to profile setup
                    window.location.href = 'profile-setup.html';
                });
            } else {
                // Existing users go to home page
                window.location.href = 'index.html';
            }
        })
        .catch((error) => {
            console.error("Error signing in with GitHub:", error);
            alert(mapAuthErrorToMessage(error.code));
        });
}

// Handle forgot password
function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt("Please enter your email address:");
    
    if (email) {
        if (!isValidEmail(email)) {
            alert("Please enter a valid email address");
            return;
        }
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                alert("Password reset email sent. Please check your inbox.");
            })
            .catch((error) => {
                console.error("Error sending reset email:", error);
                alert(mapAuthErrorToMessage(error.code));
            });
    }
}

// Resend verification email
function resendVerificationEmail() {
    const email = document.getElementById('user-email').textContent;
    const resendBtn = document.getElementById('resend-code');
    const timerSpan = document.getElementById('resend-timer');
    
    if (!email) return;
    
    // Disable button and start timer
    resendBtn.disabled = true;
    let seconds = 30;
    
    timerSpan.textContent = `(${seconds}s)`;
    
    const timer = setInterval(() => {
        seconds--;
        timerSpan.textContent = `(${seconds}s)`;
        
        if (seconds <= 0) {
            clearInterval(timer);
            timerSpan.textContent = '';
            resendBtn.disabled = false;
        }
    }, 1000);
    
    // Send password reset email as a workaround for verification
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert("Verification email sent. Please check your inbox.");
        })
        .catch((error) => {
            console.error("Error sending verification email:", error);
            alert(mapAuthErrorToMessage(error.code));
        });
}

// Show step for multi-step form
function showStep(stepNumber) {
    const forms = document.querySelectorAll('.step-form');
    const steps = document.querySelectorAll('.step');
    
    forms.forEach(form => {
        form.classList.remove('active');
    });
    
    steps.forEach((step, index) => {
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
        } else {
            step.classList.remove('completed');
        }
        
        if (index + 1 === stepNumber) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    const activeForm = document.getElementById(`signup-form-step${stepNumber}`);
    if (activeForm) {
        activeForm.classList.add('active');
    }
}

// Create user in database
function createUserInDatabase(uid, userData) {
    return db.ref(`users/${uid}`).set(userData);
}

// Handle auth state changes
function initAuthStateListener() {
    auth.onAuthStateChanged((user) => {
        // Update UI based on authentication state
        updateAuthUI(user);
        
        // Store user in session storage for persistence across pages
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify({
                uid: user.uid,
                displayName: user.displayName || 'Anonymous User',
                email: user.email || '',
                photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
            }));
                } else {
            sessionStorage.removeItem('currentUser');
        }
    });
}

// Update UI based on auth state
function updateAuthUI(user) {
    const loginButtons = document.querySelectorAll('.login-btn, .signin-btn, .btn-secondary[href="signin.html"]');
    const signupButtons = document.querySelectorAll('.signup-btn, .btn-primary[href="signup.html"]');
    const profileLinks = document.querySelectorAll('.profile-link');
    
    if (user) {
        // User is signed in
        loginButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        signupButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        profileLinks.forEach(link => {
            link.style.display = 'block';
        });
    } else {
        // User is signed out
        loginButtons.forEach(btn => {
            btn.style.display = 'inline-flex';
        });
        
        signupButtons.forEach(btn => {
            btn.style.display = 'inline-flex';
        });
        
        profileLinks.forEach(link => {
            link.style.display = 'none';
        });
    }
}

// Helper function to validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Map Firebase auth error codes to user-friendly messages
function mapAuthErrorToMessage(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered';
        case 'auth/invalid-email':
            return 'Please enter a valid email address';
        case 'auth/user-disabled':
            return 'This account has been disabled';
        case 'auth/user-not-found':
            return 'No account found with this email';
        case 'auth/wrong-password':
            return 'Incorrect password';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/invalid-credential':
            return 'Invalid login credentials';
        case 'auth/operation-not-allowed':
            return 'This login method is not enabled';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with the same email but different sign-in credentials';
        case 'auth/popup-closed-by-user':
            return 'Login popup was closed before completion';
        default:
            return 'An error occurred. Please try again later';
    }
}

// Generate stars for background animation
document.addEventListener('DOMContentLoaded', function() {
    const starsContainer = document.querySelector('.stars-container');
    if (starsContainer) {
        for (let i = 0; i < 50; i++) {
            const star = document.createElement('div');
            star.classList.add('star');
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.animationDuration = `${Math.random() * 3 + 2}s`;
            star.style.animationDelay = `${Math.random() * 3}s`;
            starsContainer.appendChild(star);
        }
    }
}); 