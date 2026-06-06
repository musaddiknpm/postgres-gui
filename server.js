const config = require('./src/config');
const createApp = require('./src/app');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = createApp();

if (config.sslKeyPath && config.sslCertPath) {
    try {
        const privateKey = fs.readFileSync(config.sslKeyPath, 'utf8');
        const certificate = fs.readFileSync(config.sslCertPath, 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(config.port, config.appHost, () => {
            console.log(`PostgreSQL GUI running securely on https://${config.appHost}:${config.port}`);
        });
    } catch (err) {
        console.error("Failed to start HTTPS server. Check your SSL paths.", err.message);
        process.exit(1);
    }
} else {
    app.listen(config.port, config.appHost, () => {
        console.log(`PostgreSQL GUI running on http://${config.appHost}:${config.port}`);
    });
}
