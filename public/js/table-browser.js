import { fetchTables } from './api-client.js';
import { escapeHTML } from './app.js';

export function init({ onTableSelected }) {
    const tablesList = document.getElementById('tables-list');
    const tableActions = document.getElementById('table-actions');
    const currentTableLabel = document.getElementById('current-table-label');
    let currentTable = null;

    let allTables = [];

    function renderTables(tables) {
        tablesList.innerHTML = '';
        if (tables.length === 0) {
            tablesList.innerHTML = `
                <li class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <i class="fas fa-database text-3xl mb-3 text-gray-300 dark:text-gray-600 opacity-50"></i>
                    <p class="text-sm font-medium">No tables found</p>
                    <p class="text-xs mt-1 opacity-75">This database is empty</p>
                </li>
            `;
            return;
        }
        tables.forEach(table => {
            const li = document.createElement('li');
            li.className = "group px-4 py-1.5 cursor-pointer text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300 transition-all border-l-2 border-transparent hover:bg-gray-100 dark:hover:bg-[#2a2d2e] hover:border-elephant-400 dark:hover:border-elephant-500";
            li.innerHTML = `<i class="fas fa-table text-elephant-500/60 dark:text-elephant-400/60 group-hover:text-elephant-600 dark:group-hover:text-elephant-400 transition-colors text-xs"></i> <span class="truncate">${escapeHTML(table)}</span>`;
            li.addEventListener('click', () => {
                document.querySelectorAll('#tables-list li').forEach(el => {
                    el.classList.remove('bg-gray-200', 'dark:bg-[#37373d]', 'text-black', 'dark:text-white', 'border-elephant-600', 'dark:border-elephant-500');
                    el.classList.add('border-transparent');
                });
                li.classList.remove('border-transparent');
                li.classList.add('bg-gray-200', 'dark:bg-[#37373d]', 'text-black', 'dark:text-white', 'border-elephant-600', 'dark:border-elephant-500');

                currentTable = table;
                tableActions.classList.remove('hidden');
                tableActions.classList.add('flex');
                currentTableLabel.innerText = table;

                if (onTableSelected) onTableSelected(table);
            });
            tablesList.appendChild(li);
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
