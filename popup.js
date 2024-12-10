// popup.js
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup loaded");
  console.log("MessageModifier availability:", !!browser.MessageModifier);

  const folderSelect = document.getElementById("targetFolder");
  const dateInput = document.getElementById("newDate");
  const applyButton = document.getElementById("apply");
  const statusDiv = document.getElementById("status");

  let messageList = null;

  // make sure api load correctly
  if (!browser.MessageModifier) {
    statusDiv.textContent = `API is not load correctly`;
    console.error("MessageModifier API is not available!");
    return;
  }

  // make sure message is selected
  try {
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    console.log("Current tabs:", tabs);

    messageList = await browser.messageDisplay.getDisplayedMessages(
      tabs[0].id
    );
    console.log("Message list:", messageList);

    if (messageList.length === 0) {
      statusDiv.textContent = `No message selected`;
      console.error("No message selected");
      return;
    }
  } catch (error) {
    statusDiv.textContent = `Error loading message: ${error.message}`;
  }

  // Load all folders
  try {
    console.log("Loading accounts...");
    let accounts = await browser.accounts.list(true);

    if (accounts.length === 0) {
      statusDiv.textContent = `Error loading folders: Can't load account info`;
      return;
    }

    const folders = accounts[0].folders;
    console.log("Folders:", folders);

    for (const folder of folders) {
      const option = document.createElement("option");
      option.value = folder.path;
      
      // Create indentation based on folder path depth
      const depth = folder.path.split("/").length - 1;
      const indent = "  ".repeat(depth);
      option.textContent = indent + folder.name;
      folderSelect.appendChild(option);
    }
  } catch (error) {
    statusDiv.textContent = `Error loading folders: ${error.message}`;
  }

  // Handle apply button click
  applyButton.addEventListener("click", async () => {
    try {
      console.log("New date:", dateInput.value);

      if (!dateInput.value) {
        statusDiv.textContent = "Please select date and time";
        return;
      }
      let newDate = new Date(dateInput.value);


      if (!folderSelect.value) {
        statusDiv.textContent = "Please select target folder";
        return;
      }

      applyButton.disabled = true;
      statusDiv.textContent = "Applying changes...";

      // Need to add a new paramter:  targetFolder: folderSelect.value,
      console.log(folderSelect.value);
      console.log(messageList[0]);

      await browser.MessageModifier.modifyMessageDate(
        messageList[0].id,
        newDate.toUTCString(),
        folderSelect.value
      );

      statusDiv.textContent = "Changes applied successfully!";
      setTimeout(() => window.close(), 2000);
    } catch (error) {
      statusDiv.textContent = `Error: ${error.message}`;
      applyButton.disabled = false;
    }
  });
});
