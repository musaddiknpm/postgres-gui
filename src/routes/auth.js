const express = require('express');
const rateLimit = require('express-rate-limit');

const isTest = process.env.NODE_ENV === 'test';
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: isTest ? 100 : 5, 
    skipSuccessfulRequests: true, 
    message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

function createAuthRoutes(authService) {
    const router = express.Router();

    router.post('/login', loginLimiter, async (req, res) => {
        try {
            const token = await authService.login(req.body.password);
            const isProd = process.env.NODE_ENV === 'production';
            res.cookie('auth_token', token, { httpOnly: true, secure: isProd, sameSite: 'strict' });
            return res.json({ success: true });
        } catch (err) {
            return res.status(401).json({ error: err.message });
        }
    });

    router.post('/logout', (req, res) => {
        res.clearCookie('auth_token');
        return res.json({ success: true });
    });

    return router;
}

module.exports = createAuthRoutes;
