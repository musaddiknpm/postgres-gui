import { fetchTables } from './api-client.js';
import { escapeHTML } from './app.js';

export function init({ onTableSelected }) {
    const tablesList = document.getElementById('tables-list');
    const tableActions = document.getElementById('table-actions');
    const currentTableLabel = document.getElementById('current-table-label');
    let currentTable = null;

    let allTables = [];

    function renderTables(tables) {
        const grid = document.getElementById('dashboard-tables-grid');
        grid.innerHTML = '';
        if (tables.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#252526] rounded-xl border border-gray-200 dark:border-gray-800">
                    <i class="fas fa-database text-4xl mb-4 text-gray-300 dark:text-gray-600"></i>
                    <p class="text-lg font-medium text-gray-900 dark:text-white">No tables found</p>
                    <p class="text-sm mt-1">This database is empty</p>
                </div>
            `;
            return;
        }
        tables.forEach(table => {
            const card = document.createElement('div');
            card.className = "bg-white dark:bg-[#252526] border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md transition-all hover:border-elephant-400 dark:hover:border-elephant-500 group flex flex-col";
            card.innerHTML = `
                <div class="flex items-center gap-3 mb-5">
                    <div class="w-10 h-10 rounded-lg bg-elephant-50 dark:bg-elephant-900/30 flex items-center justify-center text-elephant-600 dark:text-elephant-400 group-hover:scale-110 transition-transform shrink-0">
                        <i class="fas fa-table"></i>
                    </div>
                    <h3 class="font-semibold text-gray-900 dark:text-white truncate flex-1 text-lg" title="${escapeHTML(table)}">${escapeHTML(table)}</h3>
                </div>
                <div class="flex items-center gap-2 mt-auto">
                    <button class="btn-view-data flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#333] dark:hover:bg-[#444] text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-95">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-run-query flex-1 px-3 py-2 bg-elephant-600 hover:bg-elephant-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-95">
                        <i class="fas fa-terminal"></i> Query
                    </button>
                </div>
            `;
            
            card.querySelector('.btn-view-data').addEventListener('click', () => {
                currentTable = table;
                currentTableLabel.innerText = table;
                tableActions.classList.remove('hidden');
                tableActions.classList.add('flex');
                if (onTableSelected) onTableSelected(table, 'view');
            });

            card.querySelector('.btn-run-query').addEventListener('click', () => {
                currentTable = table;
                currentTableLabel.innerText = table;
                tableActions.classList.remove('hidden');
                tableActions.classList.add('flex');
                if (onTableSelected) onTableSelected(table, 'query');
            });

            grid.appendChild(card);
        });
    }

    const btnRefresh = document.getElementById('btn-refresh-tables');

    async function handleLoadTables() {
        if (btnRefresh) btnRefresh.classList.add('fa-spin');
        const tables = await fetchTables();
        if (btnRefresh) btnRefresh.classList.remove('fa-spin');
        
        if (tables) {
            allTables = tables;
            renderTables(tables);
            return true;
        }
        return false;
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', handleLoadTables);
    }

    return {
                async loadTables() {
            return await handleLoadTables();
        },

        getCurrentTable() {
            return currentTable;
        },

        getAllTables() {
            return allTables;
        }
    };
}
