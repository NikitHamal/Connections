import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup,
    GoogleAuthProvider,
    signInAnonymously,
    onAuthStateChanged,
    signOut,
    sendPasswordResetEmail,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    getDatabase, 
    ref, 
    set, 
    get, 
    update 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

import { app } from './firebase-config.js';

// Initialize authentication
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// Handle auth state changes
export function initAuthStateListener() {
    onAuthStateChanged(auth, (user) => {
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

// Email/password signup
export async function signUpWithEmail(email, password, displayName) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
        // Update profile with display name
        await updateProfile(user, {
            displayName: displayName,
            photoURL: `https://ui-avatars.com/api/?name=${displayName}&background=random`
        });
        
        // Create user record in database
        await createUserInDatabase(user.uid, {
            email: email,
            displayName: displayName,
            photoURL: user.photoURL,
            createdAt: new Date().toISOString(),
            role: 'user'
        });
        
        return { success: true, user };
    } catch (error) {
        console.error("Error signing up:", error);
        return { success: false, error: mapAuthErrorToMessage(error.code) };
    }
}

// Email/password login
export async function signInWithEmail(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
                } catch (error) {
        console.error("Error signing in:", error);
        return { success: false, error: mapAuthErrorToMessage(error.code) };
    }
}

// Google sign-in
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Create or update user in database
        const userSnapshot = await get(ref(db, `users/${user.uid}`));
        if (!userSnapshot.exists()) {
            await createUserInDatabase(user.uid, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                createdAt: new Date().toISOString(),
                role: 'user'
            });
        }
        
        return { success: true, user };
            } catch (error) {
        console.error("Error signing in with Google:", error);
        return { success: false, error: mapAuthErrorToMessage(error.code) };
    }
}

// Anonymous sign-in
export async function signInAnonymousUser() {
    try {
        const userCredential = await signInAnonymously(auth);
                const user = userCredential.user;
                
        // Create user record in database
        await createUserInDatabase(user.uid, {
            displayName: 'Anonymous User',
            createdAt: new Date().toISOString(),
            isAnonymous: true,
            role: 'user'
        });
        
        return { success: true, user };
            } catch (error) {
        console.error("Error signing in anonymously:", error);
        return { success: false, error: mapAuthErrorToMessage(error.code) };
    }
}

// Sign out
export async function signOutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Error signing out:", error);
        return { success: false, error: error.message };
    }
}

// Password reset
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error("Error resetting password:", error);
        return { success: false, error: mapAuthErrorToMessage(error.code) };
    }
}

// Helper function to create user in database
async function createUserInDatabase(uid, userData) {
    try {
        await set(ref(db, `users/${uid}`), userData);
        return true;
    } catch (error) {
        console.error("Error creating user in database:", error);
        throw error;
    }
}

// Update user profile in both auth and database
export async function updateUserProfile(userData) {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "No authenticated user found" };
    
    try {
        // Update auth profile
        if (userData.displayName || userData.photoURL) {
            await updateProfile(user, {
                displayName: userData.displayName || user.displayName,
                photoURL: userData.photoURL || user.photoURL
            });
        }
        
        // Update user data in database
        await update(ref(db, `users/${user.uid}`), {
            ...userData,
            updatedAt: new Date().toISOString()
        });
        
        return { success: true, user };
    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: error.message };
    }
}

// Get current user from session storage or auth
export function getCurrentUser() {
    const sessionUser = sessionStorage.getItem('currentUser');
    if (sessionUser) {
        return JSON.parse(sessionUser);
    }
    return auth.currentUser;
}

// Update UI based on auth state
function updateAuthUI(user) {
    const loginButtons = document.querySelectorAll('.login-btn, .signin-btn');
    const signupButtons = document.querySelectorAll('.signup-btn');
    const profileButtons = document.querySelectorAll('.profile-btn');
    const userAvatars = document.querySelectorAll('.user-avatar');
    
    if (user) {
        // User is signed in
        loginButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        signupButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        profileButtons.forEach(btn => {
            btn.style.display = 'flex';
            
            // Find avatar within profile button
            const avatar = btn.querySelector('.avatar');
            if (avatar) {
                if (user.photoURL) {
                    avatar.style.backgroundImage = `url('${user.photoURL}')`;
                } else {
                    avatar.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random')`;
                }
            }
            
            // Find username within profile button
            const username = btn.querySelector('.username');
            if (username) {
                username.textContent = user.displayName || 'User';
            }
        });
        
        // Update avatars in comment forms and other places
        userAvatars.forEach(avatar => {
            if (user.photoURL) {
                avatar.style.backgroundImage = `url('${user.photoURL}')`;
        } else {
                avatar.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random')`;
            }
        });
    } else {
        // User is signed out
        loginButtons.forEach(btn => {
            btn.style.display = 'inline-flex';
        });
        
        signupButtons.forEach(btn => {
            btn.style.display = 'inline-flex';
        });
        
        profileButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        
        // Reset avatars to default
        userAvatars.forEach(avatar => {
            avatar.style.backgroundImage = "url('https://source.unsplash.com/random/100x100/?person')";
        });
    }
}

// Map Firebase auth error codes to user-friendly messages
function mapAuthErrorToMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
        'auth/user-not-found': 'No account found with this email. Please check your email or sign up.',
        'auth/wrong-password': 'Incorrect password. Please try again or reset your password.',
        'auth/too-many-requests': 'Too many unsuccessful login attempts. Please try again later.',
        'auth/user-disabled': 'This account has been disabled. Please contact support.',
        'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
        'auth/popup-closed-by-user': 'Sign-in popup was closed before completing the sign-in. Please try again.',
        'auth/popup-blocked': 'Sign-in popup was blocked by your browser. Please allow popups and try again.',
        'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in credentials. Try signing in using a different method.',
        'auth/network-request-failed': 'A network error occurred. Please check your internet connection and try again.',
        'auth/invalid-credential': 'Invalid credentials. Please try again.',
        'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
        'auth/missing-verification-code': 'Please enter a verification code.',
        'auth/requires-recent-login': 'This operation requires a more recent sign-in. Please sign in again.'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
} 