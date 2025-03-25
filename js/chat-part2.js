// chat-part2.js
import { ref, onValue, set, remove } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebase.js";
import { getChatID } from "./helpers.js";
import { getCurrentUser } from "./auth.js";

export function updateTypingStatus(chatWith, isTyping) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !chatWith) return;
  const currentUID = currentUserObj.uid;
  const chatID = getChatID(currentUID, chatWith);
  const typingRef = ref(database, `typing/${chatID}/${currentUID}`);

  if (isTyping) {
    set(typingRef, true);
  } else {
    remove(typingRef);
  }
}

export function listenForTypingStatus(chatWith) {
  const currentUserObj = getCurrentUser();
  if (!currentUserObj || !chatWith) return;
  const currentUID = currentUserObj.uid;
  const chatID = getChatID(currentUID, chatWith);
  const typingRef = ref(database, `typing/${chatID}`);

  onValue(typingRef, (snapshot) => {
    const typingData = snapshot.val();
    const typingIndicator = document.getElementById("typingIndicator");
    if (typingData) {
      const otherTyping = Object.keys(typingData).find(user => user !== currentUID);
      typingIndicator.textContent = otherTyping ? `${otherTyping} is typing...` : "";
    } else {
      typingIndicator.textContent = "";
    }
  });
}
