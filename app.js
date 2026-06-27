/* ====== Cafeteria da Luna ====== */
const STORAGE_KEY = "cafeteria_luna_v1";

/* Dados padrão (cápsulas Dolce Gusto + outras bebidas) */
function dadosPadrao() {
  return {
    pedidoNum: 1,
    // Bebidas com cápsula (controle de estoque)
    capsulas: [
      { id: "c1", nome: "Chococino", emoji: "🍫", cafe: false, intensidade: 1, capsulas: 1, ml: 210, qtd: 10 },
      { id: "c2", nome: "Mochaccino Canela", emoji: "☕", cafe: true, intensidade: 3, capsulas: 1, ml: 200, qtd: 2 },
      { id: "c3", nome: "KitKat", emoji: "🍫", cafe: false, intensidade: 1, capsulas: 1, ml: 210, qtd: 8 },
      { id: "c4", nome: "Espresso", emoji: "☕", cafe: true, intensidade: 5, capsulas: 1, ml: 40, qtd: 30 },
      { id: "c5", nome: "Galak", emoji: "🤍", cafe: false, intensidade: 1, capsulas: 1, ml: 210, qtd: 3 },
      { id: "c6", nome: "Alpino", emoji: "🍫", cafe: false, intensidade: 1, capsulas: 1, ml: 210, qtd: 10 },
    ],
    // Bebidas sem cápsula (não controlam estoque por padrão)
    outras: [
      { id: "o1", nome: "Água", emoji: "💧", ml: 300 },
      { id: "o2", nome: "Água com gás", emoji: "🫧", ml: 300 },
      { id: "o3", nome: "Tônica", emoji: "🍸", ml: 250 },
      { id: "o4", nome: "Cerveja", emoji: "🍺", ml: 350 },
    ],
  };
}

/* ====== Estado ====== */
let dados = carregar();
let carrinho = {}; // { id: quantidade }

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("Erro ao carregar", e); }
  return dadosPadrao();
}
function salvar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
}

/* Helpers */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function itemPorId(id) {
  return dados.capsulas.find((c) => c.id === id) || dados.outras.find((o) => o.id === id);
}
function ehCapsula(item) { return dados.capsulas.includes(item); }

/* ====== RENDER CARDÁPIO ====== */
// Categorias na ordem em que aparecem no cardápio
const CATEGORIAS = ["☕ Cafés", "🍫 Achocolatados", "🥤 Outras bebidas"];
function categoriaDe(item) {
  if (!ehCapsula(item)) return "🥤 Outras bebidas";
  return item.cafe ? "☕ Cafés" : "🍫 Achocolatados";
}

function renderCardapio() {
  const grid = $("#cardapio-grid");
  grid.innerHTML = "";

  // agrupa por categoria
  const grupos = {};
  [...dados.capsulas, ...dados.outras].forEach((item) => {
    const c = categoriaDe(item);
    (grupos[c] = grupos[c] || []).push(item);
  });

  CATEGORIAS.forEach((cat) => {
    const itens = grupos[cat];
    if (!itens || !itens.length) return;
    // ordem alfabética dentro da categoria
    itens.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const titulo = document.createElement("h2");
    titulo.className = "cat-title";
    titulo.textContent = cat;
    grid.appendChild(titulo);

    itens.forEach((item) => grid.appendChild(cardDe(item)));
  });
}

function cardDe(item) {
    const cap = ehCapsula(item);
    const max = cap ? Math.floor(item.qtd / (item.capsulas || 1)) : Infinity;
    const sel = carrinho[item.id] || 0;
    const esgotado = cap && max <= 0;

    const card = document.createElement("div");
    card.className = "card" + (sel > 0 ? " selected" : "") + (esgotado ? " esgotado" : "");

    let badges = "";
    if (cap) {
      badges += item.cafe
        ? `<span class="badge cafe">☕ café</span>`
        : `<span class="badge semcafe">sem café</span>`;
      if (item.cafe) {
        const dots = "●".repeat(item.intensidade) + "○".repeat(5 - item.intensidade);
        badges += `<span class="badge"><span class="intensity">${dots}</span></span>`;
      }
    } else {
      badges += `<span class="badge semcafe">sem café</span>`;
    }

    let stockTag = "";
    if (cap) {
      const low = item.qtd <= 3;
      stockTag = `<div class="stock-tag${low ? " low" : ""}">${item.qtd} cápsula(s)${item.capsulas > 1 ? " · usa " + item.capsulas + "/copo" : ""}</div>`;
    }

    const mlTag = item.ml ? `<div class="ml-tag">${item.ml} ml</div>` : "";

    card.innerHTML = `
      ${esgotado ? '<span class="esgotado-tag">Esgotado</span>' : ""}
      <div class="card-emoji">${item.emoji}</div>
      <div class="card-name">${item.nome}</div>
      <div class="badges">${badges}</div>
      ${mlTag}
      ${stockTag}
      <div class="stepper">
        <button class="minus" ${sel <= 0 ? "disabled" : ""}>−</button>
        <span class="qty">${sel}</span>
        <button class="plus" ${esgotado || sel >= max ? "disabled" : ""}>+</button>
      </div>`;

    card.querySelector(".plus").addEventListener("click", () => mudarCarrinho(item.id, 1, max));
    card.querySelector(".minus").addEventListener("click", () => mudarCarrinho(item.id, -1, max));
    return card;
}

function mudarCarrinho(id, delta, max) {
  const atual = carrinho[id] || 0;
  let novo = atual + delta;
  if (novo < 0) novo = 0;
  if (novo > max) novo = max;
  if (novo === 0) delete carrinho[id];
  else carrinho[id] = novo;
  renderCardapio();
  atualizarFab();
}

function atualizarFab() {
  const total = Object.values(carrinho).reduce((a, b) => a + b, 0);
  const fab = $("#btn-pedir");
  $("#fab-count").textContent = total;
  fab.hidden = total === 0 || !$("#view-cardapio").classList.contains("active");
}

/* ====== RENDER ESTOQUE ====== */
function renderEstoque() {
  const list = $("#estoque-list");
  list.innerHTML = "";
  dados.capsulas.forEach((item) => list.appendChild(linhaEstoque(item, true)));

  const outras = $("#outras-list");
  outras.innerHTML = "";
  dados.outras.forEach((item) => outras.appendChild(linhaEstoque(item, false)));
}

function linhaEstoque(item, cap) {
  const row = document.createElement("div");
  row.className = "estoque-row";
  let sub = "";
  if (cap) {
    sub = (item.cafe ? "☕ café · int " + item.intensidade : "sem café");
    if (item.capsulas > 1) sub += " · " + item.capsulas + " cáps/copo";
  } else {
    sub = "sempre disponível";
  }
  if (item.ml) sub += " · " + item.ml + " ml";
  row.innerHTML = `
    <div class="row-emoji">${item.emoji}</div>
    <div class="row-info">
      <div class="row-name">${item.nome}</div>
      <div class="row-sub">${sub}</div>
    </div>
    ${cap ? `
      <button class="mini minus" ${item.qtd <= 0 ? "disabled" : ""}>−</button>
      <span class="row-qty">${item.qtd}</span>
      <button class="mini plus">+</button>` : ""}
    <button class="edit-pencil">✏️</button>`;

  if (cap) {
    row.querySelector(".plus").addEventListener("click", () => { item.qtd++; salvar(); renderEstoque(); });
    row.querySelector(".minus").addEventListener("click", () => { if (item.qtd > 0) item.qtd--; salvar(); renderEstoque(); });
  }
  row.querySelector(".edit-pencil").addEventListener("click", () => abrirEdit(item, cap));
  return row;
}

/* ====== EDITAR / ADICIONAR ITEM ====== */
let editAlvo = null; // {item, cap, novo}

function abrirEdit(item, cap, novo = false) {
  editAlvo = { item, cap, novo };
  $("#edit-title").textContent = novo ? (cap ? "Nova cápsula" : "Nova bebida") : "Editar " + item.nome;
  $("#edit-nome").value = item.nome || "";
  $("#edit-emoji").value = item.emoji || (cap ? "☕" : "🥤");
  $("#edit-ml").value = item.ml || "";
  $("#edit-cafe").checked = !!item.cafe;
  $("#edit-intensidade").value = item.intensidade || 3;
  $("#edit-capsulas").value = item.capsulas || 1;
  $("#edit-qtd").value = item.qtd || 0;

  // mostra/esconde campos só de cápsula
  const mostrarCafe = cap;
  $("#edit-cafe").closest("label").style.display = mostrarCafe ? "" : "none";
  $("#edit-capsulas-wrap").style.display = mostrarCafe ? "" : "none";
  $("#edit-qtd").closest("label").style.display = mostrarCafe ? "" : "none";
  toggleIntensidade();
  $("#btn-edit-del").style.display = novo ? "none" : "";

  $("#overlay-edit").hidden = false;
}
function toggleIntensidade() {
  const cap = editAlvo && editAlvo.cap;
  $("#edit-intensidade-wrap").style.display = (cap && $("#edit-cafe").checked) ? "" : "none";
}
$("#edit-cafe").addEventListener("change", toggleIntensidade);

function fecharEdit() { $("#overlay-edit").hidden = true; editAlvo = null; }

$("#btn-edit-save").addEventListener("click", () => {
  const { item, cap, novo } = editAlvo;
  const nome = $("#edit-nome").value.trim();
  if (!nome) { alert("Dê um nome para a bebida 🙂"); return; }
  item.nome = nome;
  item.emoji = $("#edit-emoji").value.trim() || (cap ? "☕" : "🥤");
  const ml = parseInt($("#edit-ml").value);
  item.ml = ml > 0 ? ml : 0;
  if (cap) {
    item.cafe = $("#edit-cafe").checked;
    item.intensidade = parseInt($("#edit-intensidade").value) || 1;
    item.capsulas = Math.max(1, parseInt($("#edit-capsulas").value) || 1);
    item.qtd = Math.max(0, parseInt($("#edit-qtd").value) || 0);
  }
  if (novo) {
    (cap ? dados.capsulas : dados.outras).push(item);
  }
  salvar(); fecharEdit(); renderEstoque(); renderCardapio();
});

$("#btn-edit-del").addEventListener("click", () => {
  const { item, cap } = editAlvo;
  if (!confirm("Excluir " + item.nome + "?")) return;
  const arr = cap ? dados.capsulas : dados.outras;
  const i = arr.indexOf(item);
  if (i >= 0) arr.splice(i, 1);
  delete carrinho[item.id];
  salvar(); fecharEdit(); renderEstoque(); renderCardapio(); atualizarFab();
});

$("#btn-edit-cancel").addEventListener("click", fecharEdit);

$("#btn-add-capsula").addEventListener("click", () =>
  abrirEdit({ id: "c" + Date.now(), nome: "", emoji: "☕", cafe: true, intensidade: 3, capsulas: 1, qtd: 0 }, true, true));
$("#btn-add-outra").addEventListener("click", () =>
  abrirEdit({ id: "o" + Date.now(), nome: "", emoji: "🥤" }, false, true));

/* ====== PEDIDO ====== */
$("#btn-pedir").addEventListener("click", abrirPedido);

function abrirPedido() {
  const list = $("#ticket-list");
  list.innerHTML = "";
  let total = 0;
  Object.entries(carrinho).forEach(([id, q]) => {
    const item = itemPorId(id);
    if (!item) return;
    total += q;
    const li = document.createElement("li");
    li.innerHTML = `<span class="t-emoji">${item.emoji}</span>
      <span class="t-name">${item.nome}${item.ml ? ` <small>${item.ml} ml</small>` : ""}</span>
      <span class="t-qty">x${q}</span>`;
    list.appendChild(li);
  });
  $("#ticket-num").textContent = "#" + String(dados.pedidoNum).padStart(3, "0");
  $("#ticket-total").textContent = total + (total === 1 ? " bebida" : " bebidas");
  $("#overlay-pedido").hidden = false;
}

$("#btn-voltar").addEventListener("click", () => { $("#overlay-pedido").hidden = true; });

$("#btn-confirmar").addEventListener("click", () => {
  // baixa estoque das cápsulas
  Object.entries(carrinho).forEach(([id, q]) => {
    const item = itemPorId(id);
    if (item && ehCapsula(item)) {
      item.qtd = Math.max(0, item.qtd - q * (item.capsulas || 1));
    }
  });
  dados.pedidoNum++;
  salvar();
  carrinho = {};
  $("#overlay-pedido").hidden = true;
  $("#overlay-feito").hidden = false;
  renderCardapio();
  renderEstoque();
  atualizarFab();
});

$("#btn-novo").addEventListener("click", () => { $("#overlay-feito").hidden = true; });

/* ====== NAVEGAÇÃO ====== */
$$(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.view;
    $$(".nav-btn").forEach((b) => b.classList.toggle("active", b === btn));
    $$(".view").forEach((view) => view.classList.remove("active"));
    $("#view-" + v).classList.add("active");
    $("#subtitle").textContent = v === "estoque" ? "Gerencie suas cápsulas 📦" : "Cardápio";
    atualizarFab();
    window.scrollTo(0, 0);
  });
});

/* ====== BACKUP ====== */
$("#btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "cafeteria-da-luna-backup.json";
  a.click();
});
$("#btn-import").addEventListener("click", () => $("#file-import").click());
$("#file-import").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      dados = JSON.parse(reader.result);
      salvar(); renderEstoque(); renderCardapio();
      alert("Backup restaurado! ✅");
    } catch { alert("Arquivo inválido 😕"); }
  };
  reader.readAsText(file);
});
$("#btn-reset").addEventListener("click", () => {
  if (!confirm("Voltar tudo ao padrão? As alterações serão perdidas.")) return;
  dados = dadosPadrao();
  carrinho = {};
  salvar(); renderEstoque(); renderCardapio(); atualizarFab();
});

/* ====== INIT ====== */
renderCardapio();
renderEstoque();
atualizarFab();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
