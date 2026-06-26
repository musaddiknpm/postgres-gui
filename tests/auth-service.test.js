import { describe, it, expect } from 'vitest';
import AuthService from '../src/auth/AuthService.js';

const validConfig = {
    jwtSecret: 'test-secret',
    adminPassword: 'scrypt:1861bcf3c00e2e15f94281bc1973b3b3:bf2ab0e72a532bf88c2adc75cb60c6f50ea730e7c60a9c7c46d533a31f9833ab5955df65af707db99f206a70f5179704470a5dff2e292d64c42d37c0fb52e487', 
};

describe('AuthService', () => {
    describe('constructor', () => {
        it('throws when jwtSecret is missing', () => {
            expect(() => new AuthService({ adminPassword: 'pw' }))
                .toThrow('JWT secret is required');
        });

        it('throws when adminPassword is missing', () => {
            expect(() => new AuthService({ jwtSecret: 'secret' }))
                .toThrow('Admin password hash is required');
        });

        it('creates an instance with valid config', () => {
            const auth = new AuthService(validConfig);
            expect(auth).toBeDefined();
        });
    });

    describe('login', () => {
        const auth = new AuthService(validConfig);

        it('returns a JWT token with correct password', async () => {
            const token = await auth.login('correct-password');
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); 
        });

        it('throws with wrong password', async () => {
            await expect(auth.login('wrong-password'))
                .rejects.toThrow('Invalid password');
        });

        it('throws with empty password', async () => {
            await expect(auth.login(''))
                .rejects.toThrow('Invalid password');
        });
    });

    describe('verify', () => {
        const auth = new AuthService(validConfig);

        it('returns decoded payload for a valid token', async () => {
            const token = await auth.login('correct-password');
            const payload = auth.verify(token);
            expect(payload.role).toBe('admin');
        });

        it('throws for an invalid token', () => {
            expect(() => auth.verify('not-a-real-token'))
                .toThrow('Invalid or expired token');
        });

        it('throws for a missing token', () => {
            expect(() => auth.verify(null))
                .toThrow('Token is missing');
        });

        it('throws for a token signed with a different secret', async () => {
            const otherAuth = new AuthService({
                jwtSecret: 'different-secret',
                adminPassword: 'scrypt:1861bcf3c00e2e15f94281bc1973b3b3:bf2ab0e72a532bf88c2adc75cb60c6f50ea730e7c60a9c7c46d533a31f9833ab5955df65af707db99f206a70f5179704470a5dff2e292d64c42d37c0fb52e487',
            });
            const token = await otherAuth.login('correct-password');
            expect(() => auth.verify(token))
                .toThrow('Invalid or expired token');
        });
    });
});
