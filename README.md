# ARAM-S-Tracker

A League of Legends ARAM stats tracker application built with React and Electron.

## Project Structure

```
aram-app/
├── client/              # React/Electron frontend
│   ├── src/            # React components and pages
│   ├── electron/       # Electron main process
│   └── package.json    # Frontend dependencies
├── server/              # Data collection scripts
│   ├── data/           # Data storage
│   └── requirements.txt # Python dependencies for data processing
├── package.json        # Workspace configuration
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Barnesn22/ARAM-S-Tracker.git
cd ARAM-S-Tracker
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Install Python server dependencies:
```bash
cd server
pip install -r requirements.txt
cd ..
```

### Development

Start the Electron application in development mode:
```bash
npm run dev
```

### Data Collection

Initialize data collection:
```bash
npm run data:init
```

Run data ingestion:
```bash
npm run data:ingest
```

### Building

Build the Electron application:
```bash
npm run build
npm run dist
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `RIOT_API_KEY`: Your Riot Games API key (optional for data collection)

## Features

- Track ARAM match statistics
- View champion performance data
- Export match history
- Real-time updates during matches

## License

MIT License