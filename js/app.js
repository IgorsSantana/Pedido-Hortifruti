// --- LÓGICA DA APLICAÇÃO ---

const lojas = ['FCL3', 'FCL1', 'BCS', 'SJN', 'FCL2', 'MEP'];

// --- FUNÇÕES DE GERENCIAMENTO DE PRODUTOS ---
function adicionarProdutoManual() {
    const novoProduto = {
        grupo: document.getElementById('novo-grupo').value.toUpperCase(), codigo: document.getElementById('novo-codigo').value,
        nome: document.getElementById('novo-nome').value.toUpperCase(), fator: parseFloat(document.getElementById('novo-fator').value) || 0,
        custoCaixa: parseFloat(document.getElementById('novo-custo-caixa').value) || 0, custoUnidade: parseFloat(document.getElementById('novo-custo-unidade').value) || 0,
    };
    if (!novoProduto.codigo || !novoProduto.nome || !novoProduto.fator) { alert("Por favor, preencha pelo menos Código, Nome e Unidades por Caixa."); return; }
    if (produtos.some(p => p.codigo === novoProduto.codigo)) { alert("Erro: Já existe um produto com este código."); return; }
    produtos.push(novoProduto);
    renderizarLinhaProduto(novoProduto, document.querySelector('#tabela-produtos tbody'));
    document.getElementById('novo-grupo').value = ''; document.getElementById('novo-codigo').value = ''; document.getElementById('novo-nome').value = '';
    document.getElementById('novo-fator').value = ''; document.getElementById('novo-custo-caixa').value = ''; document.getElementById('novo-custo-unidade').value = '';
    alert(`Produto "${novoProduto.nome}" adicionado com sucesso!`);
}
function carregarProdutosDeCSV(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result; const linhas = text.split('\n').filter(linha => linha.trim() !== '');
        const novasLinhas = linhas.slice(1); let adicionados = 0;
        novasLinhas.forEach(linha => {
            const colunas = linha.split(';'); if (colunas.length < 6) return;
            const novoProduto = {
                grupo: colunas[0].trim().toUpperCase(), codigo: colunas[1].trim(), nome: colunas[2].trim().toUpperCase(),
                fator: parseFloat(colunas[3].replace(',', '.')) || 0, custoCaixa: parseFloat(colunas[4].replace(',', '.')) || 0,
                custoUnidade: parseFloat(colunas[5].replace(',', '.')) || 0,
            };
            if (novoProduto.codigo && !produtos.some(p => p.codigo === novoProduto.codigo)) { produtos.push(novoProduto); adicionados++; }
        });
        renderizarTabelaCompleta(); alert(`${adicionados} novos produtos foram adicionados da lista! A tabela foi atualizada.`);
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
function renderizarLinhaProduto(p, tbody) {
    const row = document.createElement('tr'); row.id = `produto-${p.codigo}`;
    let inputsHtml = '';
    lojas.forEach(loja => {
        inputsHtml += `<td class="col-input"><input type="number" min="0" data-loja="${loja}" class="input-cx" oninput="atualizarTotalProduto('${p.codigo}')"></td>
                       <td class="col-input"><input type="number" min="0" data-loja="${loja}" class="input-un" oninput="atualizarTotalProduto('${p.codigo}')"></td>`;
    });
    row.innerHTML = `<td class="col-grupo grupo-info">${p.grupo}</td>
                    <td class="col-codigo">${p.codigo}</td>
                    <td class="col-descricao produto-info" title="${p.nome}">${p.nome}</td>
                    <td class="col-fator"><input type="number" value="${p.fator}" id="fator-${p.codigo}" class="input-edit" oninput="atualizarProduto('${p.codigo}')"></td>
                    <td class="col-custo"><input type="number" value="${p.custoCaixa.toFixed(2)}" id="custo-caixa-${p.codigo}" class="input-edit" step="0.01" oninput="atualizarProduto('${p.codigo}')"></td>
                    <td class="col-custo"><input type="text" value="${formatarMoeda(p.custoUnidade)}" id="custo-unidade-${p.codigo}" class="input-edit readonly" readonly></td>
                    ${inputsHtml}
                    <td class="col-total total-geral" id="total-${p.codigo}">0</td>`;
    tbody.appendChild(row);
}
function renderizarTabelaCompleta() {
    const tbody = document.querySelector('#tabela-produtos tbody');
    tbody.innerHTML = '';
    produtos.sort((a, b) => a.nome.localeCompare(b.nome));
    produtos.forEach(p => renderizarLinhaProduto(p, tbody));
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
    atualizarTotalProduto(codigo);
}
function atualizarTotalProduto(codigo) {
    const produto = produtos.find(p => p.codigo === codigo); const linhaProduto = document.getElementById(`produto-${codigo}`);
    let totalUnidadesProduto = 0;
    lojas.forEach(loja => {
        const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`); const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);
        totalUnidadesProduto += ((parseInt(inputCx.value) || 0) * produto.fator) + (parseInt(inputUn.value) || 0);
    });
    document.getElementById(`total-${codigo}`).textContent = totalUnidadesProduto;
}

// --- FUNÇÃO PARA GERAR O TXT TOTAL ---
function gerarTxtTotal() {
    let conteudoTxt = '';
    produtos.forEach(p => {
        const totalCalculado = document.getElementById(`total-${p.codigo}`).textContent;
        if (parseInt(totalCalculado) > 0) {
            const codigoFormatado = p.codigo.toString().padStart(13, '0');
            const quantidadeFormatada = totalCalculado.toString().padStart(6, '0');
            const custoEmCentavos = Math.round(p.custoUnidade * 100);
            const custoFormatado = custoEmCentavos.toString().padStart(6, '0');
            const linhaFormatada = `${codigoFormatado}${quantidadeFormatada}${custoFormatado}\n`;
            conteudoTxt += linhaFormatada;
        }
    });

    document.getElementById('output').textContent = conteudoTxt || "Nenhuma quantidade foi inserida para o pedido total.";

    if (conteudoTxt) {
        downloadTxt(conteudoTxt, `pedido_TOTAL_${new Date().toISOString().slice(0,10)}.txt`);
        alert("Arquivo de Pedido Total gerado com sucesso!");
    }
}

// --- NOVA FUNÇÃO PARA GERAR TXT POR LOJA ---
function gerarTxtPorLoja() {
    let algumPedidoGerado = false;
    
    lojas.forEach(loja => {
        let conteudoTxtLoja = '';
        
        produtos.forEach(p => {
            const linhaProduto = document.getElementById(`produto-${p.codigo}`);
            const inputCx = linhaProduto.querySelector(`.input-cx[data-loja="${loja}"]`);
            const inputUn = linhaProduto.querySelector(`.input-un[data-loja="${loja}"]`);

            const qtdCx = parseInt(inputCx.value) || 0;
            const qtdUn = parseInt(inputUn.value) || 0;
            const totalUnidadesLoja = (qtdCx * p.fator) + qtdUn;

            if (totalUnidadesLoja > 0) {
                const codigoFormatado = p.codigo.toString().padStart(13, '0');
                const quantidadeFormatada = totalUnidadesLoja.toString().padStart(6, '0');
                const custoEmCentavos = Math.round(p.custoUnidade * 100);
                const custoFormatado = custoEmCentavos.toString().padStart(6, '0');
                const linhaFormatada = `${codigoFormatado}${quantidadeFormatada}${custoFormatado}\n`;
                conteudoTxtLoja += linhaFormatada;
            }
        });

        // Se a loja teve algum item, gera o arquivo para ela
        if (conteudoTxtLoja) {
            algumPedidoGerado = true;
            document.getElementById('output').textContent = conteudoTxtLoja; // Mostra o conteúdo do último arquivo gerado
            downloadTxt(conteudoTxtLoja, `pedido_${loja}_${new Date().toISOString().slice(0,10)}.txt`);
        }
    });

    if (algumPedidoGerado) {
        alert("Arquivos de pedido por loja gerados com sucesso!");
    } else {
        alert("Nenhuma quantidade foi inserida para gerar pedidos por loja.");
    }
}

function downloadTxt(text, filename) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// --- INICIALIZAÇÃO DA PÁGINA ---
window.onload = () => { renderizarCabecalho(); renderizarTabelaCompleta(); };