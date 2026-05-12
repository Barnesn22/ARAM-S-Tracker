# Database Access Setup Guide

This guide explains how to set up remote access to your ARAM Tracker database so the app can read data from other computers.

## Prerequisites

1. MySQL database with the ARAM Tracker schema
2. Node.js server running
3. Client application configured to connect to the server

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```bash
# Copy the example file
cp .env.example .env
```

Edit the `.env` file with your database credentials:

```env
# Oracle MySQL Heatwave Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=aram_tracker
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password

# Node.js Server Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=aram_tracker
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
PORT=3001
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Start the Server

```bash
# From project root
npm run server
```

The server will start on `http://localhost:3001`

### 4. Start the Client

```bash
# From project root
npm run dev
```

The client will start and connect to the server automatically.

## Remote Access Configuration

### For Local Network Access

1. **Find your local IP address:**
   - Windows: `ipconfig`
   - Mac/Linux: `ifconfig` or `ip addr`

2. **Update the API client configuration:**
   
   Edit `client/src/api/client.js` and change the baseURL:
   ```javascript
   const apiClient = new ApiClient('http://YOUR_LOCAL_IP:3001');
   ```

3. **Ensure MySQL allows remote connections:**
   
   In your MySQL configuration, allow connections from other computers:
   ```sql
   CREATE USER 'your_user'@'%' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON aram_tracker.* TO 'your_user'@'%';
   FLUSH PRIVILEGES;
   ```

### For Production Deployment

1. **Deploy the Node.js server** to a hosting service (Render, Heroku, etc.)
2. **Update the API client baseURL** to your production URL
3. **Configure MySQL for production** with proper security settings

## API Endpoints

The server provides the following endpoints:

- `GET /api/matches` - Get recent matches
- `GET /api/matches/:match_id/participants` - Get participants for a specific match
- `GET /api/summoners/:puuid` - Get summoner information
- `GET /api/stats/champions` - Get champion statistics
- `GET /` - Health check

## Testing the Connection

1. Start both server and client
2. Navigate to "Match History" or "Database Stats" in the app sidebar
3. You should see data from your database

## Troubleshooting

### Common Issues

1. **CORS errors:** The server includes CORS middleware, but ensure the client URL is allowed
2. **Database connection errors:** Verify your database credentials and that MySQL is running
3. **No data displayed:** Check that your MySQL ingestion script has populated the database

### Debugging

- Check the server console for any errors
- Use browser dev tools to inspect API requests
- Test endpoints directly in your browser or with curl:

```bash
curl http://localhost:3001/api/matches
```

## Security Notes

- In production, always use HTTPS
- Never commit database credentials to version control
- Use environment variables for all sensitive configuration
- Consider implementing authentication for your API endpoints
