# Render Deployment Guide for ARAM Tracker

This guide will help you deploy your ARAM Tracker API to Render so it can be accessed from any device.

## Prerequisites

1. A Render account (free tier available)
2. Your GitHub repository connected to Render
3. Your Riot API key

## Step 1: Deploy to Render

1. **Connect your GitHub repository** to Render
2. **Create a new Web Service** with the following settings:
   - Name: `aram-tracker-api`
   - Environment: `Node`
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node index.js`
   - Instance Type: `Free`

3. **Create a new MySQL Database**:
   - Name: `aram-tracker-db`
   - Database Name: `aram_tracker`
   - User: `aram_user`
   - Instance Type: `Free`

## Step 2: Configure Environment Variables

In your Render web service dashboard, add these environment variables:

### Required Variables
```
NODE_ENV=production
PORT=10000
MYSQL_HOST=your-database-hostname.render.com
MYSQL_PORT=3306
MYSQL_DATABASE=aram_tracker
MYSQL_USER=aram_user
MYSQL_PASSWORD=your-database-password
RIOT_API_KEY=your-riot-api-key
```

### Getting Database Credentials
1. Go to your MySQL database dashboard in Render
2. Click "Connect" to see the hostname and credentials
3. Copy these values to your web service environment variables

## Step 3: Update Your Packaged App

For your packaged Electron app to connect to the deployed API:

1. **Create a production .env file** in your client directory:
   ```
   REACT_APP_API_URL=https://your-app-name.onrender.com
   ```

2. **Rebuild your app** with the production URL:
   ```bash
   cd client
   npm run build
   npm run electron
   ```

## Step 4: Database Setup

Your database will be created automatically, but you'll need to initialize the tables:

1. **Connect to your Render database** using a MySQL client
2. **Run your initialization scripts**:
   ```bash
   # Run these scripts in order
   python server/initializeChampions.py
   python server/initializeItems.py
   python server/initializeAugments.py
   ```

## Step 5: Test Your Deployment

1. **Check API health**: Visit `https://your-app-name.onrender.com/api/matches`
2. **Test your packaged app**: It should now connect to the deployed API
3. **Verify data ingestion**: Try ingesting a summoner's data

## Important Notes

- **Free tier limitations**: Render's free tier may have cold starts (30-60 second delays)
- **Database connections**: Use connection pooling in production
- **CORS**: Your API is already configured with CORS for cross-origin requests
- **Environment variables**: Never commit sensitive data to Git

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Verify your database credentials
   - Check that the database is running
   - Ensure the user has proper permissions

2. **Build failures**:
   - Check that all dependencies are in `server/package.json`
   - Verify the build and start commands

3. **CORS issues**:
   - Your API already has CORS configured
   - Ensure the client URL is properly set

### Monitoring

- Check Render logs for any errors
- Monitor database usage in the Render dashboard
- Test API endpoints regularly

## Scaling

If you need to scale beyond the free tier:
1. Upgrade your web service instance
2. Consider a larger database plan
3. Implement caching for frequently accessed data
4. Add monitoring and alerting

## Security Considerations

1. **API Key Security**: Never expose your Riot API key in client-side code
2. **Database Security**: Use parameterized queries (already implemented)
3. **Rate Limiting**: Consider implementing rate limiting for your API
4. **HTTPS**: Render automatically provides SSL certificates

Your ARAM Tracker is now accessible from any device with the packaged app!
