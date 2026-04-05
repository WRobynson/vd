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

    // i18n Dictionary
    const translations = {
        pt: {
            flagUrl: "https://flagcdn.com/br.svg",
            subtitle: "Baixe vídeos do Facebook, Instagram, YouTube e mais.<br>sem anúncios e popups.",
            placeholder: "Cole o link do vídeo aqui...",
            "btn-start": "Começar",
            "duration-na": "Duração N/A",
            "no-image": "Sem Imagem",
            "download-label": "Baixar",
            "default-quality": "(Qualidade Padrão)",
            "error-fetch": "Ocorreu um erro ao buscar o vídeo.",
            "error-no-url": "Não foi possível extrair um link de download direto para este vídeo.",
            footer: "Criado para o ambiente XmatriX.<br>&copy; 2026 Robynson.COM",
            "error-401": "Este vídeo requer login. Cookies inválidos ou expirados.",
            "error-403": "Vídeo privado ou sem permissão de acesso."
        },
        en: {
            flagUrl: "https://flagcdn.com/us.svg",
            subtitle: "Download videos from Facebook, Instagram, YouTube and more.<br>without ads and popups.",
            placeholder: "Paste video link here...",
            "btn-start": "Start",
            "duration-na": "Duration N/A",
            "no-image": "No Image",
            "download-label": "Download",
            "default-quality": "(Default Quality)",
            "error-fetch": "An error occurred while fetching the video.",
            "error-no-url": "Could not extract a direct download link for this video.",
            footer: "Created for the XmatriX environment.<br>&copy; 2026 Robynson.COM",
            "error-401": "This video requires login. Invalid or expired cookies.",
            "error-403": "Private video or access denied."
        },
        es: {
            flagUrl: "https://flagcdn.com/es.svg",
            subtitle: "Descarga videos de Facebook, Instagram, YouTube y más.<br>sin anuncios y popups.",
            placeholder: "Pega el enlace del video aquí...",
            "btn-start": "Empezar",
            "duration-na": "Duración N/A",
            "no-image": "Sin Imagen",
            "download-label": "Descargar",
            "default-quality": "(Calidad Estándar)",
            "error-fetch": "Ocurrió un error al buscar el video.",
            "error-no-url": "No se pudo extraer un enlace de descarga directa para este video.",
            footer: "Creado para o ambiente XmatriX.<br>&copy; 2026 Robynson.COM",
            "error-401": "Este video requiere inicio de sesión. Cookies inválidas o vencidas.",
            "error-403": "Video privado o sin permiso de acceso."
        }
    };

    let currentLang = localStorage.getItem('vd-lang') || 
                      (navigator.language.startsWith('pt') ? 'pt' : 
                      (navigator.language.startsWith('es') ? 'es' : 'en'));

    // UI Elements for Switcher
    const langSwitcher = document.getElementById('language-switcher');
    const langDropdown = document.getElementById('current-lang');
    const currentFlagImg = document.querySelector('#current-lang-flag img');
    const langOptions = document.querySelectorAll('.lang-option');

    function updateUI() {
        const t = translations[currentLang];
        
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
            currentFlagImg.alt = currentLang.toUpperCase();
        }

        // Update active class in options
        langOptions.forEach(opt => {
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

    // Option Selection
    langOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            currentLang = opt.dataset.lang;
            updateUI();
            langSwitcher.classList.remove('open');
        });
    });

    // Initialize UI
    updateUI();

    function formatDuration(seconds) {
        if (!seconds) return translations[currentLang]['duration-na'];
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
