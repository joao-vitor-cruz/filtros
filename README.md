# Filtros

Câmera web, mobile-first, com filtros coloridos em tempo real e paletas escolhidas pelo usuário. O planejamento completo está em [PLANO.md](PLANO.md) e os bugs e pendências conhecidos em [BUGS.md](BUGS.md).

**Versão publicada:** https://joao-vitor-cruz.github.io/filtros/ (atualizada automaticamente a cada push na `main`).

## Rodando

```bash
npm install
npm run dev
```

O servidor sobe em HTTPS com um certificado autoassinado, porque a câmera só funciona em contexto seguro. Para testar no celular, abra o endereço **Network** que aparece no terminal (ex.: `https://192.168.0.10:5173/filtros/`), com o celular na mesma rede Wi-Fi, e aceite o aviso de certificado.

## Scripts

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento (HTTPS) |
| `npm run build` | Checagem de tipos + build de produção em `dist/` |
| `npm run preview` | Serve o build de produção |
| `npm test` | Testes unitários (Vitest) |
| `npm run typecheck` | Só a checagem de tipos |
