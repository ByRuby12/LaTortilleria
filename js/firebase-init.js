(function initializeFirebase() {
    const firebaseConfig = {
        apiKey: 'AIzaSyBewHxHbq40hiL_8hichZY_e_NzNdmk1Wk',
        authDomain: 'latortilleria.firebaseapp.com',
        projectId: 'latortilleria',
        storageBucket: 'latortilleria.firebasestorage.app',
        messagingSenderId: '648939093516',
        appId: '1:648939093516:web:b250d41c13496d08993829',
        measurementId: 'G-RKSN0M9D67'
    };

    if (!window.firebase || window.firebase.apps.length) return;

    const app = window.firebase.initializeApp(firebaseConfig);
    if (window.firebase.auth) window.firebaseAuth = app.auth();
    if (window.firebase.firestore) window.firebaseDb = app.firestore();
})();
