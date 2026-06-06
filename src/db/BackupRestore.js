const { execFile } = require('child_process');
const util = require('util');
const execFilePromise = util.promisify(execFile);

class BackupRestore {
    constructor(config) {
        this.config = config;
    }

    #getEnv() {
        const env = { ...process.env };
        if (this.config.password) env.PGPASSWORD = this.config.password;
        return env;
    }

        async backup(targetFilePath, options = {}) {
        const formatFlag = options.isCustomFormat ? 'c' : 'p';
        const args = [
            '-U', this.config.user,
            '-h', this.config.host,
            '-p', String(this.config.port),
            '-d', this.config.database,
            '-F', formatFlag,
            '-c',
            '--if-exists',
            '-f', targetFilePath,
        ];

        if (options.tableName) {
            const safeTable = options.tableName.replace(/[^a-zA-Z0-9_.]/g, '');
            args.push('-t', safeTable);
        }

        try {
            await execFilePromise('pg_dump', args, { env: this.#getEnv() });
        } catch (error) {
            throw new Error(error.stderr || error.message);
        }
    }

        async restore(sourceFilePath, isCustomFormat = false) {
        const binary = isCustomFormat ? 'pg_restore' : 'psql';
        
        const args = [
            '-U', this.config.user,
            '-h', this.config.host,
            '-p', String(this.config.port),
            '-d', this.config.database,
        ];

        if (isCustomFormat) {
            args.push('--clean', '--if-exists', '-e', sourceFilePath);
        } else {
            args.push('-v', 'ON_ERROR_STOP=1', '-f', sourceFilePath);
        }

        try {
            await execFilePromise(binary, args, { env: this.#getEnv() });
        } catch (error) {
            throw new Error(error.stderr || error.message);
        }
    }
}

module.exports = BackupRestore;
