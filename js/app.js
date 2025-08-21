// --- LÓGICA DA APLICAÇÃO ---

const lojas = ['FCL3', 'FCL1', 'BCS', 'SJN', 'FCL2', 'MEP'];

// --- Persistência ---
const STORAGE_KEYS = {
    produtos: 'gp_produtos',
    quantidades: 'gp_quantidades',
    ultimosValores: 'gp_ultimos_valores'
};

function carregarProdutosPersistidos() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEYS.produtos);
        if (!salvo) return;
        const lista = JSON.parse(salvo);
        if (Array.isArray(lista) && lista.every(p => p.codigo)) {
            produtos = lista;
        }
    } catch (_) {}
}

function salvarProdutos() {
    try { localStorage.setItem(STORAGE_KEYS.produtos, JSON.stringify(produtos)); } catch (_) {}
}

function carregarQuantidades() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEYS.quantidades);
        return salvo ? JSON.parse(salvo) : {};
    } catch (_) { return {}; }
}

function salvarQuantidades(mapa) {
    try { localStorage.setItem(STORAGE_KEYS.quantidades, JSON.stringify(mapa)); } catch (_) {}
}

function carregarUltimosValores() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEYS.ultimosValores);
        return salvo ? JSON.parse(salvo) : { fator: '', custoCaixa: '' };
    } catch (_) { return { fator: '', custoCaixa: '' }; }
}

function salvarUltimosValores(fator, custoCaixa) {
    try { 
        localStorage.setItem(STORAGE_KEYS.ultimosValores, JSON.stringify({ fator, custoCaixa })); 
    } catch (_) {}
}

// --- Debounce util ---
function debounce(fn, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

// --- FUNÇÕES DE GERENCIAMENTO DE PRODUTOS ---
function adicionarProdutoManual() {
    const novoProduto = {
        grupo: document.getElementById('novo-grupo').value.toUpperCase(),
        codigo: document.getElementById('novo-codigo').value,
        nome: document.getElementById('novo-nome').value.toUpperCase(),
        fator: parseFloat(document.getElementById('novo-fator').value) || 0,
        custoCaixa: parseFloat(document.getElementById('novo-custo-caixa').value) || 0,
        custoUnidade: parseFloat(document.getElementById('novo-custo-unidade').value) || 0,
    };
    if (!novoProduto.codigo || !novoProduto.nome || !novoProduto.fator) { alert("Por favor, preencha pelo menos Código, Nome e Unidades por Caixa."); return; }
    if (produtos.some(p => p.codigo === novoProduto.codigo)) { alert("Erro: Já existe um produto com este código."); return; }
    
    // Salva os últimos valores usados
    salvarUltimosValores(novoProduto.fator, novoProduto.custoCaixa);
    
    produtos.push(novoProduto);
    salvarProdutos();
    renderizarTabelaCompleta();
    alert(`Produto "${novoProduto.nome}" adicionado com sucesso!`);
}

function carregarProdutosDeCSVArquivo(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const linhas = text.split('\n').filter(linha => linha.trim() !== '');
        const novasLinhas = linhas.slice(1);
        let adicionados = 0;
        let ultimoFator = 0;
        let ultimoCustoCaixa = 0;
        
        novasLinhas.forEach(linha => {
            const colunas = linha.replace(/\r/g, '').split(';');
            if (colunas.length < 6) return;
            const novoProduto = {
                grupo: colunas[0].trim().toUpperCase(),
                codigo: colunas[1].trim(),
                nome: colunas[2].trim().toUpperCase(),
                fator: parseFloat(colunas[3].replace(',', '.')) || 0,
                custoCaixa: parseFloat(colunas[4].replace(',', '.')) || 0,
                custoUnidade: parseFloat(colunas[5].replace(',', '.')) || 0,
            };
            if (novoProduto.codigo && !produtos.some(p => p.codigo === novoProduto.codigo)) { 
                produtos.push(novoProduto); 
                adicionados++; 
                // Guarda os últimos valores para salvar depois
                if (novoProduto.fator > 0) ultimoFator = novoProduto.fator;
                if (novoProduto.custoCaixa > 0) ultimoCustoCaixa = novoProduto.custoCaixa;
            }
        });
        
        if (adicionados > 0) { 
            salvarProdutos(); 
            // Salva os últimos valores se houver produtos válidos
            if (ultimoFator > 0 || ultimoCustoCaixa > 0) {
                salvarUltimosValores(ultimoFator, ultimoCustoCaixa);
            }
        }
        
        renderizarTabelaCompleta();
        alert(`${adicionados} novos produtos foram adicionados da lista! A tabela foi atualizada.`);
    };
    reader.readAsText(file);
}

// --- FUNÇÕES DE RENDERIZAÇÃO E CÁLCULO ---
function formatarMoeda(valor) { return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

function renderizarCabecalho() {
    const thead = document.querySelector('#tabela-produtos thead');
    let headerHtml = `<tr><th class="col-grupo" rowspan="2">Grupo</th><th class="col-codigo" rowspan="2">Código</th><th class="col-descricao" rowspan="2">Descrição</th>
                          <th class="col-fator" rowspan="2">Un/Cx</th><th class="col-custo" rowspan="2">Custo Caixa</th><th class="col-custo" rowspan="2">Custo Unid.</th>`;
    lojas.forEach(loja => { headerHtml += `<th colspan="2">${loja}</th>`; });
    headerHtml += `<th class="col-total" rowspan="2">Total Unid.</th></tr><tr>`;
    lojas.forEach(() => { headerHtml += `<th class="col-input">Cx</th><th class="col-input">Un</th>`; });
    headerHtml += `</tr>`;
    thead.innerHTML = headerHtml;
}

function renderizarLinhaProduto(p, fragmento, quantidades) {
    const row = document.createElement('tr'); row.id = `produto-${p.codigo}`;
    let inputsHtml = '';
    lojas.forEach(loja => {
        const keyCx = `${p.codigo}::${loja}::cx`;
        const keyUn = `${p.codigo}::${loja}::un`;
        const valorCx = quantidades[keyCx] || '';
        const valorUn = quantidades[keyUn] || '';
        inputsHtml += `<td class="col-input"><input type="number" min="0" step="0.01" data-loja="${loja}" class="input-cx" value="${valorCx}"></td>
                       <td class="col-input"><input type="number" min="0" data-loja="${loja}" class="input-un" value="${valorUn}"></td>`;
    });
    row.innerHTML = `<td class="col-grupo grupo-info">${p.grupo}</td>
                    <td class="col-codigo">${p.codigo}</td>
                    <td class="col-descricao produto-info" title="${p.nome}">${p.nome}</td>
                    <td class="col-fator"><input type="number" value="${p.fator}" id="fator-${p.codigo}" class="input-edit"></td>
                    <td class="col-custo"><input type="number" value="${p.custoCaixa.toFixed(2)}" id="custo-caixa-${p.codigo}" class="input-edit" step="0.01"></td>
                    <td class="col-custo"><input type="text" value="${formatarMoeda(p.custoUnidade)}" id="custo-unidade-${p.codigo}" class="input-edit readonly" readonly></td>
                    ${inputsHtml}
                    <td class="col-total total-geral" id="total-${p.codigo}">0</td>`;
    fragmento.appendChild(row);
}

function renderizarTabelaCompleta() {
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));
    const fragmento = document.createDocumentFragment();
    const quantidades = carregarQuantidades();
    produtos.forEach(p => renderizarLinhaProduto(p, fragmento, quantidades));
    tbody.appendChild(fragmento);
    // ligar listeners após inserir no DOM
    produtos.forEach(p => ligarListenersLinha(p.codigo));
    // atualizar totais conforme valores persistidos
    produtos.forEach(p => atualizarTotalProduto(p.codigo));
    aplicarCoresAlternadas();
}

function atualizarProduto(codigo) {
    const produto = produtos.find(p => p.codigo === codigo); if (!produto) return;
    const novoFator = parseFloat(document.getElementById(`fator-${codigo}`).value) || 0;
    const novoCustoCaixa = parseFloat(document.getElementById(`custo-caixa-${codigo}`).value) || 0;
    const novoCustoUnidade = novoFator > 0 ? novoCustoCaixa / novoFator : 0;
    produto.fator = novoFator;
    produto.custoCaixa = novoCustoCaixa;
    produto.custoUnidade = novoCustoUnidade;
    document.getElementById(`custo-unidade-${codigo}`).value = formatarMoeda(novoCustoUnidade);
    
    // Salva os últimos valores usados quando editar um produto
    if (novoFator > 0 || novoCustoCaixa > 0) {
        salvarUltimosValores(novoFator, novoCustoCaixa);
    }
    
    salvarProdutos();
    atualizarTotalProduto(codigo);
}

function atualizarTotalProduto(codigo) {
    const produto = produtos.find(p => p.codigo === codigo);
    const linhaProduto = document.getElementById(`produto-${codigo}`);
    let totalUnidadesProduto = 0;
    lojas.forEach(loja => {
        const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
        const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
        totalUnidadesProduto += ((parseFloat(inputCx.value) || 0) * produto.fator) + (parseInt(inputUn.value) || 0);
    });
    document.getElementById(`total-${codigo}`).textContent = Math.round(totalUnidadesProduto);
}

// --- BUSCA E ZEBRA ---
function aplicarCoresAlternadas() {
    const linhasVisiveis = document.querySelectorAll('#tabela-produtos tbody tr:not(.oculta)');
    linhasVisiveis.forEach((linha, index) => {
        linha.classList.remove('linha-par');
        if (index % 2 === 1) { linha.classList.add('linha-par'); }
    });
}

function filtrarTabela() {
    const termoBusca = document.getElementById('campo-busca').value.toUpperCase();
    const linhas = document.querySelectorAll('#tabela-produtos tbody tr');
    linhas.forEach(linha => {
        const nomeProduto = linha.querySelector('.produto-info').textContent.toUpperCase();
        const codigoProduto = linha.querySelector('.col-codigo').textContent.toUpperCase();
        const visivel = nomeProduto.includes(termoBusca) || codigoProduto.includes(termoBusca);
        linha.classList.toggle('oculta', !visivel);
        linha.style.display = visivel ? '' : 'none';
    });
    aplicarCoresAlternadas();
}

const filtrarTabelaDebounced = debounce(filtrarTabela, 200);

// --- FUNÇÕES DE GERAÇÃO DE ARQUIVOS ---
function gerarTxtTotal() {
    let conteudoTxt = '';
    produtos.forEach(p => {
        const totalCalculado = document.getElementById(`total-${p.codigo}`).textContent;
        if (parseInt(totalCalculado) > 0) {
            const linhaFormatada = `${p.codigo.toString().padStart(13, '0')}${totalCalculado.toString().padStart(6, '0')}${Math.round(p.custoUnidade * 100).toString().padStart(6, '0')}\n`;
            conteudoTxt += linhaFormatada;
        }
    });
    document.getElementById('output').textContent = conteudoTxt || "Nenhuma quantidade foi inserida para o pedido total.";
    if (conteudoTxt) { downloadTxt(conteudoTxt, `pedido_TOTAL_${new Date().toISOString().slice(0,10)}.txt`); }
}

function gerarTxtPorLoja() {
    let algumPedidoGerado = false;
    lojas.forEach(loja => {
        let conteudoTxtLoja = '';
        produtos.forEach(p => {
            const linhaProduto = document.getElementById(`produto-${p.codigo}`);
            const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
            const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
            const totalUnidadesLoja = ((parseFloat(inputCx.value) || 0) * p.fator) + (parseInt(inputUn.value) || 0);
            if (totalUnidadesLoja > 0) {
                const linhaFormatada = `${p.codigo.toString().padStart(13, '0')}${Math.round(totalUnidadesLoja).toString().padStart(6, '0')}${Math.round(p.custoUnidade * 100).toString().padStart(6, '0')}\n`;
                conteudoTxtLoja += linhaFormatada;
            }
        });
        if (conteudoTxtLoja) {
            algumPedidoGerado = true;
            document.getElementById('output').textContent = conteudoTxtLoja;
            downloadTxt(conteudoTxtLoja, `pedido_${loja}_${new Date().toISOString().slice(0,10)}.txt`);
        }
    });
    if (!algumPedidoGerado) { alert("Nenhuma quantidade foi inserida para gerar pedidos por loja."); }
 }

function gerarPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        alert("Erro: Biblioteca jsPDF não carregada. Tente recarregar a página.");
        return;
    }

    const doc = new jsPDF();
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Cabeçalho - centralizado e com margens adequadas
    doc.setFontSize(18);
    doc.text('PEDIDO HORTIFRUTI', 105, 25, { align: 'center' });
    
    doc.setFontSize(11);
    doc.text(`Data: ${dataAtual}`, 20, 40);
    doc.text(`Hora: ${horaAtual}`, 120, 40);
    
    // Tabela de produtos - ajustada para caber melhor
    let yPos = 55;
    let totalGeral = 0;
    let totalValor = 0;
    
    // Cabeçalho da tabela - com colunas ajustadas
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, 180, 7, 'F');
    
    // Colunas ajustadas para caber melhor
    doc.text('Código', 18, yPos);
    doc.text('Produto', 45, yPos);
    doc.text('Grupo', 85, yPos);
    doc.text('Un/Cx', 110, yPos);
    doc.text('Custo Un.', 125, yPos);
    doc.text('Qtd Total', 150, yPos);
    doc.text('Valor Total', 170, yPos);
    
    yPos += 12;
    
    // Produtos com quantidade - espaçamento otimizado
    produtos.forEach(p => {
        const totalCalculado = parseInt(document.getElementById(`total-${p.codigo}`).textContent) || 0;
        if (totalCalculado > 0) {
            const valorTotal = totalCalculado * p.custoUnidade;
            totalGeral += totalCalculado;
            totalValor += valorTotal;
            
            // Linha do produto - posições ajustadas
            doc.text(p.codigo, 18, yPos);
            doc.text(p.nome.substring(0, 18), 45, yPos);
            doc.text(p.grupo, 85, yPos);
            doc.text(p.fator.toString(), 110, yPos);
            doc.text(formatarMoeda(p.custoUnidade), 125, yPos);
            doc.text(totalCalculado.toString(), 150, yPos);
            doc.text(formatarMoeda(valorTotal), 170, yPos);
            
            yPos += 7;
            
            // Quebra de página se necessário - margem ajustada
            if (yPos > 270) {
                doc.addPage();
                yPos = 25;
            }
        }
    });
    
    // Linha separadora
    yPos += 8;
    doc.line(15, yPos, 195, yPos);
    yPos += 12;
    
    // Totais - posicionados melhor
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAIS:', 140, yPos);
    yPos += 7;
    doc.text(`Quantidade Total: ${totalGeral} unidades`, 140, yPos);
    yPos += 7;
    doc.text(`Valor Total: ${formatarMoeda(totalValor)}`, 140, yPos);
    
    // Detalhamento por loja - com quebra de página se necessário
    yPos += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('DETALHAMENTO POR LOJA:', 20, yPos);
    yPos += 8;
    
    lojas.forEach(loja => {
        let totalLoja = 0;
        let valorLoja = 0;
        
        produtos.forEach(p => {
            const linhaProduto = document.getElementById(`produto-${p.codigo}`);
            const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
            const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
            const totalUnidadesLoja = ((parseFloat(inputCx.value) || 0) * p.fator) + (parseInt(inputUn.value) || 0);
            
            if (totalUnidadesLoja > 0) {
                totalLoja += totalUnidadesLoja;
                valorLoja += totalUnidadesLoja * p.custoUnidade;
            }
        });
        
        if (totalLoja > 0) {
            doc.setFontSize(9);
            doc.text(`${loja}: ${Math.round(totalLoja)} unidades - ${formatarMoeda(valorLoja)}`, 25, yPos);
            yPos += 6;
            
            // Quebra de página se necessário
            if (yPos > 270) {
                doc.addPage();
                yPos = 25;
            }
        }
    });
    
    // Download do PDF
    const nomeArquivo = `pedido_hortifruti_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(nomeArquivo);
    
    // Atualiza o output para mostrar resumo
    const resumo = `PDF gerado com sucesso!\n\nResumo do Pedido:\n- Total de produtos: ${produtos.filter(p => parseInt(document.getElementById(`total-${p.codigo}`).textContent) > 0).length}\n- Quantidade total: ${totalGeral} unidades\n- Valor total: ${formatarMoeda(totalValor)}\n\nArquivo salvo como: ${nomeArquivo}`;
    document.getElementById('output').textContent = resumo;
}

function downloadTxt(text, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none'; document.body.appendChild(element); element.click(); document.body.removeChild(element);
}

function limparPedido() {
    if (confirm('Tem certeza que deseja limpar todo o pedido? Todas as quantidades serão removidas.')) {
        // Limpa todas as quantidades dos inputs
        produtos.forEach(p => {
            const linhaProduto = document.getElementById(`produto-${p.codigo}`);
            if (linhaProduto) {
                lojas.forEach(loja => {
                    const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
                    const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
                    if (inputCx) inputCx.value = '';
                    if (inputUn) inputUn.value = '';
                });
                
                // Atualiza o total do produto
                atualizarTotalProduto(p.codigo);
            }
        });
        
        // Limpa o localStorage das quantidades
        salvarQuantidades({});
        
        // Limpa o output
        document.getElementById('output').textContent = 'Pedido limpo com sucesso!';
        
        // Aplica as cores alternadas novamente
        aplicarCoresAlternadas();
        
        alert('Pedido limpo com sucesso! Os valores de Un/Cx e Custo Caixa foram mantidos.');
    }
}

// --- Listeners ---
function ligarListenersGlobais() {
    const campoBusca = document.getElementById('campo-busca');
    campoBusca.addEventListener('keyup', filtrarTabelaDebounced);

    document.getElementById('btn-total').addEventListener('click', gerarTxtTotal);
    document.getElementById('btn-por-loja').addEventListener('click', gerarTxtPorLoja);
    document.getElementById('btn-exportar-pdf').addEventListener('click', gerarPDF);
    document.getElementById('btn-limpar-pedido').addEventListener('click', limparPedido);
    document.getElementById('btn-adicionar-produto').addEventListener('click', adicionarProdutoManual);

    const upload = document.getElementById('upload-csv');
    upload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) { carregarProdutosDeCSVArquivo(file); }
    });
}

function ligarListenersLinha(codigo) {
    const linha = document.getElementById(`produto-${codigo}`);
    if (!linha) return;
    const inputs = linha.querySelectorAll('.input-cx, .input-un');
    const mapaQuantidades = carregarQuantidades();
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            const loja = input.getAttribute('data-loja');
            const tipo = input.classList.contains('input-cx') ? 'cx' : 'un';
            const key = `${codigo}::${loja}::${tipo}`;
            const valor = input.value;
            if (valor === '' || isNaN(parseInt(valor))) { delete mapaQuantidades[key]; } else { mapaQuantidades[key] = valor; }
            salvarQuantidades(mapaQuantidades);
            atualizarTotalProduto(codigo);
        });
    });

    linha.querySelector(`#fator-${codigo}`).addEventListener('input', () => atualizarProduto(codigo));
    linha.querySelector(`#custo-caixa-${codigo}`).addEventListener('input', () => atualizarProduto(codigo));
}

// --- INICIALIZAÇÃO DA PÁGINA ---
window.onload = () => {
    carregarProdutosPersistidos();
    renderizarCabecalho();
    renderizarTabelaCompleta();
    ligarListenersGlobais();
    
    // Preenche os campos com os últimos valores usados
    preencherUltimosValores();
};

function preencherUltimosValores() {
    const ultimosValores = carregarUltimosValores();
    if (ultimosValores.fator) {
        document.getElementById('novo-fator').value = ultimosValores.fator;
    }
    if (ultimosValores.custoCaixa) {
        document.getElementById('novo-custo-caixa').value = ultimosValores.custoCaixa;
    }
}