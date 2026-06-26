const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
    constructor(config) {
        if (!config.jwtSecret) throw new Error('JWT secret is required for AuthService');
        if (!config.adminPassword) throw new Error('Admin password hash is required for AuthService');

        this.secret = config.jwtSecret;
        this.adminPasswordHash = config.adminPassword;
        this.readonlyPasswordHash = config.readonlyPassword || null;
    }

    async login(password) {
        const check = (pass, hashStr) => {
            if (!hashStr || !hashStr.startsWith('scrypt:')) return false;
            const [, salt, key] = hashStr.split(':');
            const derivedKey = crypto.scryptSync(pass, salt, 64);
            const keyBuffer = Buffer.from(key, 'hex');
            if (derivedKey.length !== keyBuffer.length) return false;
            return crypto.timingSafeEqual(keyBuffer, derivedKey);
        };

        if (check(password, this.adminPasswordHash)) {
            
            return jwt.sign({ role: 'admin' }, this.secret, { expiresIn: '24h' });
        }

        if (this.readonlyPasswordHash && check(password, this.readonlyPasswordHash)) {
            return jwt.sign({ role: 'readonly' }, this.secret, { expiresIn: '24h' });
        }

        throw new Error('Invalid password');
    }

    verify(token) {
        if (!token) throw new Error('Token is missing');
        
        try {
            return jwt.verify(token, this.secret);
        } catch (err) {
            throw new Error('Invalid or expired token');
        }
    }
}

module.exports = AuthService;
