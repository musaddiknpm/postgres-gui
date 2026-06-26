require('dotenv').config();
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

function autoHashPasswords() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) return;
    
    let envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    let changed = false;

    const hashIfPlain = (key) => {
        const value = process.env[key];
        if (value && !value.startsWith('$2a$') && !value.startsWith('$2b$') && !value.startsWith('$2y$')) {
            const hash = bcrypt.hashSync(value, 10);
            process.env[key] = hash;
            
            let found = false;
            for (let i = 0; i < envLines.length; i++) {
                if (envLines[i].match(new RegExp(`^\\s*${key}\\s*=`))) {
                    envLines[i] = `${key}=${hash}`;
                    found = true;
                    break;
                }
            }
            if (!found) {
                envLines.push(`${key}=${hash}`);
            }
            changed = true;
        }
    };

    hashIfPlain('ADMIN_PASSWORD');
    hashIfPlain('READONLY_PASSWORD');

    if (changed) {
        fs.writeFileSync(envPath, envLines.join('\n'), 'utf8');
        console.log('Security notice: Plain-text passwords in .env have been automatically hashed for your protection.');
    }
}
autoHashPasswords();


function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `Missing required environment variable: ${name}\n` +
            `Copy .env.example to .env and fill in the values.`
        );
    }
    return value;
}

function optional(name, fallback) {
    return process.env[name] || fallback;
}


const osUser = process.env.USER || os.userInfo().username;



let database;
if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL);
    database = {
        connectionString: process.env.DATABASE_URL,
        host: parsed.hostname || 'localhost',
        port: parseInt(parsed.port || '5432', 10),
        user: decodeURIComponent(parsed.username) || osUser,
        password: decodeURIComponent(parsed.password) || '',
        database: parsed.pathname.slice(1) || 'postgres',
    };
} else {
    database = {
        host: optional('PGHOST', '/var/run/postgresql'),
        port: parseInt(optional('PGPORT', '5432'), 10),
        user: optional('PGUSER', osUser),
        password: optional('PGPASSWORD', ''),
        database: optional('PGDATABASE', 'postgres'),
    };
}

const config = {
    port: parseInt(optional('PORT', '12000'), 10),
    appHost: optional('HOST', '127.0.0.1'),
    sslKeyPath: optional('SSL_KEY_PATH', ''),
    sslCertPath: optional('SSL_CERT_PATH', ''),
    trustProxy: optional('TRUST_PROXY', 'false') === 'true',

    auth: Object.freeze({
        jwtSecret: optional('JWT_SECRET', crypto.randomBytes(32).toString('hex')),
        adminPassword: required('ADMIN_PASSWORD'),
        readonlyPassword: optional('READONLY_PASSWORD', null),
    }),

    database: Object.freeze(database),
};

Object.freeze(config);

module.exports = config;
