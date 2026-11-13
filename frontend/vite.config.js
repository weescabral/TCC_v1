import { defineConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, existsSync, mkdirSync } from 'node:fs';

const frontendDir = dirname(fileURLToPath(import.meta.url));

// O projeto ainda utiliza scripts clássicos e funções globais compartilhadas
// entre páginas. Copiamos a pasta js sem convertê-los em módulos ES.
function copiarScriptsLegados() {
  return {
    name: 'sensus-copy-legacy-scripts',
    closeBundle() {
      const origem = resolve(frontendDir, 'js');
      const destino = resolve(frontendDir, 'dist/js');
      if (existsSync(origem)) {
        mkdirSync(resolve(frontendDir, 'dist'), { recursive: true });
        cpSync(origem, destino, { recursive: true });
      }

      const assetsOrigem = resolve(frontendDir, 'assets');
      const assetsDestino = resolve(frontendDir, 'dist/assets');
      if (existsSync(assetsOrigem)) {
        mkdirSync(resolve(frontendDir, 'dist'), { recursive: true });
        cpSync(assetsOrigem, assetsDestino, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [copiarScriptsLegados()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: true
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        inicio: resolve(frontendDir, 'index.html'),
        checklist: resolve(frontendDir, 'pages/checklist.html'),
        configuracao: resolve(frontendDir, 'pages/configuracao-inicial.html'),
        dashboard: resolve(frontendDir, 'pages/dashboard.html'),
        historico: resolve(frontendDir, 'pages/historico-auditorias.html'),
        planos: resolve(frontendDir, 'pages/planos-acao.html'),
        relatorios: resolve(frontendDir, 'pages/relatorios.html'),
        setores: resolve(frontendDir, 'pages/setores.html'),
        sobre: resolve(frontendDir, 'pages/sobre-gestao.html'),
        usuarios: resolve(frontendDir, 'pages/usuarios.html')
      }
    }
  }
});
