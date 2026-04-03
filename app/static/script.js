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

    function formatDuration(seconds) {
        if (!seconds) return 'Duração N/A';
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

        // UI Loading state
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
                throw new Error(data.detail || 'Ocorreu um erro ao buscar o vídeo.');
            }

            if (!data.url) {
                 throw new Error('Não foi possível extrair um link de download direto para este vídeo.');
            }

            // Update UI with data
            vidThumb.src = data.thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 112" preserveAspectRatio="none"><rect width="200" height="112" fill="%23222"/><text x="100" y="56" fill="%23888" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">Sem Imagem</text></svg>';
            vidTitle.textContent = data.title;
            vidDuration.textContent = formatDuration(data.duration);
            vidSource.textContent = (data.extractor || 'Web').toUpperCase();
            
            // Mapeia os arrays de extractors devolvidos pelo yt-dlp para os nossos prefixos curtos
            const prefixMap = {
                'facebook': 'fb-',
                'youtube': 'yt-',
                'instagram': 'ig-',
                'tiktok': 'tk-',
                'twitter': 'tw-',
                'vimeo': 'vm-'
            };
            const engineName = (data.extractor || '').toLowerCase();
            // Se o motor estiver no nosso mapa, ele usa o prefixo (ex: 'fb-'). Se não estiver, não usa nada ('').
            const prefix = prefixMap[engineName] || '';

            // Usa o ID retornado pela API
            let videoId = data.id;
            
            // Se a API não achar o ID (caso do link curto do Facebook), tenta raspar manualmente da URL
            if (!videoId || videoId === 'video' || videoId.length < 3) {
                const origUrl = urlInput.value.trim();
                try {
                    const parsedUrl = new URL(origUrl);
                    videoId = parsedUrl.searchParams.get('v') || parsedUrl.searchParams.get('id');
                    
                    if (!videoId) {
                        const paths = parsedUrl.pathname.split('/').filter(p => p.length > 0);
                        if (paths.length > 0) {
                            videoId = paths[paths.length - 1]; // Pega o último trecho (ex: 18XgH4PUh9)
                        }
                    }
                } catch(e) {}
                
                // Fallback extremo
                if (!videoId || videoId.length < 3) {
                    videoId = Math.random().toString(36).substring(2, 10);
                }
            }

            const customTitle = `xdownloader_${prefix}${videoId}`;
            
            // Gera os botões de acordo com os formatos disponíveis
            optionsContainer.innerHTML = ''; // Limpar antigos
            
            const createBtn = (url, label) => {
                const btn = document.createElement('a');
                btn.className = 'download-btn';
                btn.textContent = `Baixar ${label}`;
                
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
                // Caso não retorne lista de formatos (o que pode acontecer em alguns sites), usa a URL raiz
                optionsContainer.appendChild(createBtn(data.url, '(Qualidade Padrão)'));
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
