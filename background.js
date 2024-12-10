// background.js
"use strict";

console.log("Background script loading...");

// Initialize when the extension loads
browser.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  // Check if our API is available
  if (browser.MessageModifier) {
    console.log("MessageModifier API is available");
  } else {
    console.log("MessageModifier API is NOT available");
  }
});

// Add message display action listener
browser.messageDisplayAction.onClicked.addListener(async (tab) => {
  console.log("Message display action clicked");
  // This won't actually trigger since we're using a popup,
  // but good to have as a fallback
});

// Optional: Listen for messages from popup.js if needed
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "dateModified") {
    console.log("Date modification completed for message:", message.messageId);
  }
});