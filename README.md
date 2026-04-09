# XDownloader

Baixe vídeos do Facebook, Instagram, YouTube e mais — sem nenhum pop-up irritante.

## Como usar

1. Clone o repositório
2. Execute `docker-compose up -d`
3. Acesse `http://localhost:80`

---

## 🔒 Vídeos Privados e Cookies (App VD)
O **XDownloader** suporta download de vídeos que exigem login:
1. Use a extensão **"Get cookies.txt LOCALLY"** no seu navegador enquanto logado na rede social.
2. Exporte os cookies e cole o conteúdo no arquivo: `apps/vd/app/cookies.txt`.
3. O sistema detectará os cookies automaticamente para o próximo download.
4. Isso deve ser feito periodicamente, pois os cookies expiram.