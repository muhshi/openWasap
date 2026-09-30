const fs = require('fs');
const path = require('path');

const utilsPath = path.resolve(__dirname, '../node_modules/whatsapp-web.js/src/util/Injected/Utils.js');

if (!fs.existsSync(utilsPath)) {
  console.log('[patch-wwebjs] whatsapp-web.js not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(utilsPath, 'utf8');
let modified = false;

// 1. Fix message.id being overwritten by mediaOptions causing:
// "Data passed to getter must include an id property (it's how we memoize) but got undefined"
if (content.includes('id: newMsgKey,') && content.includes('...mediaOptions,') && !content.includes('delete mediaOptions.id;')) {
  const targetCode = `        const message = {
            ...options,
            id: newMsgKey,
            ack: 0,
            body: content,
            from: from,
            to: chat.id,
            local: true,
            self: 'out',
            t: parseInt(new Date().getTime() / 1000),
            isNewMsg: true,
            type: 'chat',
            ...ephemeralFields,
            ...mediaOptions,
            ...(mediaOptions.toJSON ? mediaOptions.toJSON() : {}),`;

  const replacementCode = `        const mediaJson = mediaOptions && mediaOptions.toJSON ? mediaOptions.toJSON() : {};
        if (mediaOptions) {
            delete mediaOptions.id;
            delete mediaOptions.__x_id;
        }
        delete mediaJson.id;
        delete mediaJson.__x_id;

        const message = {
            ...options,
            ack: 0,
            body: content,
            from: from,
            to: chat.id,
            local: true,
            self: 'out',
            t: parseInt(new Date().getTime() / 1000),
            isNewMsg: true,
            type: 'chat',
            ...ephemeralFields,
            ...mediaOptions,
            ...mediaJson,`;

  if (content.includes(targetCode)) {
    content = content.replace(targetCode, replacementCode);
    // Add id: newMsgKey and delete message.__x_id
    content = content.replace(
      `            ...extraOptions,\n        };`,
      `            ...extraOptions,\n            id: newMsgKey,\n        };\n        delete message.__x_id;`
    );
    modified = true;
    console.log('[patch-wwebjs] Successfully patched media message.id in Utils.js');
  }
}

// 2. Add retry loop for Msg.get(newMsgKey._serialized)
const targetMsgGet = `        return window\n            .require('WAWebCollections')\n            .Msg.get(newMsgKey._serialized);`;
const replacementMsgGet = `        let sentMsg = window
            .require('WAWebCollections')
            .Msg.get(newMsgKey._serialized);
        if (!sentMsg) {
            for (let i = 0; i < 10; i++) {
                await new Promise((r) => setTimeout(r, 100));
                sentMsg = window.require('WAWebCollections').Msg.get(newMsgKey._serialized);
                if (sentMsg) break;
            }
        }
        return sentMsg;`;

if (content.includes(targetMsgGet)) {
  content = content.replace(targetMsgGet, replacementMsgGet);
  modified = true;
  console.log('[patch-wwebjs] Successfully patched Msg.get retry in Utils.js');
}

// 3. Patch mediaInfoToFile to cleanly handle base64 prefixes, newlines, and fallback names
const targetMediaInfo = `    window.WWebJS.mediaInfoToFile = ({ data, mimetype, filename }) => {
        const binaryData = window.atob(data);

        const buffer = new ArrayBuffer(binaryData.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryData.length; i++) {
            view[i] = binaryData.charCodeAt(i);
        }

        const blob = new Blob([buffer], { type: mimetype });
        return new File([blob], filename, {
            type: mimetype,
            lastModified: Date.now(),
        });
    };`;

const replacementMediaInfo = `    window.WWebJS.mediaInfoToFile = ({ data, mimetype, filename }) => {
        const cleanData = typeof data === 'string'
            ? (data.includes('base64,') ? data.split('base64,')[1] : data).replace(/[\\r\\n\\s]/g, '')
            : data;
        const binaryData = window.atob(cleanData);

        const buffer = new ArrayBuffer(binaryData.length);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < binaryData.length; i++) {
            view[i] = binaryData.charCodeAt(i);
        }

        const safeMime = mimetype || 'application/octet-stream';
        const safeName = filename || 'file';
        const blob = new Blob([buffer], { type: safeMime });
        return new File([blob], safeName, {
            type: safeMime,
            lastModified: Date.now(),
        });
    };`;

if (content.includes(targetMediaInfo)) {
  content = content.replace(targetMediaInfo, replacementMediaInfo);
  modified = true;
  console.log('[patch-wwebjs] Successfully patched mediaInfoToFile in Utils.js');
}

if (modified) {
  fs.writeFileSync(utilsPath, content, 'utf8');
  console.log('[patch-wwebjs] Finished writing patched Utils.js');
} else {
  console.log('[patch-wwebjs] Utils.js already up to date.');
}

