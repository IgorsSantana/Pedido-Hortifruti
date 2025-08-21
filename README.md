# Gerador de Pedidos Hortifruti (Web)

Aplicação web para lançamento de pedidos por loja, com geração de arquivos TXT e PDF. Suporta busca, importação via CSV, adição manual de produtos, persistência no navegador e quantidades decimais de caixas.

## ✨ Funcionalidades
- Tabela dinâmica com colunas por loja (Caixas e Unidades)
- Busca com debounce por nome ou código
- Adição manual de produtos
- Importação de produtos via arquivo CSV
- Persistência no navegador (localStorage):
  - Lista de produtos
  - Quantidades por loja e por produto
  - Últimos valores usados de Un/Cx e Custo da Caixa para novo produto
- Exportações:
  - TXT total (todas as lojas)
  - TXT por loja (um arquivo por loja)
  - PDF com resumo e detalhamento por loja
- Limpar pedido (zera quantidades e mantém Un/Cx e Custo da Caixa)
- Caixas decimais (ex.: 0.5, 1.25)

## 🚀 Como executar
1. Baixe/clon e o projeto
2. Abra o arquivo `index.html` diretamente no navegador (Chrome/Edge/Firefox)
3. Lance o pedido e use os botões para exportar TXT/PDF

Dica: Não é necessário servidor. Basta abrir o `index.html` com duplo clique.

## 📥 Formato do CSV
- Separador: ponto e vírgula `;`
- Cabeçalho obrigatório na primeira linha
- Colunas na ordem: `GRUPO;CODIGO;NOME;FATOR;CUSTOCAIXA;CUSTOUNIDADE`
- Decimais podem usar vírgula ou ponto

Exemplo:
```csv
GRUPO;CODIGO;NOME;FATOR;CUSTOCAIXA;CUSTOUNIDADE
FRUTAS;310100;ABACATE;20;120.00;6.00
LEGUMES;310103;ABOBRINHA VERDE;15;40,00;2,67
```

## 🧾 Exportações
### TXT (Total e por Loja)
- Layout por linha: `CODIGO(13) + QUANTIDADE(6) + PRECO_UNIT_CENTAVOS(6)`
  - `CODIGO`: zeros à esquerda (13 dígitos)
  - `QUANTIDADE`: unidades totais (inteiro), zeros à esquerda (6 dígitos)
  - `PRECO_UNIT_CENTAVOS`: custo unitário em centavos (inteiro), arredondado e preenchido (6 dígitos)
- Cálculo de unidades: `(caixas * fator) + unidades`
  - Caixas podem ser decimais; o total é arredondado para inteiro ao exportar

### PDF
- Conteúdo:
  - Título, data e hora
  - Tabela: código, produto, grupo, Un/Cx, custo unitário, quantidade total, valor total
  - Totais gerais (quantidade e valor)
  - Detalhamento por loja (quantidade e valor)
- Implementado com `jsPDF` via CDN

## 💾 Persistência (localStorage)
Chaves utilizadas:
- `gp_produtos`: lista de produtos
- `gp_quantidades`: mapa de quantidades por produto/loja/tipo
- `gp_ultimos_valores`: últimos valores usados de Un/Cx e Custo da Caixa na tela de novo produto

Para limpar apenas as quantidades: use o botão “Limpar Pedido”.

Para limpar tudo (opcional): nas DevTools do navegador → Application/Armazenamento → `localStorage` → remova as chaves acima.

## 🧩 Estrutura do projeto
```
index.html
js/
  ├─ app.js              # UI, cálculos, exportações e persistência
  └─ banco_de_dados.js   # Lista inicial (seed) de produtos
```

## 🔧 Personalização
- Lojas: altere a constante `lojas` em `js/app.js`
- PDF: ajuste margens, fontes e posições na função `gerarPDF()`
- CSV: valide/transforme dados em `carregarProdutosDeCSVArquivo()`

## 🔍 Dicas e problemas comuns
- PDF “fora de quadro”: margens já otimizadas. Se preciso, reduza fontes/colunas em `gerarPDF()`
- jsPDF não baixa: verifique a conexão ao CDN (firewall/AdBlock)
- Dados “sumiram”: o pedido pode ter sido limpo; produtos e últimos valores permanecem salvos

## 📄 Licença
Uso interno. Defina a licença conforme a necessidade do seu projeto.
