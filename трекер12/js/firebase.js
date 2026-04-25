// Firebase configuration and sync module
// Uses Firebase compat SDK (loaded via CDN in index.html)

FU.firebaseConfig = {
  apiKey: "AIzaSyCilpg8Ya7b8VQeeJIiORIgeF9QXIZn64E",
  authDomain: "tracker-fu1.firebaseapp.com",
  projectId: "tracker-fu1",
  storageBucket: "tracker-fu1.firebasestorage.app",
  messagingSenderId: "768898803874",
  appId: "1:768898803874:web:411de4f50314e276becffb"
};

// Initialize Firebase
firebase.initializeApp(FU.firebaseConfig);
var db = firebase.firestore();

// Save all debtors to Firestore
FU.saveToCloud = function(debtors) {
  var data = { debtors: debtors, updated: new Date().toISOString() };
  return db.collection("tracker").doc("main").set(data).then(function() {
    console.log("Saved to cloud");
  }).catch(function(e) {
    console.error("Cloud save error:", e);
  });
};

// Load debtors from Firestore
FU.loadFromCloud = function() {
  return db.collection("tracker").doc("main").get().then(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      console.log("Loaded from cloud, updated:", data.updated);
      return data.debtors || [];
    }
    return null;
  }).catch(function(e) {
    console.error("Cloud load error:", e);
    return null;
  });
};

// Listen for realtime changes (for manager view)
FU.listenCloud = function(callback) {
  return db.collection("tracker").doc("main").onSnapshot(function(doc) {
    if (doc.exists) {
      var data = doc.data();
      callback(data.debtors || []);
    }
  }, function(e) {
    console.error("Cloud listen error:", e);
  });
};

FU.cloudReady = true;
