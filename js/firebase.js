// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";

// Your Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBtLyhlgUx4XV_MvgrjhZOU-GrRm6LL-C4",
  authDomain: "testchat-b5f55.firebaseapp.com",
  projectId: "testchat-b5f55",
  databaseURL: "https://testchat-b5f55-default-rtdb.firebaseio.com/",
  storageBucket: "testchat-b5f55.appspot.com",
  messagingSenderId: "468989733956",
  appId: "1:468989733956:web:93158327c5d4370e4c2011"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { app, database };
