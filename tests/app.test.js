import { describe, it, expect } from 'vitest';
import request from 'supertest';
import createApp from '../src/app.js';



const app = createApp();

describe('POST /api/login', () => {
    it('returns 200 and sets a token cookie with correct password', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    it('returns 401 with wrong password', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid password');
    });

    it('returns 401 with missing password', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({});

        expect(res.status).toBe(401);
    });

    it('sets auth_token cookie on success', async () => {
        const res = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });

        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.startsWith('auth_token='))).toBe(true);
    });
});

describe('POST /api/logout', () => {
    it('clears auth_token cookie', async () => {
        const res = await request(app)
            .post('/api/logout')
            .set('X-Requested-With', 'XMLHttpRequest');

        console.log("LOGIN ERR:", res.body.error); expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

describe('Authentication middleware', () => {
    it('returns 401 when no token is provided', async () => {
        const res = await request(app)
            .get('/api/tables');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 with an invalid Bearer token', async () => {
        const res = await request(app)
            .get('/api/tables')
            .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid or expired token');
    });

    it('passes through with a valid Bearer token (DB error expected)', async () => {
        
        const loginRes = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });

        const cookieStr = loginRes.headers['set-cookie'].find(c => c.startsWith('auth_token='));
        const token = cookieStr.split(';')[0].split('=')[1];

        
        const res = await request(app)
            .get('/api/tables')
            .set('Authorization', `Bearer ${token}`);

        
        
        expect(res.status).not.toBe(401);
    });

    it('passes through with a valid cookie', async () => {
        const loginRes = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });

        const cookies = loginRes.headers['set-cookie'];

        const res = await request(app)
            .get('/api/tables')
            .set('Cookie', cookies);

        expect(res.status).not.toBe(401);
    });
});

describe('POST /api/query', () => {
    let token;

    it('returns 400 when SQL is missing', async () => {
        const loginRes = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });
        
        const cookieStr = loginRes.headers['set-cookie'].find(c => c.startsWith('auth_token='));
        token = cookieStr.split(';')[0].split('=')[1];

        const res = await request(app)
            .post('/api/query')
            .set('X-Requested-With', 'XMLHttpRequest')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('SQL query is required');
    });
});

describe('GET /api/me', () => {
    it('returns the role for the authenticated user', async () => {
        const loginRes = await request(app)
            .post('/api/login')
            .set('X-Requested-With', 'XMLHttpRequest')
            .send({ password: 'test-admin-password' });
        
        const cookies = loginRes.headers['set-cookie'];

        const res = await request(app)
            .get('/api/me')
            .set('Cookie', cookies);

        expect(res.status).toBe(200);
        expect(res.body.role).toBe('admin');
    });
});

describe('Error handling', () => {
    it('returns JSON for 404 routes', async () => {
        const res = await request(app)
            .get('/api/nonexistent');

        
        
        expect([401, 404]).toContain(res.status);
    });
});
