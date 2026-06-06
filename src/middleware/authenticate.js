function createAuthMiddleware(authService) {
    return (req, res, next) => {
        let token = req.cookies.auth_token;

        
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return res.status(401).json({ error: 'Unauthorized' });

        try {
            req.user = authService.verify(token);
            next();
        } catch (err) {
            return res.status(401).json({ error: err.message });
        }
    };
}

module.exports = createAuthMiddleware;
