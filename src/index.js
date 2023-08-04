const express = require('express');
const { google } = require('googleapis');
const mongoose = require('mongoose');
const cors = require('cors');

require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

if (process.env.NODE_ENV == 'production') {
  const path = require('path')
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", function (_, res) {
      res.sendFile(
          path.join(__dirname, "../frontend/build/index.html"),
          function (err) {
              if (err) {
                  res.status(500).send(err)
              }
          }
      )
  })
}

// Configure Google OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://googledriveanalytics.vercel.app/oauth2callback',// Replace with your frontend callback URL
  ['https://www.googleapis.com/auth/drive']
  );

// Google Drive API
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// OAuth2 middleware
const authenticateWithGoogle = (req, res, next) => {
  // Check if the user has an access token in the database
  // Replace with your user model and access token retrieval logic

  // Take token from the client
  let accessToken = req.headers['authorization'];

  // If accessToken is undefined, check for "Authorization" header
  if (!accessToken) {
      accessToken = req.body.headers.Authorization;
  }
  accessToken= accessToken.split(' ')[1];

  if (!accessToken) {
    return res.status(401).json({ message: 'Google Drive access token not found' });
  }

  oauth2Client.setCredentials({ access_token: accessToken });
  next();
};

// Define API routes

// Route for initiating Google Drive authentication
app.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'], // Adjust scopes as needed
  });

  res.redirect(authUrl);
});

// Route for handling Google Drive OAuth callback
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    // Save the access token in the database
    // Replace with your user model and access token saving logic
    const accessToken = tokens.access_token;
    console.log('Access Token:', accessToken);

    //return res.json({ message: 'Google Drive linked successfully', token: accessToken });
    res.redirect("http://localhost:3000/token/"+accessToken);
  } catch (error) {
    console.error('Error while getting access token:', error);
    return res.status(500).json({ message: 'Failed to link Google Drive'});
  }
});

// Route for fetching user's profile information
app.get('/profile', authenticateWithGoogle, async (req, res) => {
  try {
    const response = await drive.about.get({
      fields: 'user/displayName,user/photoLink',
    });

    const profileInfo = {
      name: response.data.user.displayName,
      picture: response.data.user.photoLink,
    };

    return res.json(profileInfo);
  } catch (error) {
    console.error('Error fetching profile info:', error);
    return res.status(500).json({ message: 'Failed to fetch profile info' });
  }
});


// Protected route to fetch Google Drive data
app.get('/drive/data', authenticateWithGoogle, async (req, res) => {
  try {
    // Use the Google Drive API to fetch files and calculate analytics
    const response = await drive.files.list({
      pageSize: 1000, // Increase the pageSize to get more files (if needed)
      fields: 'nextPageToken, files(id, name, mimeType, size)',
    });
    const files = response.data.files.map((file) => ({
      name: file.name,
      filetype: file.mimeType, // Add the filetype property based on the mime type
      size: file.size || 0,
    }));

    const analytics = {
      totalFiles: files.length,
      totalVideos: 0,
      totalImages: 0,
      totalAudios: 0,
      totalFolders: 0,
      totalStorage: 0,
    };

    files.forEach((file) => {
      if (file.filetype) {
        if (file.filetype.startsWith('image/')) {
          analytics.totalImages++;
        } else if (file.filetype.startsWith('video/')) {
          analytics.totalVideos++;
        } else if (file.filetype.startsWith('audio/')) {
          analytics.totalAudios++;
        } else if (file.filetype === 'application/vnd.google-apps.folder') {
          analytics.totalFolders++;
        }
      }

      // Calculate total storage used
      if (file.size) {
        analytics.totalStorage += parseInt(file.size, 10);
      }
    });

    // Convert totalStorage to MB for better readability
    analytics.totalStorage = (analytics.totalStorage / (1024 * 1024)).toFixed(2);
    console.log(analytics)

    return res.json({ files, analytics });
    
  } catch (error) {
    console.error('Error fetching Google Drive data:', error);
    return res.status(500).json({ message: 'Failed to fetch Google Drive data' });
  }
});


const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
