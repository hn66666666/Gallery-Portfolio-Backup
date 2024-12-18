document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');

    function setTheme(theme) {
        const body = document.body;
        if (!themeToggle) return;

        if (theme === 'dark') {
            body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    // Theme toggle button click handler
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark');
            setTheme(isDark ? 'light' : 'dark');
        });
    }

    // Add footer dynamically
    const footer = document.createElement('footer');
    footer.innerHTML = '<p>© 2024 Power | <a href="https://wiki-power.com" target="_blank">Power\'s Wiki</a></p>';
    document.body.appendChild(footer);

    // Add loaded class to images after window load to enable hover effect
    window.addEventListener('load', () => {
        const images = document.querySelectorAll('.gallery img');
        images.forEach(img => {
            img.classList.add('loaded');
        });
    });
});
