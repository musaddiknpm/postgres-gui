import { executeQuery, revertBackup } from './api-client.js';
import { showToast, escapeHTML } from './app.js';

let currentScrollHandler = null;

function renderResults(resultsWrapper, data) {
    if (currentScrollHandler) {
        resultsWrapper.removeEventListener('scroll', currentScrollHandler);
        currentScrollHandler = null;
    }

    if (!data.fields || data.fields.length === 0) {
        resultsWrapper.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 3rem;">Query executed successfully.</div>`;
        return;
    }

    const ROW_HEIGHT = 32; 
    const VISIBLE_ROWS = 40; 
    const OVERSCROLL_ROWS = 20; 

    resultsWrapper.innerHTML = '';
    

    const totalHeight = data.rows.length * ROW_HEIGHT;
    const scrollSpacer = document.createElement('div');
    scrollSpacer.style.height = `${totalHeight + ROW_HEIGHT}px`; 
    scrollSpacer.style.position = 'relative';
    scrollSpacer.style.minWidth = 'max-content';

    
    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.className = 'w-full';

    scrollSpacer.appendChild(viewport);
    resultsWrapper.appendChild(scrollSpacer);

    function drawChunk(scrollTop) {
        
        let startIdx = Math.floor(scrollTop / ROW_HEIGHT) - OVERSCROLL_ROWS;
        if (startIdx < 0) startIdx = 0;

        let endIdx = startIdx + VISIBLE_ROWS + (OVERSCROLL_ROWS * 2);
        if (endIdx > data.rows.length) endIdx = data.rows.length;

        
        viewport.style.transform = `translateY(${startIdx * ROW_HEIGHT}px)`;

        let html = '<table class="w-full text-sm text-left border-collapse" style="table-layout: fixed;">';
        
        
        html += '<thead class="bg-gray-100 dark:bg-[#2d2d2d] sticky top-0 z-10 shadow-sm text-gray-700 dark:text-gray-300"><tr>';
        data.fields.forEach(f => {
            html += `<th class="px-3 py-1.5 font-semibold border border-gray-200 dark:border-gray-700 whitespace-nowrap bg-gray-100 dark:bg-[#2d2d2d]" style="width: 200px;">${escapeHTML(f)}</th>`;
        });
        html += '</tr></thead><tbody class="text-gray-600 dark:text-gray-400">';

        
        for (let i = startIdx; i < endIdx; i++) {
            const row = data.rows[i];
            html += `<tr class="hover:bg-elephant-50 dark:hover:bg-[#2a2d2e] transition-colors" style="height: ${ROW_HEIGHT}px;">`;
            data.fields.forEach(f => {
                let val = row[f];
                if (val === null) val = '<span class="text-gray-400 dark:text-gray-600 italic">NULL</span>';
                else if (typeof val === 'object') val = escapeHTML(JSON.stringify(val));
                else val = escapeHTML(String(val));
                
                
                html += `<td class="px-3 py-1 border border-gray-200 dark:border-gray-800 whitespace-nowrap overflow-hidden text-ellipsis" style="max-width: 200px;">${val}</td>`;
            });
            html += '</tr>';
        }

        html += '</tbody></table>';
        viewport.innerHTML = window.DOMPurify ? DOMPurify.sanitize(html) : html;
    }

    drawChunk(0);

    let scrollTimeout;
    currentScrollHandler = () => {
        if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
        scrollTimeout = requestAnimationFrame(() => {
            drawChunk(resultsWrapper.scrollTop);
        });
    };

    resultsWrapper.addEventListener('scroll', currentScrollHandler);
}

export function init({ getCurrentTable }) {
    const sqlInput = document.getElementById('sql-input');
    const btnRunQuery = document.getElementById('btn-run-query');
    const resultsWrapper = document.getElementById('results-wrapper');
    const queryStatus = document.getElementById('query-status');
    const safeModeCheckbox = document.getElementById('safe-mode-checkbox');
    const btnRevertDb = document.getElementById('btn-revert-db');

    let currentFields = [];

    
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const editor = CodeMirror.fromTextArea(sqlInput, {
        mode: 'text/x-sql',
        theme: isDark ? 'material-darker' : 'neo',
        lineNumbers: false,
        lineWrapping: true,
        viewportMargin: Infinity
    });

    const savedQuery = localStorage.getItem('postgres_gui_saved_query');
    if (savedQuery) {
        editor.setValue(savedQuery);
    }

    
    setTimeout(() => {
        editor.refresh();
    }, 50);

    
    editor.on('change', () => {
        localStorage.setItem('postgres_gui_saved_query', editor.getValue());
    });

    const runQuery = async () => {
        const sql = editor.getValue().trim();
        if (!sql) return;

        btnRunQuery.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        btnRunQuery.disabled = true;
        queryStatus.innerText = '';
        btnRevertDb.classList.add('hidden'); 

        try {
            const safeMode = safeModeCheckbox ? safeModeCheckbox.checked : false;
            const targetTable = getCurrentTable ? getCurrentTable() : null;
            
            const data = await executeQuery(sql, safeMode, targetTable);
            currentFields = data.fields || [];
            queryStatus.innerText = `Success: ${data.rowCount ?? 0} rows affected.`;
            queryStatus.className = 'text-xs text-green-600 dark:text-green-400';
            renderResults(resultsWrapper, data);

            if (data.createdSnapshot) {
                btnRevertDb.classList.remove('hidden');
            }
        } catch (err) {
            queryStatus.innerText = '';
            

            if (currentScrollHandler) {
                resultsWrapper.removeEventListener('scroll', currentScrollHandler);
                currentScrollHandler = null;
            }
            
            
            resultsWrapper.innerHTML = `
                <div class="p-4">
                    <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded flex items-start gap-3 p-3 max-w-full overflow-hidden">
                        <i class="fas fa-exclamation-triangle text-red-500 mt-0.5"></i>
                        <div class="min-w-0">
                            <h3 class="text-red-800 dark:text-red-400 font-semibold text-sm mb-1">Query Error</h3>
                            <p class="text-red-600 dark:text-red-300 font-mono text-xs break-all whitespace-pre-wrap">${escapeHTML(err.message)}</p>
                        </div>
                    </div>
                </div>
            `;
        } finally {
            btnRunQuery.innerHTML = '<i class="fas fa-play"></i> Run Query';
            btnRunQuery.disabled = false;
        }
    };

    btnRunQuery.addEventListener('click', runQuery);

    const btnUndo = document.getElementById('btn-undo');
    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            editor.undo();
            const icon = btnUndo.querySelector('i');
            if (icon) {
                icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                icon.style.transform = 'rotate(-360deg)';
                setTimeout(() => {
                    icon.style.transition = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }, 300);
            }
        });
    }

    if (btnRevertDb) {
        btnRevertDb.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to revert the database to the state before your last query?')) return;
            btnRevertDb.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reverting...';
            btnRevertDb.disabled = true;
            try {
                const res = await revertBackup();
                queryStatus.innerText = res.message;
                queryStatus.className = 'text-xs text-elephant-600 dark:text-elephant-400';
                btnRevertDb.classList.add('hidden');
                
                editor.setValue(`SELECT * FROM ${getCurrentTable()} LIMIT 100;`);
                runQuery();
            } catch (err) {
                showToast('Revert Failed', err.message, 'error');
            } finally {
                btnRevertDb.innerHTML = '<i class="fas fa-history"></i> Revert Database';
                btnRevertDb.disabled = false;
            }
        });
    }

    
    editor.setOption("extraKeys", {
        "Cmd-Enter": function(cm) { runQuery(); },
        "Ctrl-Enter": function(cm) { runQuery(); }
    });

    return {
        setQuery(sql) { editor.setValue(sql); },
        runQuery,
        getFields() { return currentFields; },
        refresh() {
            
            setTimeout(() => editor.refresh(), 10);
        }
    };
}
