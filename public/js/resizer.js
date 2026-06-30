export function initResizers() {
    const sidebar = document.getElementById('explorer-sidebar');
    const sidebarResizer = document.getElementById('sidebar-resizer');
    const resultsPane = document.getElementById('results-pane');
    const verticalResizer = document.getElementById('vertical-resizer');
    
    
    const refreshEditor = () => {
        if (typeof window.queryEditor !== 'undefined') window.queryEditor.refresh();
    };

    if (resultsPane && verticalResizer) {
        let isResizing = false;
        
        verticalResizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'row-resize';
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const containerBottom = resultsPane.parentElement.getBoundingClientRect().bottom;
            const newHeight = containerBottom - e.clientY;
            
            
            if (newHeight > 35 && newHeight < window.innerHeight * 0.8) {
                resultsPane.style.height = `${newHeight}px`;
                resultsPane.classList.remove('h-1/2'); 
            }
        });

        window.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                refreshEditor();
            }
        });


        verticalResizer.addEventListener('touchstart', (e) => {
            isResizing = true;
            document.body.style.cursor = 'row-resize';
        }, {passive: true});

        window.addEventListener('touchmove', (e) => {
            if (!isResizing) return;
            const touch = e.touches[0];
            const containerBottom = resultsPane.parentElement.getBoundingClientRect().bottom;
            const newHeight = containerBottom - touch.clientY;
            if (newHeight > 35 && newHeight < window.innerHeight * 0.8) {
                resultsPane.style.height = `${newHeight}px`;
                resultsPane.classList.remove('h-1/2');
            }
        }, {passive: true});

        window.addEventListener('touchend', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                refreshEditor();
            }
        });
    }
}
