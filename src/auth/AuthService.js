const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class AuthService {
    constructor(config) {
        if (!config.jwtSecret) throw new Error('JWT secret is required for AuthService');
        if (!config.adminPassword) throw new Error('Admin password hash is required for AuthService');

        this.secret = config.jwtSecret;
        this.adminPasswordHash = config.adminPassword;
        this.readonlyPasswordHash = config.readonlyPassword || null;
    }

    async login(password) {
        const isAdminMatch = await bcrypt.compare(password, this.adminPasswordHash);
        if (isAdminMatch) {
            
            return jwt.sign({ role: 'admin' }, this.secret, { expiresIn: '24h' });
        }

        if (this.readonlyPasswordHash) {
            const isReadonlyMatch = await bcrypt.compare(password, this.readonlyPasswordHash);
            if (isReadonlyMatch) {
                return jwt.sign({ role: 'readonly' }, this.secret, { expiresIn: '24h' });
            }
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
