// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAnuHbSv6BniMyf3ltSZTSrIFa_92bHB-o",
    authDomain: "storm-blogs.firebaseapp.com",
    databaseURL: "https://storm-blogs-default-rtdb.firebaseio.com",
    projectId: "storm-blogs",
    storageBucket: "storm-blogs.firebasestorage.app",
    messagingSenderId: "158567556221",
    appId: "1:158567556221:web:855dfa074fc5b65e68fd14",
    measurementId: "G-16WVQ25D8P"
};

// Initialize Firebase if not already initialized
try {
    const app = firebase.app();
    console.log('Firebase already initialized');
} catch (e) {
    // Initialize Firebase if not already initialized
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized');
} 