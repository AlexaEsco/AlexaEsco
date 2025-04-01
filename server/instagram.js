const express = require('express');
const router = express.Router();
const axios = require('axios');

// Instagram API credentials
const INSTAGRAM_CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const INSTAGRAM_CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/auth/instagram/callback';

// Store access tokens (in production, use a database)
let accessToken = null;

// Instagram login route
router.get('/login', (req, res) => {
    const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${INSTAGRAM_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
    res.redirect(authUrl);
});

// Instagram callback route
router.get('/callback', async (req, res) => {
    const { code } = req.query;
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
            client_id: INSTAGRAM_CLIENT_ID,
            client_secret: INSTAGRAM_CLIENT_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI,
            code: code
        });

        accessToken = tokenResponse.data.access_token;
        res.redirect('/social-feed'); // Redirect back to social feed page
    } catch (error) {
        console.error('Instagram authentication error:', error);
        res.status(500).json({ error: 'Failed to authenticate with Instagram' });
    }
});

// Get Instagram posts
router.get('/posts', async (req, res) => {
    if (!accessToken) {
        return res.status(401).json({ error: 'Instagram not authenticated' });
    }

    try {
        // Get user's media
        const mediaResponse = await axios.get(
            `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${accessToken}&limit=10`
        );

        // Format posts for frontend
        const posts = mediaResponse.data.data.map(post => ({
            id: post.id,
            title: post.caption?.split('\n')[0] || 'Instagram Post',
            description: post.caption || '',
            image: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
            date: post.timestamp,
            url: post.permalink,
            platform: 'instagram'
        }));

        res.json(posts);
    } catch (error) {
        console.error('Error fetching Instagram posts:', error);
        res.status(500).json({ error: 'Failed to fetch Instagram posts' });
    }
});

module.exports = router; 