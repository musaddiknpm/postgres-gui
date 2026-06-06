import { describe, it, expect } from 'vitest';
import AuthService from '../src/auth/AuthService.js';

const validConfig = {
    jwtSecret: 'test-secret',
    adminPassword: '$2b$10$/EfmNSchUFfjvdyVAASc1ePgHGWva2N6RvFFoesCoOsvxtI8/n1TK', 
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
                adminPassword: '$2b$10$/EfmNSchUFfjvdyVAASc1ePgHGWva2N6RvFFoesCoOsvxtI8/n1TK',
            });
            const token = await otherAuth.login('correct-password');
            expect(() => auth.verify(token))
                .toThrow('Invalid or expired token');
        });
    });
});
