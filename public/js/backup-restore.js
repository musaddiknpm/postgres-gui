import { backup, restore } from './api-client.js';
import { showToast } from './app.js';

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
}

export function init({ getCurrentTable, onRestoreComplete }) {
    const modal = document.getElementById('restore-modal');
    const backupModal = document.getElementById('backup-modal');
    const fileNameSpan = document.getElementById('restore-file-name');
    let currentBackupTable = null;

    function openBackupModal(table = null) {
        currentBackupTable = table;
        backupModal.classList.remove('hidden');
    }

    function closeBackupModal() {
        backupModal.classList.add('hidden');
        currentBackupTable = null;
    }

    document.getElementById('btn-backup-db').addEventListener('click', () => openBackupModal(null));
    document.getElementById('btn-backup-table').addEventListener('click', () => {
        const table = getCurrentTable();
        if (table) openBackupModal(table);
    });

    document.getElementById('cancel-backup').addEventListener('click', closeBackupModal);
    document.getElementById('close-backup-modal').addEventListener('click', closeBackupModal);

    document.getElementById('submit-backup').addEventListener('click', async () => {
        const format = document.querySelector('input[name="backup-format"]:checked').value;
        const btn = document.getElementById('submit-backup');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        try {
            const { blob, filename } = await backup(currentBackupTable, format);
            downloadBlob(blob, filename);
            closeBackupModal();
            showToast('Backup Successful', `Downloaded ${filename}`, 'success');
        } catch (err) {
            showToast('Backup Failed', err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    
    function resetRestoreModal() {
        modal.classList.add('hidden');
        document.getElementById('restore-file').value = '';
        if (fileNameSpan) {
            fileNameSpan.innerText = 'Click or drag file here (.sql or .dump)';
            fileNameSpan.classList.remove('text-elephant-600', 'font-medium');
        }
        const errEl = document.getElementById('restore-error');
        errEl.innerText = '';
        errEl.classList.add('hidden');

        const progressContainer = document.getElementById('restore-progress-container');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
            document.getElementById('restore-progress-bar').style.width = '0%';
            document.getElementById('restore-progress-percent').innerText = '0%';
            document.getElementById('restore-progress-text').innerText = 'Uploading & Restoring...';
        }
    }

    document.getElementById('btn-restore-db').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('close-modal').addEventListener('click', resetRestoreModal);
    document.getElementById('cancel-restore').addEventListener('click', resetRestoreModal);

    
    const fileInput = document.getElementById('restore-file');
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileNameSpan.innerText = fileInput.files[0].name;
            fileNameSpan.classList.add('text-elephant-600', 'font-medium');
            document.getElementById('restore-error').innerText = ''; 
        } else {
            fileNameSpan.innerText = 'Click or drag file here (.sql or .dump)';
            fileNameSpan.classList.remove('text-elephant-600', 'font-medium');
        }
    });

    document.getElementById('submit-restore').addEventListener('click', async () => {
        const btn = document.getElementById('submit-restore');
        if (btn.disabled) return;

        const fileInput = document.getElementById('restore-file');
        const errEl = document.getElementById('restore-error');

        const file = fileInput.files[0];
        if (!file) {
            errEl.innerText = 'Please select a file first.';
            errEl.classList.remove('hidden');
            return;
        }
        if (!file.name.match(/\.(sql|dump)$/i)) {
            errEl.innerText = 'Invalid file type. Please upload a .sql or .dump file.';
            errEl.classList.remove('hidden');
            return;
        }

        errEl.classList.add('hidden');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';
        btn.disabled = true;
        document.getElementById('cancel-restore').disabled = true;
        document.getElementById('close-modal').disabled = true;

        const progressContainer = document.getElementById('restore-progress-container');
        const progressBar = document.getElementById('restore-progress-bar');
        const progressPercent = document.getElementById('restore-progress-percent');
        const progressText = document.getElementById('restore-progress-text');

        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercent.innerText = '0%';
        progressText.innerText = 'Uploading & Restoring...';

        let progress = 0;
        const progressInterval = setInterval(() => {
            if (progress < 90) {
                progress += Math.random() * 15;
                if (progress > 90) progress = 90;
                progressBar.style.width = `${progress}%`;
                progressPercent.innerText = `${Math.floor(progress)}%`;
            }
        }, 300);

        try {
            await restore(fileInput.files[0]);
            
            clearInterval(progressInterval);
            progressBar.style.width = '100%';
            progressPercent.innerText = '100%';
            progressText.innerText = 'Restore Completed';

            btn.innerHTML = '<i class="fas fa-check"></i> Restore Successful!';
            btn.classList.remove('bg-elephant-600', 'hover:bg-elephant-700');
            btn.classList.add('bg-green-600', 'hover:bg-green-700');
            
            setTimeout(() => {
                resetRestoreModal();
                btn.innerHTML = 'Upload & Restore';
                btn.classList.add('bg-elephant-600', 'hover:bg-elephant-700');
                btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                btn.disabled = false;
                if (onRestoreComplete) onRestoreComplete();
            }, 1500);
            
        } catch (err) {
            clearInterval(progressInterval);
            
            progressBar.classList.remove('bg-elephant-600');
            progressBar.classList.add('bg-red-600');
            progressText.innerText = 'Restore Failed';
            
            errEl.innerText = err.message;
            errEl.classList.remove('hidden');

            btn.innerHTML = '<i class="fas fa-times"></i> Restore Failed!';
            btn.classList.remove('bg-elephant-600', 'hover:bg-elephant-700');
            btn.classList.add('bg-red-600', 'hover:bg-red-700');
            
            setTimeout(() => {
                btn.innerHTML = 'Upload & Restore';
                btn.classList.add('bg-elephant-600', 'hover:bg-elephant-700');
                btn.classList.remove('bg-red-600', 'hover:bg-red-700');
                btn.disabled = false;
                progressBar.classList.remove('bg-red-600');
                progressBar.classList.add('bg-elephant-600');
                progressContainer.classList.add('hidden');
            }, 2000);
        } finally {
            document.getElementById('cancel-restore').disabled = false;
            document.getElementById('close-modal').disabled = false;
        }
    });
}
