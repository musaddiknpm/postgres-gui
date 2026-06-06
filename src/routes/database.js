const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

function createDatabaseRoutes({ queryExecutor, backupRestore, backupsDir, uploadsDir }) {
    const router = express.Router();
    const upload = multer({ dest: uploadsDir });

    const getSnapshotPath = () => path.join(backupsDir, 'last_snapshot.sql');
    const sanitizeTableName = (table) => table ? table.replace(/[^a-zA-Z0-9_.]/g, '') : null;

    const isTest = process.env.NODE_ENV === 'test';
    const queryLimiter = rateLimit({
        windowMs: 60 * 1000, 
        max: isTest ? 1000 : 60,
        message: { error: 'Too many queries from this IP, please try again after a minute' }
    });

    const backupLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, 
        max: isTest ? 100 : 10,
        message: { error: 'Too many backup/restore operations, please try again later' }
    });

    router.get('/tables', async (req, res) => {
        try {
            const tables = await queryExecutor.listTables();
            res.json({ tables });
        } catch (err) {
            console.error('List tables error:', err.message);
            res.status(500).json({ error: 'Internal server error while fetching tables.' });
        }
    });

    router.post('/query', queryLimiter, async (req, res) => {
        const { sql, safeMode, targetTable } = req.body;
        if (!sql) return res.status(400).json({ error: 'SQL query is required' });

        if (req.user && req.user.role === 'readonly') {
            if (/(^\s*|;\s*)(commit|rollback|begin|start|abort|set|end)\b|\bset_config\b/i.test(sql)) {
                return res.status(403).json({ error: 'Read-only role cannot execute transaction control or configuration modification statements.' });
            }
        }

        const snapshotPath = getSnapshotPath();

        try {
            let createdSnapshot = false;
            if (safeMode && /(?:update|delete|insert|alter|drop|truncate)/i.test(sql)) {
                if (!targetTable) {
                    return res.status(400).json({ error: 'Safe Mode requires a table to be selected in the sidebar.' });
                }
                await backupRestore.backup(snapshotPath, { tableName: targetTable });
                createdSnapshot = true;
            }

            const result = await queryExecutor.query(sql, req.user && req.user.role === 'readonly');
            res.json({ ...result, createdSnapshot });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    });

    router.post('/backups/revert', backupLimiter, async (req, res) => {
        if (req.user && req.user.role === 'readonly') return res.status(403).json({ error: 'Forbidden' });
        const snapshotPath = getSnapshotPath();
        try {
            if (fs.existsSync(snapshotPath)) {
                await backupRestore.restore(snapshotPath);
                fs.unlinkSync(snapshotPath);
                res.json({ success: true, message: 'Database state reverted successfully.' });
            } else {
                res.status(400).json({ error: 'No snapshot available to revert.' });
            }
        } catch (err) {
            console.error('Revert error:', err.message);
            res.status(500).json({ error: 'Internal server error while reverting.' });
        }
    });

    router.post('/backups/clear', (req, res) => {
        if (req.user && req.user.role === 'readonly') return res.status(403).json({ error: 'Forbidden' });
        const snapshotPath = getSnapshotPath();
        if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
        res.json({ success: true });
    });

    router.post('/backup', backupLimiter, async (req, res) => {
        if (req.user && req.user.role === 'readonly') return res.status(403).json({ error: 'Forbidden' });
        const { table, format } = req.body;
        const safeTable = sanitizeTableName(table);
        const isDump = format === 'dump';
        const ext = isDump ? '.dump' : '.sql';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = safeTable ? `backup_${safeTable}_${timestamp}${ext}` : `backup_full_${timestamp}${ext}`;
        const filepath = path.join(backupsDir, filename);

        try {
            await backupRestore.backup(filepath, { tableName: safeTable, isCustomFormat: isDump });
            res.download(filepath, filename, (err) => {
                if (err) console.error('Download error:', err);
                fs.unlink(filepath, () => {});
            });
        } catch (err) {
            console.error('Backup error:', err.message);
            res.status(500).json({ error: 'Internal server error during backup.' });
        }
    });

    let isRestoring = false;

    router.post('/restore', backupLimiter, upload.single('file'), async (req, res) => {
        if (req.user && req.user.role === 'readonly') return res.status(403).json({ error: 'Forbidden' });
        if (isRestoring) return res.status(409).json({ error: 'A restore is already in progress. Please wait.' });
        
        if (!req.file) return res.status(400).json({ error: 'No backup file uploaded' });
        const filenameStr = (req.file.originalname || '').toLowerCase();
        if (!filenameStr.endsWith('.sql') && !filenameStr.endsWith('.dump')) {
            fs.unlink(req.file.path, () => {});
            return res.status(400).json({ error: 'Invalid file type. Only .sql and .dump are allowed.' });
        }
        const filepath = req.file.path;
        const isCustomFormat = filenameStr.endsWith('.dump');

        isRestoring = true;
        try {
            await backupRestore.restore(filepath, isCustomFormat);
            fs.unlink(filepath, () => {});
            res.json({ success: true, message: 'Restore completed successfully' });
        } catch (err) {
            fs.unlink(filepath, () => {});
            console.error('Restore error:', err.message);
            res.status(500).json({ error: 'Internal server error during restore.' });
        } finally {
            isRestoring = false;
        }
    });

    return router;
}

module.exports = createDatabaseRoutes;
