const express = require('express');
const { google } = require('googleapis');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const drive = google.drive('v3');
const oauth2Client = new google.auth.OAuth2(
  '336613732186-o1l28842o1gg746tijesfubpnlohmh4l.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/oauth2callback',
  ['https://www.googleapis.com/auth/drive']
);

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, Date.now() + extension);
  },
});
const upload = multer({ storage });

// Serve the HTML form
app.get('/', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  res.send(`
    <h1>File Uploader</h1>
    <a href="${authUrl}">Authorize Google Drive</a>
  `);
});

// Handle the OAuth callback
app.get('/oauth2callback', (req, res) => {
  const code = req.query.code;
  oauth2Client.getToken(code, (err, tokens) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error authenticating with Google Drive.');
    } else {
      oauth2Client.setCredentials(tokens);
      res.redirect('/upload.html');
    }
  });
});

// Serve the file upload form
app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

// Handle the file upload
// Handle the file upload
app.post('/upload', upload.single('file'), (req, res) => {
  const fileMetadata = {
    name: req.file.originalname,
  };

  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(req.file.path),
  };

  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: 'webViewLink, id, name',
      auth: oauth2Client,
    },
    (err, file) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error uploading the file.');
      } else {
        console.log('File uploaded successfully.');

        const fileId = file.data.id;

        // Set the access permissions for the file
        drive.permissions.create(
          {
            fileId: fileId,
            requestBody: {
              role: 'reader',
              type: 'anyone',
            },
            auth: oauth2Client,
          },
          (err, permission) => {
            if (err) {
              console.error(err);
              res.status(500).send('Error setting permissions for the file.');
            } else {
              console.log('Permissions set successfully.');
              const publicUrl = file.data.webViewLink;
              let fileName= file.data.name;
              let fileId= file.data.id;
              res.send(`Public URL: <a href="${publicUrl}">${publicUrl}</a>
              File id: ${fileId} File name: ${fileName}`);
            }
          }
        );
      }
    }
  );
});


// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});