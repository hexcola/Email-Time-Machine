"use strict";

ChromeUtils.defineModuleGetter(
  this,
  "ExtensionCommon",
  "resource://gre/modules/ExtensionCommon.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "Services",
  "resource://gre/modules/Services.jsm"
);
ChromeUtils.defineModuleGetter(
  this,
  "MailServices",
  "resource:///modules/MailServices.jsm"
);

var { MailUtils } = ChromeUtils.import("resource:///modules/MailUtils.jsm");

var MessageModifier = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      MessageModifier: {
        async modifyMessageDate(messageId, newDate, dstFolder) {
          console.log("Starting modifyMessageDate with:", messageId, newDate);
          try {
            // Get message header
            console.log("Getting message header...");
            let msgHdr = context.extension.messageManager.get(messageId);
            if (!msgHdr) {
              console.error("Message header not found for ID:", messageId);
              throw new Error("Message not found");
            }
            console.log("Message header found:", msgHdr);

            // Get folder and URI
            console.log("Getting folder and URI...");
            let folder = msgHdr.folder;
            console.log("Folder:", folder.URI);

            // Get the message service using MailServices
            console.log("Getting message service...");
            let msgUri = folder.getUriForMsg(msgHdr);
            let msgService = MailServices.messageServiceFromURI(msgUri);

            // Create stream listener
            console.log("Creating stream listener...");
            let streamListener = Components.classes["@mozilla.org/network/sync-stream-listener;1"].createInstance(Components.interfaces.nsISyncStreamListener);

            // Stream message
            console.log("Streaming message...");
            msgService.streamMessage(msgUri, streamListener, null, null, false, "");

            // Get message content as string
            let originalContent = "";
            try {
              let inputStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
              inputStream.init(streamListener.inputStream);
              originalContent = inputStream.read(inputStream.available());
              inputStream.close();
            } catch (streamError) {
              console.error("Error reading stream:", streamError);
              throw new Error("Failed to read message content");
            }

            console.log("Original content length:", originalContent.length);

            // Modify content
            console.log("Modifying content...", originalContent);

            let dateMatch = originalContent.match(/^Date:.*$/m);
            if (!dateMatch) {
              console.error("Date header not found in message");
              throw new Error("Date header not found");
            }
            console.log("Original date header:", dateMatch[0]);

            let newContent = originalContent.replace(
              /^Date:.*$/m,
              `Date: ${newDate}`
            );
            console.log("New content", newContent)
            console.log("New content length:", newContent.length);


            // Create a temporary file
            let tempFile = Components.classes["@mozilla.org/file/directory_service;1"]
              .getService(Components.interfaces.nsIProperties)
              .get("TmpD", Components.interfaces.nsIFile);
            
            tempFile.append("temp_message.eml");
            tempFile.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0o666);

            // Write the content to the temporary file
            let outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
              .createInstance(Components.interfaces.nsIFileOutputStream);
            outputStream.init(tempFile, -1, -1, 0);

            let converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
            .createInstance(Components.interfaces.nsIConverterOutputStream);
              converter.init(outputStream, "UTF-8", 0, 0);
              converter.writeString(newContent);
              converter.close();
              outputStream.close();


            // Create target folder instance
            const dstFolderURI = `${folder.URI.match(/imap:\/\/[^/]*/)[0]}${dstFolder}`;
            console.log(dstFolderURI);
            let dstFolderInst = MailUtils.getExistingFolder(dstFolderURI)
            console.log(dstFolderInst)

            // Create a copy service
            let copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"]
                           .getService(Components.interfaces.nsIMsgCopyService);




            // Create a copy listener that properly implements nsIMsgCopyServiceListener
            let copyListener = {
              QueryInterface: function(iid) {
                  if (iid.equals(Components.interfaces.nsIMsgCopyServiceListener) ||
                      iid.equals(Components.interfaces.nsISupports))
                      return this;
                  throw Components.results.NS_NOINTERFACE;
              },

              OnStartCopy: function() {
                  console.log("Started copying message");
              },
              OnProgress: function(aProgress, aProgressMax) {
                  console.log(`Copy progress: ${aProgress}/${aProgressMax}`);
              },
              SetMessageKey: function(aKey) {
                  console.log("New message key:", aKey);
              },
              GetMessageId: function() {
                  return "";
              },
              OnStopCopy: function(aStatus) {
                  console.log("OnStopCopy called with status:", aStatus);
              }
            };
            

            // Copy the modified message back to the folder
            try {
              console.log("copy the modifed message back to the folder ...");
              console.log("Should fire the listener", copyListener)
              console.log(folder.URI);
              // https://searchfox.org/comm-central/source/mailnews/base/public/nsIMsgCopyService.idl
              copyService.copyFileMessage(
                  tempFile,         // aFile   
                  dstFolderInst,    // dstFolder
                  msgHdr,           // msgToReplace
                  false,            // isDraftOrTemplate
                  0,                // aMsgFlags
                  "",               // aMsgKeywords
                  copyListener,     // listener
                  null              // msgWindow
              );
            } catch (error) {
              console.error("Error copying modified message:", error);
              throw new Error("Failed to save modified message");
            }
            return true;
          } catch (error) {
            console.error("Detailed error in modifyMessageDate:", error);
            console.error("Error stack:", error.stack);
            throw new Error(`Message modification failed: ${error.message}`);
          }
        },
      },
    };
  }
};
