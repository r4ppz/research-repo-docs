document.addEventListener('DOMContentLoaded', function () {
    // This function adds target="_blank" to external links only
    function openExternalLinksInNewTab() {
        var links = document.querySelectorAll('a');
        links.forEach(function (link) {
            // Only set target="_blank" if the link is external
            if (link.hostname && link.hostname !== window.location.hostname) {
                if (!link.hasAttribute('target')) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener');
                }
            }
        });
    }

    // Run on initial load
    openExternalLinksInNewTab();

    // If using mkdocs-material's instant navigation, we need to run it on every page change
    if (typeof location$ !== 'undefined') {
        location$.subscribe(function () {
            setTimeout(openExternalLinksInNewTab, 100);
        });
    }
});
