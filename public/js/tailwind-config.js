tailwind.config = {
    darkMode: 'media',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                elephant: {
                    50: '#f0f5fa',
                    100: '#e1ecf4',
                    200: '#c8dbe9',
                    300: '#a2c2d9',
                    400: '#75a1c3',
                    500: '#336791',
                    600: '#2a5578',
                    700: '#224460',
                    800: '#1a3348',
                    900: '#15293a',
                    950: '#0b151d',
                }
            }
        }
    }
}

const updateCMTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.getElementById('cm-theme').href = isDark 
        ? 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/material-darker.min.css' 
        : 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.13/theme/neo.min.css';
    
    const cmElement = document.querySelector('.CodeMirror');
    if (cmElement && cmElement.CodeMirror) {
        cmElement.CodeMirror.setOption("theme", isDark ? "material-darker" : "neo");
    }
};
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateCMTheme);
updateCMTheme();
