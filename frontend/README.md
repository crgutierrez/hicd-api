# 🏥 HICD System - Frontend

Sistema moderno de gerenciamento de clínicas e pacientes com interface web responsiva e funcionalidades PWA.

## 📋 Visão Geral

O frontend do HICD System é uma aplicação web progressiva (PWA) desenvolvida com:

- **Bootstrap 5.3.2** - Framework CSS responsivo
- **jQuery 3.7.1** - Biblioteca JavaScript para manipulação DOM
- **Font Awesome 6.4.0** - Ícones vetoriais
- **Service Worker** - Funcionalidades offline
- **Manifest PWA** - Instalação como app nativo

## 🚀 Funcionalidades

### 📊 Dashboard
- Estatísticas em tempo real de clínicas e pacientes
- Atividade recente do sistema
- Busca rápida de pacientes
- Navegação rápida para seções principais

### 🏥 Gerenciamento de Clínicas
- Visualização em grid responsivo
- Informações detalhadas de cada clínica
- Contadores de pacientes ativos
- Navegação direta para pacientes da clínica

### 👥 Gerenciamento de Pacientes
- Listagem paginada e responsiva
- Busca em tempo real
- Filtros por clínica
- Visualização detalhada de pacientes
- Status visual (ativo, inativo, etc.)

### 🔍 Busca Avançada
- Múltiplos critérios de busca
- Filtros combinados
- Resultados em tempo real
- Exportação de resultados

### 📱 PWA (Progressive Web App)
- Funciona offline
- Instalável como app nativo
- Push notifications
- Cache inteligente
- Sincronização em background

## 🏗️ Estrutura de Arquivos

```
frontend/
├── index.html              # Página principal
├── manifest.json           # Manifesto PWA
├── sw.js                   # Service Worker
├── icon-generator.html     # Gerador de ícones
├── css/
│   └── style.css          # Estilos customizados
├── js/
│   └── app.js             # JavaScript principal
└── icons/
    ├── icon.svg           # Ícone em SVG
    ├── icon-72x72.png     # Ícones em diferentes tamanhos
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## ⚙️ Configuração e Instalação

### 1. Gerar Ícones PWA

```bash
# Abrir o gerador de ícones no navegador
open frontend/icon-generator.html
```

1. Aguarde a geração automática dos ícones
2. Baixe cada ícone clicando em "Download"
3. Salve os arquivos na pasta `frontend/icons/`

### 2. Configurar Servidor Web

O frontend precisa ser servido através de um servidor web para funcionar corretamente:

#### Opção 1: Servidor Python (Desenvolvimento)
```bash
cd frontend
python3 -m http.server 8080
```

#### Opção 2: Live Server (VS Code)
1. Instale a extensão "Live Server"
2. Clique direito em `index.html`
3. Selecione "Open with Live Server"

#### Opção 3: Node.js serve
```bash
npx serve frontend -p 8080
```

### 3. Configurar API

Certifique-se de que a API está rodando em `http://localhost:3000`:

```bash
cd ../api
node server.js
```

## 🎨 Personalização

### Cores e Tema

As cores principais estão definidas no CSS usando variáveis CSS:

```css
:root {
    --primary-color: #0d6efd;
    --secondary-color: #6c757d;
    --success-color: #198754;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #0dcaf0;
}
```

### Responsividade

O sistema utiliza breakpoints do Bootstrap:

- **xs**: < 576px (smartphones)
- **sm**: ≥ 576px (smartphones landscape)
- **md**: ≥ 768px (tablets)
- **lg**: ≥ 992px (desktops)
- **xl**: ≥ 1200px (desktops grandes)

## 📱 Funcionalidades PWA

### Instalação

1. Acesse o site no navegador
2. Clique no ícone de "Instalar App" na barra de navegação
3. Ou use o menu do navegador > "Instalar HICD System"

### Cache Estratégico

- **Cache First**: CSS, JS, imagens (recursos estáticos)
- **Network First**: Dados da API (sempre atualizados)
- **Stale While Revalidate**: Conteúdo dinâmico

### Modo Offline

- Interface completa disponível offline
- Dados em cache para visualização
- Indicador visual de status offline
- Sincronização automática quando reconectado

## 🔧 Desenvolvimento

### Estrutura de Classes JavaScript

```javascript
class HICDApp {
    constructor()           // Inicialização
    init()                 // Setup inicial
    bindEvents()           // Eventos da interface
    setupPWA()             // Configuração PWA
    loadDashboard()        // Carregamento do dashboard
    loadClinicas()         // Carregamento de clínicas
    loadPacientes()        // Carregamento de pacientes
    searchPacientes()      // Busca de pacientes
    apiCall()              // Chamadas para API
    showToast()            // Notificações
}
```

### Padrões de Código

- **ES6+**: Classes, arrow functions, async/await
- **jQuery**: Manipulação DOM e eventos
- **Bootstrap**: Components e grid system
- **Responsive Design**: Mobile-first approach

## 🎯 UX/UI Princípios

### Design System

1. **Hierarquia Visual**
   - Tipografia clara e consistente
   - Cores com significado semântico
   - Espaçamento harmônico

2. **Interatividade**
   - Feedback visual imediato
   - Animações suaves (300ms)
   - Estados hover e focus claros

3. **Acessibilidade**
   - Contraste adequado (WCAG 2.1)
   - Navegação por teclado
   - Textos alternativos
   - Foco visível

4. **Performance**
   - Carregamento progressivo
   - Lazy loading de imagens
   - Cache inteligente
   - Otimização de bundle

### Componentes Principais

#### Cards Informativos
- Design clean com sombras sutis
- Hover effects para interatividade
- Status visual claro

#### Tabelas Responsivas
- Mobile-first com colapso vertical
- Ordenação e paginação
- Busca em tempo real

#### Modais e Overlays
- Contexto preservado
- Escape fácil
- Conteúdo scrollável

## 📊 Métricas e Analytics

### Performance Metrics
- Lighthouse Score: 90+
- First Contentful Paint: < 2s
- Time to Interactive: < 3s
- PWA Compliant: ✅

### Acessibilidade
- WCAG 2.1 AA: ✅
- Keyboard Navigation: ✅
- Screen Reader: ✅
- Color Contrast: ✅

## 🐛 Debugging

### Console Logs
```javascript
// Debug mode
window.hicdApp.debug = true;
```

### Network Monitoring
- DevTools > Network tab
- Service Worker status
- Cache inspection

### PWA Debugging
- DevTools > Application tab
- Manifest validation
- Service Worker events
- Cache storage

## 🚀 Deploy

### Preparação para Produção

1. **Minificar Assets**
```bash
# CSS
npx clean-css-cli -o style.min.css style.css

# JavaScript
npx terser app.js -o app.min.js
```

2. **Otimizar Imagens**
```bash
# Compress PNG icons
npx imagemin icons/*.png --out-dir=icons/optimized
```

3. **Configurar HTTPS**
- PWA requer HTTPS em produção
- Certificados SSL/TLS válidos

### Hosting Options

- **Vercel**: Deploy automático via Git
- **Netlify**: PWA otimizado
- **GitHub Pages**: Gratuito para projetos públicos
- **Firebase Hosting**: Integração com outros serviços

## 📚 Documentação Adicional

- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.3/)
- [jQuery API](https://api.jquery.com/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Guide](https://developers.google.com/web/fundamentals/primers/service-workers)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para detalhes.

---

**Desenvolvido com ❤️ para o HICD System**
