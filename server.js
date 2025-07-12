const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
app.use(express.json());
// Serve the frontend files so clients can load the app remotely
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
const PORT = process.env.PORT || 3000;

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_FILE = 'current_session.json';
const ARCHIVE_FILE = 'session_archive.json';

function loadSession() {
    if (!fs.existsSync(SESSION_FILE)) return createNewSession();
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    // Auto archive if older than 24h
    if (Date.now() - data.startTime >= DAY_MS) {
        archiveSession(data);
        return createNewSession();
    }
    return data;
}

function saveSession(session) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
}

function createNewSession() {
    const session = { startTime: Date.now(), users: {}, sets: [], log: [], achievements: [] };
    saveSession(session);
    return session;
}

function archiveSession(session) {
    let archive = [];
    if (fs.existsSync(ARCHIVE_FILE)) {
        archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    }
    archive.unshift(session);
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
    fs.unlinkSync(SESSION_FILE);
}

// Middleware to load session for each request
app.use((req, res, next) => {
    req.session = loadSession();
    next();
});

app.get('/session', (req, res) => {
    res.json(req.session);
});

app.post('/session', (req, res) => {
    const newData = req.body;
    newData.startTime = req.session.startTime; // preserve start time
    saveSession(newData);
    res.json({ status: 'ok' });
});

app.post('/reset', (req, res) => {
    const s = loadSession();
    archiveSession(s);
    const fresh = createNewSession();
    res.json(fresh);
});

app.get('/archive', (req, res) => {
    let archive = [];
    if (fs.existsSync(ARCHIVE_FILE)) {
        archive = JSON.parse(fs.readFileSync(ARCHIVE_FILE, 'utf8'));
    }
    res.json(archive);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
