window.addEventListener('load', function () {
    // Only fire once per browser tab session
    if (!sessionStorage.getItem('canary_sent')) {
        // This is the BASE64 of the HTTPS version of your URL
        const key =
            'aHR0cHM6Ly9jYW5hcnl0b2tlbnMuY29tL2FydGljbGVzL3N0dWZmL2szMjJudWxpYWZrN2FmOXViczg2dm5mcWEvaW5kZXguaHRtbA==';

        fetch(atob(key), {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-store'
        })
            .then(() => {
                sessionStorage.setItem('canary_sent', 'true');
            })
            .catch(() => {
                // Fails silently if blocked by AdBlock or Network errors
            });
    }
});
