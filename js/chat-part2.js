// chat-part2.js
import { ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebase.js";
import { getChatID } from "./helpers.js";
import { getCurrentUser } from "./auth.js";

export function updateTypingStatus(friendUID, isTyping) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !friendUID) return;
  const currentUID = currentUserObj.uid;
  const chatID = getChatID(currentUID, friendUID);
  const typingRef = ref(database, `typing/${chatID}/${currentUID}`);

  if (isTyping) {
    set(typingRef, true);
  } else {
    remove(typingRef);
  }
}

export function listenForTypingStatus(friendUID) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !friendUID) return;
  const currentUID = currentUserObj.uid;
  const chatID = getChatID(currentUID, friendUID);
  const typingRef = ref(database, `typing/${chatID}`);

  onValue(typingRef, (snapshot) => {
    const typingData = snapshot.val();
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingData) {
      const otherTyping = Object.keys(typingData).find(user => user !== currentUID);
      if (otherTyping) {
        // Use the friend’s username if available
        typingIndicator.textContent = window.chatPartnerName 
          ? `${window.chatPartnerName} is typing...` 
          : "Someone is typing...";
      } else {
        typingIndicator.textContent = "";
      }
    } else {
      typingIndicator.textContent = "";
    }
  });
}
