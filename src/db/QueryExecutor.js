const { Pool } = require('pg');

class QueryExecutor {
    constructor(config) {
        const poolConfig = config.connectionString
            ? { connectionString: config.connectionString }
            : { host: config.host, port: config.port, user: config.user, database: config.database };

        this.pool = new Pool(poolConfig);
    }

    async listTables() {
        const result = await this.pool.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
            ORDER BY table_schema, table_name;
        `);
        return result.rows.map(r => r.table_schema === 'public' ? r.table_name : `${r.table_schema}.${r.table_name}`);
    }

    async query(sql, isReadOnly = false) {
        if (!isReadOnly) {
            const result = await this.pool.query(sql);
            return this._formatResult(result);
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN READ ONLY');
            const result = await client.query(sql);
            await client.query('ROLLBACK');
            return this._formatResult(result);
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    _formatResult(result) {
        const res = Array.isArray(result) ? result[result.length - 1] : result;
        if (!res) return { command: '', rowCount: 0, fields: [], rows: [] };
        return {
            command: res.command,
            rowCount: res.rowCount,
            fields: res.fields ? res.fields.map(f => f.name) : [],
            rows: res.rows || []
        };
    }

    async close() {
        await this.pool.end();
    }
}

module.exports = QueryExecutor;
