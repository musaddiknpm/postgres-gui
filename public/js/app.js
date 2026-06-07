import { login, logout, getRole } from './api-client.js';
import { init as initQueryEditor } from './query-editor.js';
import { init as initTableBrowser } from './table-browser.js';
import { init as initBackupRestore } from './backup-restore.js';
import { initResizers } from './resizer.js';


if (window.top !== window.self) {
    window.top.location = window.self.location;
}

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
    }[tag] || tag));
}
export function showToast(title, message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const isError = type === 'error';
    toast.className = `p-4 rounded-lg shadow-xl border flex flex-col gap-1 w-80 transform transition-all duration-300 translate-y-10 opacity-0 pointer-events-auto ${
        isError 
        ? 'bg-white dark:bg-[#252526] border-red-500 dark:border-red-500/50' 
        : 'bg-white dark:bg-[#252526] border-elephant-500 dark:border-elephant-500/50'
    }`;
    
    const icon = isError ? '<i class="fas fa-exclamation-circle text-red-500"></i>' : '<i class="fas fa-check-circle text-green-500"></i>';
    
    toast.innerHTML = `
        <div class="flex items-center gap-2 font-semibold text-sm ${isError ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}">
            ${icon} <span class="toast-title"></span>
        </div>
        <div class="toast-message text-xs text-gray-600 dark:text-gray-400 break-words"></div>
    `;
    toast.querySelector('.toast-title').textContent = title;
    toast.querySelector('.toast-message').textContent = message;
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-95');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');


const btnExplorer = document.getElementById('btn-explorer');
const btnGuide = document.getElementById('btn-guide');
const mainWorkspace = document.getElementById('main-workspace');
const guideWorkspace = document.getElementById('guide-workspace');
const explorerSidebar = document.getElementById('explorer-sidebar');
const resultsPane = document.getElementById('results-pane');
const btnMinimizeOutput = document.getElementById('btn-minimize-output');

let currentWorkspace = 'explorer';

function activateWorkspace(workspace) {
    if (workspace === 'explorer') {
        if (currentWorkspace === 'explorer' && !guideWorkspace.classList.contains('flex')) {

            if (explorerSidebar.classList.contains('hidden')) {
                explorerSidebar.classList.remove('hidden');
                explorerSidebar.classList.add('flex');
            } else {
                explorerSidebar.classList.add('hidden');
                explorerSidebar.classList.remove('flex');
            }
        } else {
            mainWorkspace.classList.remove('hidden');
            mainWorkspace.classList.add('flex');
            guideWorkspace.classList.add('hidden');
            guideWorkspace.classList.remove('flex');
            explorerSidebar.classList.remove('hidden');
            explorerSidebar.classList.add('flex');
            
            btnExplorer.classList.add('text-elephant-600', 'dark:text-elephant-500');
            btnExplorer.classList.remove('text-gray-500', 'dark:text-gray-500');
            btnGuide.classList.add('text-gray-500', 'dark:text-gray-500');
            btnGuide.classList.remove('text-elephant-600', 'dark:text-elephant-500');
        }
        currentWorkspace = 'explorer';
        

        if (typeof window.queryEditor !== 'undefined') window.queryEditor.refresh();
        
    } else {
        mainWorkspace.classList.add('hidden');
        mainWorkspace.classList.remove('flex');
        guideWorkspace.classList.remove('hidden');
        guideWorkspace.classList.add('flex');
        explorerSidebar.classList.add('hidden');
        explorerSidebar.classList.remove('flex');
        
        btnExplorer.classList.remove('text-elephant-600', 'dark:text-elephant-500');
        btnExplorer.classList.add('text-gray-500', 'dark:text-gray-500');
        btnGuide.classList.remove('text-gray-500', 'dark:text-gray-500');
        btnGuide.classList.add('text-elephant-600', 'dark:text-elephant-500');
        
        currentWorkspace = 'guide';
    }
}

btnExplorer.addEventListener('click', () => activateWorkspace('explorer'));
btnGuide.addEventListener('click', () => activateWorkspace('guide'));

const btnMinimizeExplorer = document.getElementById('btn-minimize-explorer');
if (btnMinimizeExplorer && explorerSidebar) {
    let explorerMinimized = false;
    btnMinimizeExplorer.addEventListener('click', () => {
        if (!explorerMinimized) {
            explorerSidebar.classList.remove('h-64');
            explorerSidebar.style.height = '40px';
            btnMinimizeExplorer.classList.replace('fa-chevron-up', 'fa-chevron-down');
            explorerMinimized = true;
        } else {
            explorerSidebar.style.height = '';
            explorerSidebar.classList.add('h-64');
            btnMinimizeExplorer.classList.replace('fa-chevron-down', 'fa-chevron-up');
            explorerMinimized = false;
        }
        if (typeof window.queryEditor !== 'undefined') window.queryEditor.refresh();
    });
}


if (btnMinimizeOutput && resultsPane) {
    let outputMinimized = false;
    btnMinimizeOutput.addEventListener('click', () => {
        if (!outputMinimized) {
            resultsPane.style.height = '35px';
            resultsPane.classList.remove('h-1/2');
            btnMinimizeOutput.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-up');
            outputMinimized = true;
        } else {
            resultsPane.style.height = '50%';
            btnMinimizeOutput.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');
            outputMinimized = false;
        }
        if (typeof window.queryEditor !== 'undefined') window.queryEditor.refresh();
    });
}

const showLogin = () => {
    loginScreen.showModal();
    appScreen.classList.add('hidden');
};

const showApp = () => {
    loginScreen.close();
    appScreen.classList.remove('hidden');
    if (typeof queryEditor !== 'undefined') {
        setTimeout(() => queryEditor.refresh(), 10);
    }
};


const queryEditor = initQueryEditor({
    getCurrentTable: () => tableBrowser.getCurrentTable()
});


window.queryEditor = queryEditor;

const tableBrowser = initTableBrowser({
    onTableSelected(table) {
        queryEditor.setQuery(`SELECT * FROM ${table} LIMIT 100;`);
        queryEditor.runQuery();
    },
});

initBackupRestore({
    getCurrentTable: () => tableBrowser.getCurrentTable(),
    onRestoreComplete: () => checkAuth(),
});


initResizers();




async function checkAuth() {
    try {
        const authenticated = await tableBrowser.loadTables();
        if (authenticated) {
            showApp();
            const role = await getRole();
            const hideForReadonly = (id) => {
                const el = document.getElementById(id);
                if (el) {
                    if (role === 'readonly') {
                        el.classList.add('hidden');
                    } else {
                        el.classList.remove('hidden');
                    }
                }
            };
            hideForReadonly('btn-backup-db');
            hideForReadonly('btn-restore-db');
            hideForReadonly('btn-backup-table');
        } else {
            showLogin();
        }
    } catch (err) {
        console.error('Connection error', err);
        showToast('Initialization Error', err.stack || err.message, 'error');
    }
}


document.getElementById('login-btn').addEventListener('click', async () => {
    const passwordInput = document.getElementById('password-input');
    const errEl = document.getElementById('login-error');
    errEl.innerText = '';

    try {
        await login(passwordInput.value);
        passwordInput.value = '';
        checkAuth();
    } catch (err) {
        errEl.innerText = err.message;
    }
});

document.getElementById('password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('login-btn').click();
});


document.getElementById('btn-logout').addEventListener('click', async () => {
    try { await import('./api-client.js').then(m => m.clearBackups()); } catch(e){}
    localStorage.removeItem('postgres_gui_saved_query');
    await logout();
    showLogin();
});

window.addEventListener('beforeunload', () => {
    navigator.sendBeacon('/api/backups/clear');
});


checkAuth();
