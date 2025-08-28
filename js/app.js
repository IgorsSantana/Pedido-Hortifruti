// --- LÓGICA DA APLICAÇÃO ---

const lojas = ['FCL3', 'FCL1', 'BCS', 'SJN', 'FCL2', 'MEP'];
let produtos = []; // Será preenchido pelo banco_de_dados.js ou localStorage

// --- Persistência ---
const STORAGE_KEYS = {
    produtos: 'gp_produtos',
    quantidades: 'gp_quantidades',
    ultimosValores: 'gp_ultimos_valores',
    pedidosSalvos: 'gp_pedidos_salvos'
};

function carregarProdutosPersistidos() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEYS.produtos);
        if (salvo) {
            const lista = JSON.parse(salvo);
            if (Array.isArray(lista) && lista.length > 0 && lista.every(p => p.codigo)) {
                produtos = lista;
                return;
            }
        }
        produtos = window.produtosIniciais || [];
    } catch (_) {
        produtos = window.produtosIniciais || [];
    }
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

// --- FUNÇÕES DE SALVAMENTO E CARREGAMENTO DE PEDIDOS ---
function salvarPedidoAtual() {
    // 1. LÊ DIRETAMENTE DA TELA: Garante que temos os dados mais atuais.
    const quantidades = lerQuantidadesDaTela();

    // 2. SINCRONIZA O LOCALSTORAGE: Atualiza o salvamento automático com os dados da tela.
    // Isso garante que se o usuário gerar um PDF logo em seguida, os dados estarão corretos.
    salvarQuantidades(quantidades);

    // 3. PROCESSO NORMAL DE SALVAR O PEDIDO NOMEADO
    const nomePedido = prompt("Digite um nome para salvar este pedido:");
    if (!nomePedido || nomePedido.trim() === '') return;

    const nomeFinal = nomePedido.trim();
    const dataCriacao = new Date().toISOString();
    const pedidosExistentes = carregarPedidosSalvos();
    let pedidoExistente = pedidosExistentes.find(p => p.nome === nomeFinal);

    if (pedidoExistente) {
        if (!confirm(`Já existe um pedido chamado "${nomeFinal}". Deseja sobrescrever?`)) {
            return;
        }
        pedidoExistente.dataModificacao = dataCriacao;
        pedidoExistente.quantidades = quantidades;
        pedidoExistente.resumo = gerarResumoPedido(quantidades);
    } else {
        const pedidoParaSalvar = {
            nome: nomeFinal,
            dataCriacao: dataCriacao,
            dataModificacao: dataCriacao,
            quantidades: quantidades,
            resumo: gerarResumoPedido(quantidades)
        };
        pedidosExistentes.push(pedidoParaSalvar);
    }

    try {
        localStorage.setItem(STORAGE_KEYS.pedidosSalvos, JSON.stringify(pedidosExistentes));
        alert(`Pedido "${nomeFinal}" salvo com sucesso!`);
        atualizarListaPedidosSalvos();
    } catch (error) {
        alert('Erro ao salvar pedido: ' + error.message);
    }
}

function carregarPedidosSalvos() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEYS.pedidosSalvos);
        return salvo ? JSON.parse(salvo) : [];
    } catch (_) {
        return [];
    }
}

function carregarPedidoEspecifico(nomePedido) {
    const pedidos = carregarPedidosSalvos();
    const pedido = pedidos.find(p => p.nome === nomePedido);

    if (!pedido) {
        alert('Pedido não encontrado!');
        return;
    }

    if (confirm(`Carregar pedido "${nomePedido}"? Isso substituirá o pedido atual.`)) {
        // Aplica as quantidades do pedido carregado
        salvarQuantidades(pedido.quantidades);
        renderizarTabelaCompleta();

        // Atualiza a data de modificação do pedido salvo
        pedido.dataModificacao = new Date().toISOString();
        const index = pedidos.findIndex(p => p.nome === nomePedido);
        if (index !== -1) {
            pedidos[index] = pedido;
            localStorage.setItem(STORAGE_KEYS.pedidosSalvos, JSON.stringify(pedidos));
            atualizarListaPedidosSalvos();
        }

        alert(`Pedido "${nomePedido}" carregado com sucesso!`);
    }
}

function deletarPedido(nomePedido) {
    if (confirm(`Tem certeza que deseja deletar o pedido "${nomePedido}"?`)) {
        const pedidos = carregarPedidosSalvos();
        const pedidosFiltrados = pedidos.filter(p => p.nome !== nomePedido);

        try {
            localStorage.setItem(STORAGE_KEYS.pedidosSalvos, JSON.stringify(pedidosFiltrados));
            alert(`Pedido "${nomePedido}" deletado com sucesso!`);
            atualizarListaPedidosSalvos();
        } catch (error) {
            alert('Erro ao deletar pedido: ' + error.message);
        }
    }
}

function gerarResumoPedido(quantidades) {
    let totalCaixas = 0;
    let totalUnidades = 0;
    const produtosUnicos = new Set();

    Object.keys(quantidades).forEach(key => {
        const valor = parseFloat(quantidades[key]) || 0;
        if (valor > 0) {
            // CORREÇÃO: Adiciona o código do produto a um Set para contar produtos únicos
            const codigoProduto = key.split('::')[0];
            produtosUnicos.add(codigoProduto);
        }

        if (key.includes('::cx')) {
            totalCaixas += valor;
        } else if (key.includes('::un')) {
            totalUnidades += valor;
        }
    });

    return {
        totalProdutos: produtosUnicos.size, // Usa o tamanho do Set
        totalCaixas: Math.round(totalCaixas * 100) / 100,
        totalUnidades: Math.round(totalUnidades)
    };
}


function atualizarListaPedidosSalvos() {
    const container = document.getElementById('lista-pedidos-salvos');
    if (!container) return;

    const pedidos = carregarPedidosSalvos();
    // Ordena para que os mais recentes apareçam primeiro
    pedidos.sort((a, b) => new Date(b.dataModificacao) - new Date(a.dataModificacao));

    if (pedidos.length === 0) {
        container.innerHTML = '<p class="sem-pedidos">Nenhum pedido salvo ainda.</p>';
        return;
    }

    let html = '<div class="pedidos-grid">';
    pedidos.forEach(pedido => {
        const dataCriacao = new Date(pedido.dataCriacao).toLocaleDateString('pt-BR');
        const dataModificacao = new Date(pedido.dataModificacao).toLocaleDateString('pt-BR');
        const resumo = pedido.resumo || { totalProdutos: 0, totalCaixas: 0, totalUnidades: 0 }; // Fallback para pedidos antigos sem resumo

        html += `
            <div class="pedido-card">
                <div class="pedido-header">
                    <h4>${pedido.nome}</h4>
                    <div class="pedido-datas">
                        <small>Criado: ${dataCriacao}</small>
                        <small>Modificado: ${dataModificacao}</small>
                    </div>
                </div>
                <div class="pedido-resumo">
                    <span>${resumo.totalProdutos} produtos</span>
                    <span>${resumo.totalCaixas} cx</span>
                    <span>${resumo.totalUnidades} un</span>
                </div>
                <div class="pedido-acoes">
                    <button class="btn-carregar" onclick="carregarPedidoEspecifico('${pedido.nome}')">Carregar</button>
                    <button class="btn-deletar" onclick="deletarPedido('${pedido.nome}')">Deletar</button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
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
        custoUnidade: 0
    };
    if (novoProduto.fator > 0) {
        novoProduto.custoUnidade = novoProduto.custoCaixa / novoProduto.fator;
    }
    if (!novoProduto.codigo || !novoProduto.nome) { alert("Por favor, preencha pelo menos Código e Nome."); return; }
    if (produtos.some(p => p.codigo === novoProduto.codigo)) { alert("Erro: Já existe um produto com este código."); return; }

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
                if (novoProduto.fator > 0) ultimoFator = novoProduto.fator;
                if (novoProduto.custoCaixa > 0) ultimoCustoCaixa = novoProduto.custoCaixa;
            }
        });

        if (adicionados > 0) {
            salvarProdutos();
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
    lojas.forEach(loja => { headerHtml += `<th colspan="2" class="col-loja-${loja.toLowerCase()}">${loja}</th>`; });
    headerHtml += `<th class="col-total" rowspan="2">Total Unid.</th></tr><tr>`;
    lojas.forEach(loja => { headerHtml += `<th class="col-input col-loja-${loja.toLowerCase()}">Cx</th><th class="col-input col-loja-${loja.toLowerCase()}">Un</th>`; });
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
        inputsHtml += `<td class="col-input col-loja-${loja.toLowerCase()}"><input type="number" min="0" step="0.01" data-loja="${loja}" class="input-cx" value="${valorCx}"></td>
                       <td class="col-input col-loja-${loja.toLowerCase()}"><input type="number" min="0" data-loja="${loja}" class="input-un" value="${valorUn}"></td>`;
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
    produtos.forEach(p => ligarListenersLinha(p.codigo));
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
        totalUnidadesProduto += ((parseFloat(inputCx.value) || 0) * produto.fator) + (parseFloat(inputUn.value) || 0);
    });
    document.getElementById(`total-${codigo}`).textContent = Math.round(totalUnidadesProduto);
}

// --- BUSCA E VISIBILIDADE ---
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
        linha.style.display = visivel ? '' : 'none';
        linha.classList.toggle('oculta', !visivel);
    });
    aplicarCoresAlternadas();
}

const filtrarTabelaDebounced = debounce(filtrarTabela, 200);

function toggleTransferencia() {
    const body = document.body;
    const btn = document.getElementById('btn-toggle-transferencia');
    body.classList.toggle('transferencia-oculta');

    if (body.classList.contains('transferencia-oculta')) {
        btn.textContent = 'Exibir Transferência';
    } else {
        btn.textContent = 'Ocultar Transferência';
    }
}

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
    document.getElementById('output').textContent = conteudoTxt || "Nenhuma quantidade para o pedido total.";
    if (conteudoTxt) {
        const nomeSugerido = `pedido_TOTAL_${new Date().toISOString().slice(0,10)}.txt`;
        downloadTxt(conteudoTxt, nomeSugerido);
    }
}

function gerarTxtPorLoja() {
    let algumPedidoGerado = false;
    lojas.forEach(loja => {
        let conteudoTxtLoja = '';
        produtos.forEach(p => {
            const linhaProduto = document.getElementById(`produto-${p.codigo}`);
            const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
            const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
            const totalUnidadesLoja = ((parseFloat(inputCx.value) || 0) * p.fator) + (parseFloat(inputUn.value) || 0);
            if (totalUnidadesLoja > 0) {
                const linhaFormatada = `${p.codigo.toString().padStart(13, '0')}${Math.round(totalUnidadesLoja).toString().padStart(6, '0')}${Math.round(p.custoUnidade * 100).toString().padStart(6, '0')}\n`;
                conteudoTxtLoja += linhaFormatada;
            }
        });
        if (conteudoTxtLoja) {
            algumPedidoGerado = true;
            document.getElementById('output').textContent = conteudoTxtLoja;
            const nomeSugerido = `pedido_${loja}_${new Date().toISOString().slice(0,10)}.txt`;
            downloadTxt(conteudoTxtLoja, nomeSugerido);
        }
    });
    if (!algumPedidoGerado) { alert("Nenhuma quantidade inserida para gerar pedidos por loja."); }
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

    doc.setFontSize(18);
    doc.text('PEDIDO HORTIFRUTI', 105, 25, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Data: ${dataAtual}`, 20, 40);
    doc.text(`Hora: ${horaAtual}`, 120, 40);

    let yPos = 55;
    let totalGeral = 0;
    let totalValor = 0;

    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPos - 5, 180, 7, 'F');
    doc.text('Código', 18, yPos);
    doc.text('Produto', 45, yPos);
    doc.text('Grupo', 85, yPos);
    doc.text('Un/Cx', 110, yPos);
    doc.text('Custo Un.', 125, yPos);
    doc.text('Qtd Total', 150, yPos);
    doc.text('Valor Total', 170, yPos);
    yPos += 7;

    produtos.forEach(p => {
        const totalCalculado = parseInt(document.getElementById(`total-${p.codigo}`).textContent) || 0;
        if (totalCalculado > 0) {
            const valorTotal = totalCalculado * p.custoUnidade;
            totalGeral += totalCalculado;
            totalValor += valorTotal;
            doc.text(p.codigo, 18, yPos);
            doc.text(p.nome.substring(0, 18), 45, yPos);
            doc.text(p.grupo, 85, yPos);
            doc.text(p.fator.toString(), 110, yPos);
            doc.text(formatarMoeda(p.custoUnidade), 125, yPos);
            doc.text(totalCalculado.toString(), 150, yPos);
            doc.text(formatarMoeda(valorTotal), 170, yPos);
            yPos += 7;
            if (yPos > 270) { doc.addPage(); yPos = 25; }
        }
    });

    yPos += 5;
    doc.line(15, yPos, 195, yPos);
    yPos += 7;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('TOTAIS:', 140, yPos);
    yPos += 7;
    doc.text(`Quantidade Total: ${totalGeral} unidades`, 140, yPos);
    yPos += 7;
    doc.text(`Valor Total: ${formatarMoeda(totalValor)}`, 140, yPos);
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
            const totalUnidadesLoja = ((parseFloat(inputCx.value) || 0) * p.fator) + (parseFloat(inputUn.value) || 0);
            if (totalUnidadesLoja > 0) {
                totalLoja += totalUnidadesLoja;
                valorLoja += totalUnidadesLoja * p.custoUnidade;
            }
        });

        if (totalLoja > 0) {
            doc.setFontSize(9);
            doc.text(`${loja}: ${Math.round(totalLoja)} unidades - ${formatarMoeda(valorLoja)}`, 25, yPos);
            yPos += 6;
            if (yPos > 270) { doc.addPage(); yPos = 25; }
        }
    });

    const nomeArquivo = `pedido_hortifruti_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(nomeArquivo);
    const resumo = `PDF gerado com sucesso!\n- Valor total: ${formatarMoeda(totalValor)}\nArquivo: ${nomeArquivo}`;
    document.getElementById('output').textContent = resumo;
}

function downloadTxt(text, suggestedFilename) {
    const filename = prompt("Digite o nome do arquivo TXT para salvar:", suggestedFilename);
    if (filename) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none'; document.body.appendChild(element); element.click(); document.body.removeChild(element);
    }
}

function limparPedido() {
    if (confirm('Tem certeza que deseja limpar todo o pedido? Todas as quantidades serão removidas.')) {
        salvarQuantidades({});
        renderizarTabelaCompleta();
        document.getElementById('output').textContent = 'Pedido limpo com sucesso!';
        alert('Pedido limpo com sucesso!');
    }
}

// --- Listeners ---
function ligarListenersGlobais() {
    document.getElementById('campo-busca').addEventListener('keyup', filtrarTabelaDebounced);
    document.getElementById('btn-txt-total').addEventListener('click', gerarTxtTotal);
    document.getElementById('btn-txt-loja').addEventListener('click', gerarTxtPorLoja);
    document.getElementById('btn-pdf-total').addEventListener('click', gerarPDF);
    document.getElementById('btn-limpar-pedido').addEventListener('click', limparPedido);
    document.getElementById('btn-adicionar-produto').addEventListener('click', adicionarProdutoManual);
    document.getElementById('btn-toggle-transferencia').addEventListener('click', toggleTransferencia);
    document.getElementById('btn-salvar-pedido').addEventListener('click', salvarPedidoAtual);
    document.getElementById('upload-csv').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) { carregarProdutosDeCSVArquivo(file); }
    });
}

// CORREÇÃO PRINCIPAL APLICADA AQUI
function ligarListenersLinha(codigo) {
    const linha = document.getElementById(`produto-${codigo}`);
    if (!linha) return;

    // A função de salvar com debounce (atraso) é definida uma vez
    const debouncedSave = debounce(salvarQuantidades, 500);

    const inputs = linha.querySelectorAll('.input-cx, .input-un');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // MUDANÇA: Carrega o mapa de quantidades mais recente *dentro* do evento.
            // Isso garante que nunca estamos trabalhando com dados desatualizados.
            const mapaQuantidades = carregarQuantidades();

            const loja = input.getAttribute('data-loja');
            const tipo = input.classList.contains('input-cx') ? 'cx' : 'un';
            const key = `${codigo}::${loja}::${tipo}`;
            const valor = input.value;

            // Se o campo estiver vazio, remove a chave do mapa. Senão, atualiza.
            if (valor === '' || isNaN(parseFloat(valor)) || parseFloat(valor) === 0) {
                delete mapaQuantidades[key];
            } else {
                mapaQuantidades[key] = valor;
            }
            
            // Agenda o salvamento do mapa de quantidades *completo e atualizado*
            debouncedSave(mapaQuantidades);
            atualizarTotalProduto(codigo);
        });
    });

    const debouncedUpdate = debounce(atualizarProduto, 500);
    linha.querySelector(`#fator-${codigo}`).addEventListener('input', () => debouncedUpdate(codigo));
    linha.querySelector(`#custo-caixa-${codigo}`).addEventListener('input', () => debouncedUpdate(codigo));
}


// --- INICIALIZAÇÃO DA PÁGINA ---
window.onload = () => {
    carregarProdutosPersistidos();
    renderizarCabecalho();
    renderizarTabelaCompleta();
    ligarListenersGlobais();

    const ultimosValores = carregarUltimosValores();
    document.getElementById('novo-fator').value = ultimosValores.fator;
    document.getElementById('novo-custo-caixa').value = ultimosValores.custoCaixa;

    // Carregar lista de pedidos salvos
    atualizarListaPedidosSalvos();
};

function lerQuantidadesDaTela() {
    const mapaQuantidades = {};
    const linhas = document.querySelectorAll('#tabela-produtos tbody tr');

    linhas.forEach(linha => {
        // Extrai o código do produto a partir do ID da linha (ex: "produto-310100")
        const codigo = linha.id.split('-')[1];
        if (!codigo) return;

        // Pega todos os inputs de quantidade (caixas e unidades) da linha atual
        const inputs = linha.querySelectorAll('.input-cx, .input-un');

        inputs.forEach(input => {
            const valor = input.value;
            // Apenas adiciona ao mapa se houver um valor numérico e maior que zero
            if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
                const loja = input.getAttribute('data-loja');
                const tipo = input.classList.contains('input-cx') ? 'cx' : 'un';
                const key = `${codigo}::${loja}::${tipo}`;
                mapaQuantidades[key] = valor;
            }
        });
    });

    console.log("Quantidades lidas diretamente da tela:", mapaQuantidades);
    return mapaQuantidades;
}
