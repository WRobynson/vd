from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import yt_dlp
import os
import hashlib
import json
import time

app = FastAPI()

CACHE_DIR = "app/cache"
os.makedirs(CACHE_DIR, exist_ok=True)
CACHE_EXPIRY = 3600 # 1 hora de validade, pois links do YT/FB perdem a validade!

class URLRequest(BaseModel):
    url: str

@app.post("/api/info")
def get_video_info(request: URLRequest):
    # Verificação de Cache
    url_hash = hashlib.md5(request.url.encode('utf-8')).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{url_hash}.json")
    
    if os.path.exists(cache_path):
        if time.time() - os.path.getmtime(cache_path) < CACHE_EXPIRY:
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception:
                pass

    ydl_opts = {
        'format': 'best', 
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }
    
    # Suporte para baixar vídeos privados usando cookies do navegador
    cookie_path = 'app/cookies.txt'
    if os.path.exists(cookie_path) and os.path.getsize(cookie_path) > 200:
        ydl_opts['cookiefile'] = cookie_path
        ydl_opts['http_headers'] = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
            'Referer': 'https://www.facebook.com/',
        }
        
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(request.url, download=False)
            
            if 'entries' in info_dict:
                info_dict = info_dict['entries'][0]

            formats_list = []
            if 'formats' in info_dict:
                for f in info_dict['formats']:
                    vcodec = str(f.get('vcodec', '')).lower()
                    acodec = str(f.get('acodec', '')).lower()
                    ext = str(f.get('ext', '')).lower()
                    
                    # O yt-dlp define como 'none' explícito quando não há a trilha correspondente (vídeos DASH soltos)
                    is_video_only = (vcodec != 'none' and vcodec != '') and (acodec == 'none')
                    is_audio_only = (vcodec == 'none') and (acodec != 'none' and acodec != '')
                    
                    # Filtra arquivos que sejam apenas áudio ou apenas vídeo, mas aceita os indefinidos (Facebook sd/hd)
                    if not is_video_only and not is_audio_only and ext in ['mp4', 'webm']:
                        height = f.get('height') or 0
                        res = f.get('resolution') or f.get('format_id') or f.get('format') or 'Padrão'
                        
                        if 'audio' in str(res).lower():
                            continue
                        
                        # Transforma 'sd' e 'hd' para maiúsculas ('SD', 'HD')
                        res_str = str(res)
                        if res_str.lower() in ['sd', 'hd']:
                            res_str = res_str.upper()
                            
                        res_label = res_str
                        if f.get('format_note') and res_str.lower() not in str(f.get('format_note')).lower():
                            res_label += f" ({f.get('format_note')})"
                            
                        formats_list.append({
                            'url': f.get('url'),
                            'resolution': res_label.strip(),
                            'height': int(height)
                        })
                            
            # Filtra duplicados pela resolução, mantendo o mais recente da iteração
            unique_formats = {}
            for f in formats_list:
                unique_formats[f['resolution']] = f
                
            sorted_formats = sorted(list(unique_formats.values()), key=lambda x: x['height'], reverse=True)

            result = {
                "title": info_dict.get('title', 'Vídeo'),
                "id": info_dict.get('id', 'video'),
                "thumbnail": info_dict.get('thumbnail'),
                "duration": info_dict.get('duration'),
                "url": info_dict.get('url'),
                "extractor": info_dict.get('extractor'),
                "formats": sorted_formats
            }
            
            # Grava no cache
            try:
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False)
            except:
                pass

            return result
    except Exception as e:
        erro = str(e).lower()

        if "login required" in erro or "cookies" in erro or "not logged in" in erro:
            raise HTTPException(
                status_code=401,
                detail="Este vídeo requer login. Cookies inválidos ou expirados."
            )

        if "private" in erro or "permission" in erro:
            raise HTTPException(
                status_code=403,
                detail="Vídeo privado ou sem permissão de acesso."
            )

        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/download")
def proxy_download(url: str, title: str = "video"):
    try:
        req_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Abriremos a requisição com stream=True. 
        # O requests avalia apenas os cabeçalhos sem jogar o vídeo inteiro na RAM!
        response = requests.get(url, headers=req_headers, stream=True)
        response.raise_for_status()
        
        def iterfile():
            with response:
                # Usa pacotes maiores (1MB) para streaming extremamente eficiente
                for chunk in response.iter_content(chunk_size=1024 * 1024):
                    if chunk:
                        yield chunk
                    
        headers = {
            'Content-Disposition': f'attachment; filename="{title}.mp4"'
        }
        
        content_type = response.headers.get('Content-Type', 'video/mp4')
        return StreamingResponse(iterfile(), media_type=content_type, headers=headers)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro no download proxy: {str(e)}")

os.makedirs("app/static", exist_ok=True)
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")
