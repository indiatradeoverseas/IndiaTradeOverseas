const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// Initialize Google OAuth2 Client
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.warn('[GoogleDrive] Google OAuth credentials missing in .env');
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * Upload call recording file directly to Google Drive
 * @param {string} filePath Local absolute path of audio file
 * @param {string} fileName Original or target file name
 * @param {string} mimeType Audio mime type (audio/mpeg, audio/wav, etc.)
 */
async function uploadToGoogleDrive(filePath, fileName, mimeType = 'audio/mpeg') {
  try {
    const auth = getOAuth2Client();
    if (!auth) {
      console.warn('[GoogleDrive] Skipping Drive upload because OAuth credentials are not set.');
      return null;
    }

    const drive = google.drive({ version: 'v3', auth });

    const fileMetaData = {
      name: fileName || path.basename(filePath),
      mimeType: mimeType || 'audio/mpeg'
    };

    const media = {
      mimeType: mimeType || 'audio/mpeg',
      body: fs.createReadStream(filePath)
    };

    console.log(`[GoogleDrive] Uploading ${fileName} to Google Drive...`);
    const response = await drive.files.create({
      resource: fileMetaData,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    const fileId = response.data.id;
    console.log(`[GoogleDrive] File uploaded successfully! Drive File ID: ${fileId}`);

    // Make file readable by anyone with the link
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });
    } catch (permErr) {
      console.warn('[GoogleDrive] Warning: Could not set public permission on drive file:', permErr.message);
    }

    return {
      fileId: response.data.id,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink
    };
  } catch (error) {
    if (error.message && error.message.includes('insufficient authentication scopes')) {
      console.warn('[GoogleDrive Notice] The current GOOGLE_REFRESH_TOKEN lacks Drive scope. Please add https://www.googleapis.com/auth/drive.file scope to OAuth token.');
    } else {
      console.error('[GoogleDrive] Error uploading to Google Drive:', error.message);
    }
    return null;
  }
}

/**
 * Stream audio file from Google Drive directly
 * @param {string} fileId Google Drive File ID
 */
async function getDriveFileStream(fileId) {
  try {
    const auth = getOAuth2Client();
    if (!auth) return null;

    const drive = google.drive({ version: 'v3', auth });
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return response.data;
  } catch (error) {
    console.error('[GoogleDrive] Error fetching drive stream:', error.message);
    return null;
  }
}

module.exports = {
  uploadToGoogleDrive,
  getDriveFileStream
};
