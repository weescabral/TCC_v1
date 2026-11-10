PATCH CLOUDINARY - SENSUS 5S

Arquivos deste pacote devem ser copiados para os mesmos caminhos no projeto:
- backend/config/cloudinary.js (novo arquivo)
- backend/controllers/EvidenciaController.js
- backend/routes/evidenciaRoutes.js
- backend/package.json
- frontend/js/checklist.js

Depois de copiar:
1) Em backend/.env, configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.
2) Na pasta backend, execute: npm install
   Isso instalará/registrará cloudinary e atualizará package-lock.json.
3) Configure as mesmas três variáveis nas Variables do serviço backend na Railway antes de publicar.
4) Reinicie o backend e teste primeiro com uma auditoria de teste.

O MySQL continua armazenando os metadados da evidência. O arquivo passa a ser enviado ao Cloudinary.
Evidências antigas com caminho /uploads/... continuam listadas e a exclusão mantém compatibilidade local.
Não versionar .env nem compartilhar API Secret.
