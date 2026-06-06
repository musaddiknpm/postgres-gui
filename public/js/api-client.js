
const defaultHeaders = { 'X-Requested-With': 'XMLHttpRequest' };
async function customFetch(url, options = {}) {
    options.headers = { ...defaultHeaders, ...options.headers };
    return fetch(url, options);
}

export async function login(password) {
    const res = await customFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
}

export async function logout() {
    await customFetch('/api/logout', { method: 'POST' });
}

export async function fetchTables() {
    const res = await customFetch('/api/tables');
    if (res.status === 401) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.tables;
}

export async function executeQuery(sql, safeMode = false, targetTable = null) {
    const res = await customFetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, safeMode, targetTable }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export async function revertBackup() {
    const res = await customFetch('/api/backups/revert', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export async function clearBackups() {
    await customFetch('/api/backups/clear', { method: 'POST' });
}

export async function backup(table = null, format = 'sql') {
    const res = await customFetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, format }),
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
    }

    const blob = await res.blob();
    let filename = 'backup.sql';
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
    }
    return { blob, filename };
}

export async function restore(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await customFetch('/api/restore', {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
}

export async function getRole() {
    const res = await customFetch('/api/me');
    if (res.status === 401) return null;
    const data = await res.json();
    return data.role;
}
