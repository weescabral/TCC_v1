# Ajustes desta versão

- Alinhamento vertical dos links Recursos, Planos e Suporte na página inicial.
- Símbolo geométrico da marca Sensus substituído por SVG centralizado.
- Espaçamento superior do destaque da página inicial ajustado para evitar corte do título.
- Geração do código de auditoria agora usa sequência global por ano, compatível com a unicidade global de `auditorias.codigo`.
- Bloqueio global por ano evita colisões entre criações simultâneas.

## Atualização local

1. Faça backup da pasta atual.
2. Extraia esta versão em uma pasta nova.
3. Preserve seu arquivo `backend/.env` original (ele não é incluído neste pacote).
4. Instale dependências com `npm install` na raiz e em `backend`, se necessário.
5. Inicie o backend e teste a criação de uma auditoria.

Nenhuma migration ou alteração de estrutura do banco de dados foi adicionada.
