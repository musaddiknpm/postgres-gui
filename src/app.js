const express = require('express');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const AuthService = require('./auth/AuthService');
const QueryExecutor = require('./db/QueryExecutor');
const BackupRestore = require('./db/BackupRestore');
const createAuthMiddleware = require('./middleware/authenticate');
const createAuthRoutes = require('./routes/auth');
const createDatabaseRoutes = require('./routes/database');
const errorHandler = require('./middleware/errorHandler');

function createApp() {
    const app = express();

    if (config.trustProxy) {
        app.set('trust proxy', 1);
    }    
    app.use((req, res, next) => {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src https://fonts.gstatic.com https://cdnjs.cloudflare.com; connect-src 'self'; frame-ancestors 'none';");
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-DNS-Prefetch-Control', 'off');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
        res.setHeader('X-Download-Options', 'noopen');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '0');
        res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
        next();
    }); 
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, '..', 'public')));

    
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const backupsDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

    
    const authService = new AuthService(config.auth);
    const queryExecutor = new QueryExecutor(config.database);
    const backupRestore = new BackupRestore(config.database);
    const authenticate = createAuthMiddleware(authService);

    
    app.use('/api', (req, res, next) => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
                return res.status(403).json({ error: 'CSRF validation failed. Missing X-Requested-With header.' });
            }
        }
        next();
    });

    
    app.use('/api', createAuthRoutes(authService));
    app.get('/api/me', authenticate, (req, res) => res.json({ role: req.user.role }));
    app.use('/api', authenticate, createDatabaseRoutes({
        queryExecutor,
        backupRestore,
        backupsDir,
        uploadsDir,
    }));

    
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });

    
    app.use(errorHandler);

    return app;
}

module.exports = createApp;
