document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('video-url');
    const fetchBtn = document.getElementById('fetch-btn');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    
    const resultCard = document.getElementById('result-card');
    const errorToast = document.getElementById('error-message');
    
    const vidThumb = document.getElementById('vid-thumb');
    const vidTitle = document.getElementById('vid-title');
    const vidDuration = document.getElementById('vid-duration');
    const vidSource = document.getElementById('vid-source');
    const optionsContainer = document.getElementById('vid-download-options');

    // i18n Global State
    let translations = {};
    let currentLang = 'pt-BR'; // Default fallback

    // UI Elements for Switcher
    const langSwitcher = document.getElementById('language-switcher');
    const langDropdown = document.getElementById('current-lang');
    const currentFlagImg = document.querySelector('#current-lang-flag img');
    const langOptionsList = document.getElementById('lang-options-list');

    async function initI18n() {
        try {
            const response = await fetch('lang.json');
            translations = await response.json();
            
            // 1. Determine starting language
            const savedLang = localStorage.getItem('vd-lang');
            const browserLang = navigator.language;
            
            if (savedLang && translations[savedLang]) {
                currentLang = savedLang;
            } else {
                // Try to match browser language (exact or prefix)
                const matched = Object.keys(translations).find(k => k === browserLang || k.startsWith(browserLang.split('-')[0]));
                if (matched) currentLang = matched;
            }

            // 2. Build the dropdown options dynamically
            renderLangOptions();

            // 3. Initial UI update
            updateUI();

        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback can be hardcoded here if critical, but we expect lang.json to exist.
        }
    }

    function renderLangOptions() {
        langOptionsList.innerHTML = ''; // Clear just in case
        
        Object.entries(translations).forEach(([key, langData]) => {
            const li = document.createElement('li');
            li.className = `lang-option ${key === currentLang ? 'active' : ''}`;
            li.dataset.lang = key;
            
            li.innerHTML = `
                <span class="lang-text">${langData.option}</span>
            `;
            
            li.addEventListener('click', () => {
                currentLang = key;
                updateUI();
                langSwitcher.classList.remove('open');
            });
            
            langOptionsList.appendChild(li);
        });
    }

    function updateUI() {
        const t = translations[currentLang];
        if (!t) return;
        
        // Update texts in the document
        document.querySelectorAll('[data-t]').forEach(el => {
            const key = el.getAttribute('data-t');
            if (t[key]) el.innerHTML = t[key];
        });

        // Update placeholders
        document.querySelectorAll('[data-t-placeholder]').forEach(el => {
            const key = el.getAttribute('data-t-placeholder');
            if (t[key]) el.placeholder = t[key];
        });

        // Update Dropdown Header Flag SRC
        if (currentFlagImg) {
            currentFlagImg.src = t.flagUrl;
            currentFlagImg.alt = currentLang;
        }

        // Update active class in options list
        const allOptions = langOptionsList.querySelectorAll('.lang-option');
        allOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.lang === currentLang);
        });
        
        localStorage.setItem('vd-lang', currentLang);
    }

    // Toggle Dropdown
    langDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        langSwitcher.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', () => {
        langSwitcher.classList.remove('open');
    });

    // Initialize
    initI18n();

    function formatDuration(seconds) {
        if (!seconds) return translations[currentLang]['duration-na'] || 'N/A';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        let formatted = '';
        if (h > 0) formatted += `${h}:`;
        formatted += `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return formatted;
    }

    async function fetchVideo() {
        const url = urlInput.value.trim();
        if (!url) return;

        fetchBtn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        resultCard.classList.add('hidden');
        errorToast.classList.add('hidden');

        try {
            const res = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await res.json();

            if (!res.ok) {
                const errorKey = res.status === 401 ? 'error-401' : (res.status === 403 ? 'error-403' : null);
                throw new Error(errorKey ? translations[currentLang][errorKey] : (data.detail || translations[currentLang]['error-fetch']));
            }

            if (!data.url) {
                 throw new Error(translations[currentLang]['error-no-url']);
            }

            const noImgMsg = translations[currentLang]['no-image'];
            vidThumb.src = data.thumbnail || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 112" preserveAspectRatio="none"><rect width="200" height="112" fill="%23222"/><text x="100" y="56" fill="%23888" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">${noImgMsg}</text></svg>`;
            vidTitle.textContent = data.title;
            vidDuration.textContent = formatDuration(data.duration);
            vidSource.textContent = (data.extractor || 'Web').toUpperCase();
            
            const engineName = (data.extractor || '').toLowerCase();
            const prefixMap = { 'facebook': 'fb-', 'youtube': 'yt-', 'instagram': 'ig-', 'tiktok': 'tk-', 'twitter': 'tw-', 'vimeo': 'vm-' };
            const prefix = prefixMap[engineName] || '';

            let videoId = data.id;
            if (!videoId || videoId === 'video' || videoId.length < 3) {
                try {
                    const parsedUrl = new URL(url);
                    videoId = parsedUrl.searchParams.get('v') || parsedUrl.searchParams.get('id');
                    if (!videoId) {
                        const paths = parsedUrl.pathname.split('/').filter(p => p.length > 0);
                        if (paths.length > 0) videoId = paths[paths.length - 1];
                    }
                } catch(e) {}
                if (!videoId || videoId.length < 3) videoId = Math.random().toString(36).substring(2, 10);
            }

            const customTitle = `xdownloader_${prefix}${videoId}`;
            optionsContainer.innerHTML = ''; 
            
            const createBtn = (url, label) => {
                const btn = document.createElement('a');
                btn.className = 'download-btn';
                btn.textContent = `${translations[currentLang]['download-label']} ${label}`;
                
                const encodedUrlParam = encodeURIComponent(url);
                const encodedTitleParam = encodeURIComponent(customTitle);
                btn.href = `/api/download?url=${encodedUrlParam}&title=${encodedTitleParam}`;
                return btn;
            };

            if (data.formats && data.formats.length > 0) {
                data.formats.forEach(f => {
                    optionsContainer.appendChild(createBtn(f.url, f.resolution));
                });
            } else {
                optionsContainer.appendChild(createBtn(data.url, translations[currentLang]['default-quality']));
            }

            resultCard.classList.remove('hidden');

        } catch (error) {
            errorToast.textContent = error.message;
            errorToast.classList.remove('hidden');
        } finally {
            fetchBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    }

    fetchBtn.addEventListener('click', fetchVideo);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') fetchVideo();
    });
});
