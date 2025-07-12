# WDWD
"What Did We Drink" simple drink tracker.

## Usage

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   node server.js
   ```

3. With the server running, open `http://localhost:3000/` (or your server's
   address) in any browser. Every user visiting this URL shares the same
   session.

The current drinking session is shared across all users connecting to the same
server. Deploy the server on a reachable machine (for example a home server or
cloud host) and ensure the port is accessible so everyone can use the same
session. Sessions are automatically archived and cleared after 24 hours.
