/* Laboratorio blockchain: navigazione e i sette esercizi. */
(function () {
  "use strict";
  var C = window.LAB_CONFIG;
  var $ = function (id) {
    return document.getElementById(id);
  };
  var NICK_KEY = "hk-lab-nick";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  // I nodi restituiscono le date in UTC senza la "Z" finale.
  function chainDate(ts) {
    return new Date(/Z$/.test(ts) ? ts : ts + "Z");
  }
  function fmt(ts) {
    return chainDate(ts).toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  function short(h) {
    return h ? h.slice(0, 10) + "…" + h.slice(-6) : "";
  }
  function store(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {
      return null;
    }
  }

  function fileHash(file) {
    return file.arrayBuffer().then(function (buf) {
      if (window.crypto && crypto.subtle) {
        return crypto.subtle.digest("SHA-256", buf).then(function (d) {
          return SHA256.hex(new Uint8Array(d));
        });
      }
      return SHA256.hex(SHA256.bytes(new Uint8Array(buf)));
    });
  }

  function msg(el, kind, html) {
    el.className = "out " + kind;
    el.innerHTML = html;
  }
  function txLink(r) {
    return (
      '<a href="' +
      Chain.txUrl(r.id) +
      '" target="_blank" rel="noopener">Vedi la transazione sull\'explorer</a>'
    );
  }
  function fail(el) {
    return function (e) {
      msg(el, "err", esc(e.message || e));
    };
  }
  function busy(btn, on) {
    btn.disabled = on;
    btn.classList.toggle("wait", on);
  }

  // ---------- Nome del partecipante ----------
  function nick() {
    return store(NICK_KEY) || "";
  }
  function askNick() {
    return new Promise(function (resolve) {
      var wrap = document.createElement("div");
      wrap.className = "modal";
      wrap.innerHTML =
        "<form><h2>Come ti chiami?</h2><p>Il nome (o un soprannome) compare nelle tue registrazioni, che sono pubbliche.</p>" +
        '<input maxlength="24" required placeholder="es. Lucia B." value="' +
        esc(nick()) +
        '"><button class="btn">Ok</button></form>';
      document.body.appendChild(wrap);
      var input = wrap.querySelector("input");
      input.focus();
      wrap.querySelector("form").addEventListener("submit", function (e) {
        e.preventDefault();
        var v = input.value.trim().slice(0, 24);
        if (!v) return;
        store(NICK_KEY, v);
        $("who").textContent = v;
        wrap.remove();
        resolve(v);
      });
    });
  }
  function needNick() {
    return nick() ? Promise.resolve(nick()) : askNick();
  }
  $("who").addEventListener("click", askNick);
  if (nick()) $("who").textContent = nick();

  // ---------- Navigazione ----------
  var loaders = {};
  function route() {
    var v = (location.hash || "#home").slice(1) || "home";
    var found = false;
    document.querySelectorAll("[data-view]").forEach(function (s) {
      var on = s.dataset.view === v;
      s.hidden = !on;
      if (on) found = true;
    });
    if (!found) {
      location.hash = "#home";
      return;
    }
    window.scrollTo(0, 0);
    if (loaders[v]) loaders[v]();
  }
  window.addEventListener("hashchange", route);

  document.querySelectorAll(".tabs").forEach(function (tabs) {
    tabs.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-tab]");
      if (!b) return;
      tabs.querySelectorAll("button").forEach(function (x) {
        x.classList.toggle("on", x === b);
      });
      tabs.parentNode.querySelectorAll("[data-pane]").forEach(function (p) {
        p.hidden = p.dataset.pane !== b.dataset.tab;
      });
    });
  });

  if (C.demo) {
    var demo = document.createElement("p");
    demo.className = "banner own";
    demo.textContent = "Versione dimostrativa: puoi leggere e verificare, ma non scrivere. Al workshop si usa quella completa.";
    document.querySelector("main").insertBefore(demo, document.querySelector("main").firstChild);
  } else if (C.own) {
    var own = document.createElement("p");
    own.className = "banner own";
    own.innerHTML = "Stai guardando il registro del contratto <b>" + esc(C.contract) + "</b>: puoi verificare file e attestati. Per scrivere su questo contratto si usa cleos. <a href=\"" + location.pathname + "\">Torna al registro dell'aula</a>";
    document.querySelector("main").insertBefore(own, document.querySelector("main").firstChild);
  } else if (!Chain.ready()) {
    var warn = document.createElement("p");
    warn.className = "banner";
    warn.textContent =
      "Modalità dimostrazione: gli esercizi 1, 2 e 7 funzionano; per scrivere in blockchain il relatore deve completare la configurazione.";
    document.querySelector("[data-view=home]").appendChild(warn);
  }

  // ---------- 1. Impronta ----------
  var lastHash = "";
  function updImpronta() {
    var h = SHA256.text($("imp-text").value);
    var html = "",
      changed = 0;
    for (var i = 0; i < h.length; i++) {
      var diff = lastHash && lastHash[i] !== h[i];
      if (diff) changed++;
      html += diff ? "<mark>" + h[i] + "</mark>" : h[i];
    }
    $("imp-hash").innerHTML = html;
    if (lastHash && lastHash !== h)
      $("imp-diff").textContent = changed + " caratteri su 64 sono cambiati.";
    else if (lastHash)
      $("imp-diff").textContent = "Impronta identica: il testo è lo stesso.";
    lastHash = h;
  }
  $("imp-text").addEventListener("input", updImpronta);
  $("imp-file").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    $("imp-file-hash").textContent = "calcolo…";
    fileHash(f).then(function (h) {
      $("imp-file-hash").textContent = h;
    });
  });
  updImpronta();

  // ---------- 2. Catena ----------
  var DIFF = "000";
  var GENESIS = "0".repeat(64);
  var INITIAL = [
    "Apertura del registro",
    "Diploma n. 12 a Lucia Bianchi",
    "Lotto OL-2025: 550 kg di olive",
    "Gara 7: arrivata la busta di Rossi Srl",
  ];
  var blocks = [],
    original = "";
  function blockHash(b) {
    return SHA256.text(b.n + "|" + b.nonce + "|" + b.data + "|" + b.prev);
  }
  function mine(b) {
    b.nonce = 0;
    for (;;) {
      b.hash = blockHash(b);
      if (b.hash.indexOf(DIFF) === 0) return b;
      b.nonce++;
    }
  }
  function relink(from) {
    for (var i = from; i < blocks.length; i++) {
      blocks[i].prev = i ? blocks[i - 1].hash : GENESIS;
      blocks[i].hash = blockHash(blocks[i]);
    }
  }
  function resetChain() {
    blocks = INITIAL.map(function (d, i) {
      return { n: i + 1, data: d, nonce: 0, prev: "", hash: "" };
    });
    blocks.forEach(function (b, i) {
      b.prev = i ? blocks[i - 1].hash : GENESIS;
      mine(b);
    });
    original = blocks[blocks.length - 1].hash;
    drawChain();
  }
  function drawChain() {
    $("chain").innerHTML = blocks
      .map(function (b, i) {
        var ok =
          b.hash.indexOf(DIFF) === 0 &&
          b.prev === (i ? blocks[i - 1].hash : GENESIS);
        return (
          '<div class="block ' +
          (ok ? "ok" : "bad") +
          '">' +
          '<div class="bh"><b>Blocco ' +
          b.n +
          "</b><span>" +
          (ok ? "valido" : "NON valido") +
          "</span></div>" +
          '<label>Dati<input data-i="' +
          i +
          '" value="' +
          esc(b.data) +
          '"></label>' +
          '<div class="kv"><span>Nonce</span><code>' +
          b.nonce +
          "</code></div>" +
          '<div class="kv"><span>Precedente</span><code>' +
          short(b.prev) +
          "</code></div>" +
          '<div class="kv"><span>Impronta</span><code>' +
          short(b.hash) +
          "</code></div>" +
          (ok
            ? ""
            : '<button type="button" class="btn small" data-mine="' +
              i +
              '">Ricalcola (mina)</button>') +
          "</div>"
        );
      })
      .join('<div class="link" aria-hidden="true"></div>');
    var mineLast = blocks[blocks.length - 1].hash;
    var agree = mineLast === original;
    $("nodes").innerHTML =
      node("La tua copia", mineLast, true) +
      node("Nodo di Lucia", original, agree) +
      node("Nodo di Marco", original, agree) +
      '<p class="verdict ' +
      (agree ? "ok" : "bad") +
      '">' +
      (agree
        ? "Tutte e tre le copie coincidono: la rete è d'accordo."
        : "La tua copia è diversa dalle altre due. La rete tiene la versione della maggioranza: la tua modifica viene scartata.") +
      "</p>";
  }
  function node(name, h, same) {
    return (
      '<div class="node ' +
      (same ? "ok" : "bad") +
      '"><b>' +
      name +
      "</b><code>" +
      short(h) +
      "</code></div>"
    );
  }
  $("chain").addEventListener("input", function (e) {
    var i = +e.target.dataset.i;
    blocks[i].data = e.target.value;
    relink(i);
    var focus = e.target.selectionStart;
    drawChain();
    var input = $("chain").querySelector('input[data-i="' + i + '"]');
    input.focus();
    input.setSelectionRange(focus, focus);
  });
  $("chain").addEventListener("click", function (e) {
    var b = e.target.closest("[data-mine]");
    if (!b) return;
    var i = +b.dataset.mine;
    b.textContent = "Sto cercando il nonce…";
    setTimeout(function () {
      mine(blocks[i]);
      relink(i + 1);
      drawChain();
    }, 30);
  });
  $("chain-reset").addEventListener("click", resetChain);
  resetChain();

  // ---------- 3. Notarizza ----------
  var notHash = "";
  $("not-file").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    $("not-hash").textContent = "calcolo…";
    if (!$("not-label").value) $("not-label").value = f.name.slice(0, 80);
    fileHash(f).then(function (h) {
      notHash = h;
      $("not-hash").textContent = h;
      $("not-send").disabled = false;
    });
  });
  $("not-send").addEventListener("click", function () {
    var btn = this,
      out = $("not-out");
    needNick()
      .then(function (n) {
        busy(btn, true);
        msg(out, "info", "Controllo il registro…");
        // Il contratto rifiuterebbe comunque un doppione: controllare prima dà subito la data della prima registrazione.
        return Chain.rows("docs").then(function (rs) {
          var prev = rs.filter(function (x) {
            return x.hash === notHash;
          })[0];
          if (prev) return { dup: prev };
          msg(out, "info", "Invio in corso…");
          return Chain.push("notarize", {
            by: C.aula,
            hash: notHash,
            nick: n,
            label: $("not-label").value.trim(),
          });
        });
      })
      .then(function (r) {
        if (r.dup) {
          msg(
            out,
            "err",
            "<b>Questo file è già registrato</b> dal " +
              fmt(r.dup.ts) +
              " (da " +
              esc(r.dup.nick) +
              "). Chi lo ha registrato per primo ha la prova: un secondo non serve, e il contratto lo rifiuterebbe."
          );
          return;
        }
        msg(
          out,
          "ok",
          "<b>Fatto.</b> Da questo momento chiunque può verificare che il file esisteva oggi. " +
            txLink(r)
        );
        loaders.notarizza();
      })
      .catch(fail(out))
      .then(function () {
        busy(btn, false);
      });
  });
  $("ver-file").addEventListener("change", function (e) {
    var f = e.target.files[0],
      out = $("ver-out");
    if (!f) return;
    e.target.value = "";
    msg(out, "info", "Calcolo l'impronta e cerco nel registro…");
    fileHash(f)
      .then(function (h) {
        return Chain.rows("docs").then(function (rs) {
          var r = rs.filter(function (x) {
            return x.hash === h;
          })[0];
          if (r)
            msg(
              out,
              "ok",
              "<b>Trovato.</b> Registrato il " +
                fmt(r.ts) +
                " da " +
                esc(r.nick) +
                (r.label ? " · «" + esc(r.label) + "»" : "") +
                ".<br><code>" +
                h +
                "</code>"
            );
          else
            msg(
              out,
              "err",
              "<b>Non trovato.</b> Nessuno ha registrato questo file, oppure il file è stato modificato anche solo di un byte.<br><code>" +
                h +
                "</code>"
            );
        });
      })
      .catch(fail(out));
  });
  loaders.notarizza = function () {
    Chain.rows("docs")
      .then(function (rs) {
        $("not-list").innerHTML =
          rs
            .slice(-10)
            .reverse()
            .map(function (r) {
              return (
                "<li><b>" +
                esc(r.nick) +
                "</b> " +
                esc(r.label || "senza descrizione") +
                "<small>" +
                fmt(r.ts) +
                " · <code>" +
                short(r.hash) +
                "</code></small></li>"
              );
            })
            .join("") || "<li>Ancora nessuna registrazione.</li>";
      })
      .catch(function () {
        $("not-list").innerHTML = "<li>Registro non raggiungibile.</li>";
      });
  };

  // ---------- 4. Certificati ----------
  function issuersMap() {
    return Chain.rows("issuers").then(function (rs) {
      var m = {};
      rs.forEach(function (r) {
        m[r.issuer] = r.org;
      });
      return m;
    }).catch(function () {
      // Un contratto senza tabella degli enti: si mostra il nome dell'account.
      return {};
    });
  }
  $("cert-file").addEventListener("change", function (e) {
    var f = e.target.files[0],
      out = $("cert-out");
    if (!f) return;
    e.target.value = "";
    msg(out, "info", "Verifico…");
    Promise.all([fileHash(f), Chain.rows("certs"), issuersMap()])
      .then(function (res) {
        var h = res[0],
          c = res[1].filter(function (x) {
            return x.hash === res[0];
          })[0],
          orgs = res[2];
        if (!c) {
          msg(
            out,
            "err",
            "<b>Attestato non riconosciuto.</b> Non è stato emesso da un ente del registro, oppure è stato modificato.<br><code>" +
              h +
              "</code>"
          );
          return;
        }
        var who = esc(orgs[c.issuer] || c.issuer);
        if (+c.revoked)
          msg(
            out,
            "err",
            "<b>Attestato revocato.</b> Emesso da " +
              who +
              " a " +
              esc(c.holder) +
              " per «" +
              esc(c.course) +
              "», poi revocato: " +
              esc(c.reason) +
              "."
          );
        else
          msg(
            out,
            "ok",
            "<b>Attestato valido.</b> Emesso da " +
              who +
              " a <b>" +
              esc(c.holder) +
              "</b> per «" +
              esc(c.course) +
              "» il " +
              fmt(c.ts) +
              "."
          );
      })
      .catch(fail(out));
  });
  loaders.certificati = function () {
    Promise.all([Chain.rows("certs"), issuersMap()])
      .then(function (res) {
        $("cert-list").innerHTML =
          res[0]
            .slice()
            .reverse()
            .map(function (c) {
              return (
                '<li class="' +
                (+c.revoked ? "revoked" : "") +
                '"><b>' +
                esc(c.holder) +
                "</b> " +
                esc(c.course) +
                "<small>" +
                esc(res[1][c.issuer] || c.issuer) +
                " · " +
                fmt(c.ts) +
                (+c.revoked ? " · REVOCATO" : "") +
                "</small></li>"
              );
            })
            .join("") || "<li>Nessun attestato emesso.</li>";
      })
      .catch(function () {
        $("cert-list").innerHTML = "<li>Registro non raggiungibile.</li>";
      });
  };

  // ---------- 5. Filiera ----------
  var allSteps = [];
  function drawLot() {
    var lot = $("lot-pick").value;
    $("lot-steps").innerHTML =
      allSteps
        .filter(function (s) {
          return s.lot === lot;
        })
        .map(function (s) {
          return (
            '<li class="' +
            (s.stage === "Correzione" ? "fix" : "") +
            '"><b>' +
            esc(s.stage) +
            "</b><p>" +
            esc(s.data) +
            "</p><small>" +
            esc(s.nick) +
            " · " +
            fmt(s.ts) +
            "</small></li>"
          );
        })
        .join("") || "<li>Nessuna tappa per questo lotto.</li>";
  }
  loaders.filiera = function () {
    Chain.rows("steps")
      .then(function (rs) {
        allSteps = rs;
        var lots = [];
        rs.forEach(function (s) {
          if (lots.indexOf(s.lot) < 0) lots.push(s.lot);
        });
        if (!lots.length) lots = ["OL-2025"];
        var cur = $("lot-pick").value;
        $("lot-pick").innerHTML = lots
          .map(function (l) {
            return "<option>" + esc(l) + "</option>";
          })
          .join("");
        if (cur && lots.indexOf(cur) >= 0) $("lot-pick").value = cur;
        drawLot();
      })
      .catch(function () {
        $("lot-steps").innerHTML = "<li>Registro non raggiungibile.</li>";
      });
  };
  $("lot-pick").addEventListener("change", drawLot);
  $("step-send").addEventListener("click", function () {
    var btn = this,
      out = $("step-out"),
      data = $("step-data").value.trim();
    if (!data) {
      msg(out, "err", "Scrivi i dati della tappa.");
      return;
    }
    needNick()
      .then(function (n) {
        busy(btn, true);
        msg(out, "info", "Invio in corso…");
        return Chain.push("addstep", {
          by: C.aula,
          lot: $("lot-pick").value || "OL-2025",
          stage: $("step-stage").value,
          data: data,
          nick: n,
        });
      })
      .then(function (r) {
        msg(
          out,
          "ok",
          "<b>Tappa scritta.</b> Da ora non si può più cancellare. " + txLink(r)
        );
        $("step-data").value = "";
        loaders.filiera();
      })
      .catch(fail(out))
      .then(function () {
        busy(btn, false);
      });
  });

  // ---------- 6. Gara ----------
  var tender = null,
    bids = [],
    tick = 0;
  var WORDS = [
    "olivo",
    "trullo",
    "faro",
    "vela",
    "grano",
    "pietra",
    "basilico",
    "levante",
    "orecchietta",
    "murgia",
    "scoglio",
    "taralla",
  ];
  function salt() {
    var a = new Uint32Array(3);
    crypto.getRandomValues(a);
    return (
      WORDS[a[0] % WORDS.length] +
      "-" +
      WORDS[a[1] % WORDS.length] +
      "-" +
      (a[2] % 1000)
    );
  }
  function bidKey(n) {
    return "hk-bid-" + C.contract + "-" + tender.id + "-" + n;
  }
  function phase() {
    if (!tender) return "none";
    if (+tender.awarded) return "awarded";
    var now = Date.now();
    if (now < chainDate(tender.bid_end)) return "bid";
    if (now < chainDate(tender.reveal_end)) return "reveal";
    return "toaward";
  }
  function left(ts) {
    var s = Math.max(0, Math.round((chainDate(ts) - Date.now()) / 1000));
    return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }
  function drawGara() {
    var box = $("gara-box"),
      p = phase(),
      n = nick();
    var mine = n && tender ? JSON.parse(store(bidKey(n)) || "null") : null;
    var already =
      n &&
      bids.some(function (b) {
        return b.nick === n;
      });
    var head = tender
      ? '<div class="tender"><b>Gara ' +
        tender.id +
        ":</b> " +
        esc(tender.title) +
        "</div>"
      : "";
    if (p === "none") {
      box.innerHTML =
        '<p class="out info">Nessuna gara aperta: aspetta che il relatore la bandisca.</p>';
      return;
    }
    if (p === "bid") {
      box.innerHTML =
        head +
        '<p class="clock">Offerte aperte ancora per <b>' +
        left(tender.bid_end) +
        "</b></p>" +
        (already
          ? '<p class="out ok">La tua busta chiusa è in gara.' +
            (mine
              ? " Importo: " +
                mine.amount +
                " € · parola segreta: <b>" +
                esc(mine.salt) +
                "</b> (salvata su questo telefono)."
              : "") +
            "</p>"
          : '<label class="field">La tua offerta in euro (vince la più bassa)<input id="bid-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="es. 48000"></label>' +
            '<button type="button" class="btn" id="bid-send">Chiudi la busta e invia</button>') +
        '<div id="gara-out" class="out"></div>';
    } else if (p === "reveal") {
      box.innerHTML =
        head +
        '<p class="clock">Apertura buste: hai ancora <b>' +
        left(tender.reveal_end) +
        "</b></p>" +
        (mine &&
        !bids.some(function (b) {
          return b.nick === n && +b.revealed;
        })
          ? '<button type="button" class="btn" id="bid-reveal">Apri la mia busta (' +
            mine.amount +
            " €)</button>"
          : '<p class="out info">' +
            (already
              ? "Busta già aperta, oppure la parola segreta non è su questo telefono."
              : "Non hai una busta in questa gara.") +
            "</p>") +
        '<div id="gara-out" class="out"></div>';
    } else if (p === "toaward") {
      box.innerHTML =
        head +
        '<p class="clock">Tempo scaduto. Chiunque può chiedere al contratto di aggiudicare.</p><button type="button" class="btn" id="bid-award">Aggiudica la gara</button><div id="gara-out" class="out"></div>';
    } else {
      box.innerHTML =
        head +
        '<p class="out ok winner">Vince <b>' +
        esc(tender.winner) +
        "</b>" +
        (+tender.amount
          ? " con " + (+tender.amount).toLocaleString("it-IT") + " €"
          : "") +
        ". Deciso dal contratto, non da una persona.</p>";
    }
  }
  function drawBids() {
    $("bid-list").innerHTML =
      bids
        .map(function (b) {
          return (
            "<li><b>" +
            esc(b.nick) +
            "</b> " +
            (+b.revealed
              ? (+b.amount).toLocaleString("it-IT") + " €"
              : "busta chiusa") +
            "<small><code>" +
            short(b.sealed) +
            "</code></small></li>"
          );
        })
        .join("") || "<li>Ancora nessuna busta.</li>";
  }
  loaders.gara = function () {
    Promise.all([Chain.rows("tenders"), Chain.rows("bids")])
      .then(function (res) {
        tender = res[0].length ? res[0][res[0].length - 1] : null;
        bids = tender
          ? res[1].filter(function (b) {
              return b.tender === tender.id;
            })
          : [];
        drawGara();
        drawBids();
      })
      .catch(function () {
        $("gara-box").innerHTML =
          '<p class="out err">Registro non raggiungibile.</p>';
      });
    clearInterval(tick);
    var last = phase();
    tick = setInterval(function () {
      if (location.hash !== "#gara") {
        clearInterval(tick);
        return;
      }
      var p = phase();
      var typing =
        document.activeElement && document.activeElement.id === "bid-amount";
      if (p !== last) {
        last = p;
        loaders.gara();
      } else if (!typing) drawGara();
    }, 1000);
  };
  $("gara-box").addEventListener("click", function (e) {
    var out = $("gara-out");
    if (e.target.id === "bid-send") {
      var amount = Math.floor(+$("bid-amount").value);
      if (!(amount > 0)) {
        msg(out, "err", "Scrivi un importo intero in euro.");
        return;
      }
      var btn = e.target;
      needNick()
        .then(function (n) {
          var s = salt();
          var sealed = SHA256.text(amount + ":" + s + ":" + n);
          store(bidKey(n), JSON.stringify({ amount: amount, salt: s }));
          busy(btn, true);
          msg(
            out,
            "info",
            "Busta chiusa: <code>" + short(sealed) + "</code>. Invio…"
          );
          return Chain.push("bid", {
            by: C.aula,
            tender: tender.id,
            nick: n,
            sealed: sealed,
          });
        })
        .then(function () {
          loaders.gara();
        })
        .catch(function (err) {
          busy(btn, false);
          fail(out)(err);
        });
    } else if (e.target.id === "bid-reveal") {
      var n = nick(),
        mine = JSON.parse(store(bidKey(n)) || "null");
      busy(e.target, true);
      Chain.push("reveal", {
        by: C.aula,
        tender: tender.id,
        nick: n,
        amount: mine.amount,
        salt: mine.salt,
      })
        .then(function () {
          loaders.gara();
        })
        .catch(fail(out));
    } else if (e.target.id === "bid-award") {
      busy(e.target, true);
      Chain.push("award", { by: C.aula, tender: tender.id })
        .then(function () {
          loaders.gara();
        })
        .catch(fail(out));
    }
  });

  // ---------- 7. Serve una blockchain? ----------
  var Q = {
    start: {
      q: "Dovete conservare dei dati o uno storico di operazioni?",
      yes: "multi",
      no: "R-nodata",
    },
    multi: {
      q: "Ci sono più soggetti diversi (uffici, aziende, persone) che devono scrivere in quel registro?",
      yes: "trust",
      no: "R-db",
    },
    trust: {
      q: "Esiste qualcuno di cui tutti si fidano, sempre disponibile, che può tenere il registro per tutti?",
      yes: "R-trusted",
      no: "oracle",
    },
    oracle: {
      q: "I dati nascono digitali (un file, un pagamento, una firma)? Rispondete no se qualcuno deve dichiarare cosa succede nel mondo fisico.",
      yes: "known",
      no: "known",
      flag: "no",
    },
    known: {
      q: "Chi scrive è noto e autorizzato (aziende di un consorzio, enti, uffici)?",
      yes: "public",
      no: "R-public",
    },
    public: {
      q: "Chiunque, anche fuori dal gruppo, deve poter verificare i dati senza chiedere il permesso a nessuno?",
      yes: "R-public",
      no: "R-permissioned",
    },
  };
  var R = {
    "R-nodata": [
      "Non serve",
      "Senza dati da conservare non c'è un registro da proteggere.",
    ],
    "R-db": [
      "Basta un database",
      "Se scrive un solo soggetto, la blockchain aggiunge costi e complessità senza benefici. Al massimo, per avere una data certa, si può notarizzare ogni tanto l'impronta del database.",
    ],
    "R-trusted": [
      "Database gestito da chi è fidato",
      "Se c'è un soggetto di cui tutti si fidano (un ente, un notaio, un consorzio), è più semplice ed economico che tenga lui il registro. La blockchain serve proprio quando questo soggetto manca.",
    ],
    "R-permissioned": [
      "Blockchain con permessi",
      "Più soggetti noti che non vogliono dipendere da uno solo: una blockchain in cui scrivono solo i membri autorizzati (per esempio un consorzio di filiera, o EBSI per i diplomi in Europa).",
    ],
    "R-public": [
      "Blockchain pubblica",
      "Chi scrive non è noto in anticipo, oppure chiunque deve poter verificare senza chiedere permessi: è il caso tipico di una blockchain pubblica, come quella che abbiamo usato oggi.",
    ],
  };
  var path = [];
  function drawServe() {
    var node = "start",
      oracleWarn = false,
      html = "";
    path.forEach(function (a) {
      var q = Q[node];
      if (q.flag && a === q.flag) oracleWarn = true;
      html +=
        '<div class="qa done"><p>' +
        q.q +
        "</p><b>" +
        (a === "yes" ? "Sì" : "No") +
        "</b></div>";
      node = q[a];
    });
    if (R[node]) {
      var c = $("serve-case").value.trim();
      html +=
        '<div class="result"><p class="kicker">' +
        (c ? esc(c) : "Il vostro caso") +
        "</p><h2>" +
        R[node][0] +
        "</h2><p>" +
        R[node][1] +
        "</p>" +
        (oracleWarn
          ? '<p class="warn"><b>Attenzione all\'oracolo:</b> la blockchain garantisce che un dato non cambi, non che sia vero. Se qualcuno dichiara cosa succede nel mondo fisico servono controlli, sensori o firme di chi ne risponde.</p>'
          : "") +
        '<button type="button" class="btn ghost" data-serve="restart">Ricomincia</button></div>';
    } else {
      html +=
        '<div class="qa"><p>' +
        Q[node].q +
        '</p><div class="row"><button type="button" class="btn" data-serve="yes">Sì</button><button type="button" class="btn" data-serve="no">No</button></div></div>' +
        (path.length
          ? '<button type="button" class="btn ghost small" data-serve="back">Indietro</button>'
          : "");
    }
    $("serve-q").innerHTML = html;
  }
  $("serve-q").addEventListener("click", function (e) {
    var a = e.target.dataset.serve;
    if (!a) return;
    if (a === "restart") path = [];
    else if (a === "back") path.pop();
    else path.push(a);
    drawServe();
  });
  drawServe();

  // ---------- 8. Truffa o no? ----------
  // I casi vengono dagli articoli del blog di Hoken Tech (phishing, Discord, seed regalata, punycode,
  // address poisoning, offerta di lavoro su LinkedIn, paper wallet) più due situazioni legittime.
  var CASES = [
    { kind: "email", from: "Blockchain.com &lt;security@blockchain-alerts.info&gt;", head: "An application has been linked to your account",
      body: "Se non sei stato tu, proteggi subito il tuo account: clicca qui e conferma l'accesso inserendo le 12 parole del tuo wallet.",
      scam: true, why: ["Mittente: il dominio non è blockchain.com.", "Urgenza: «subito», altrimenti perdi tutto.", "Nessun servizio chiede mai le 12 parole del wallet."] },
    { kind: "chat", from: "Uniswap · Discord", head: "Messaggio privato",
      body: "🎉 Airdrop in corso! Hai diritto a 2,5 ETH. Collega MetaMask entro oggi su uniswap-claim.app per riceverli.",
      scam: true, why: ["I progetti seri non scrivono in privato su Discord.", "Regalo enorme e scadenza: leva sull'avidità e sulla fretta.", "Il sito copia la grafica di Uniswap, ma l'indirizzo è un altro."] },
    { kind: "chat", from: "crypto_mentor · Telegram", head: "Gruppo «Investiamo insieme»",
      body: "Ops, ho incollato per sbaglio le mie 12 parole: dentro ci sono 3.000 $ in USDT. Prendeteli voi, a me non servono 😅",
      scam: true, why: ["Il wallet ha i token ma non la moneta per pagare la commissione.", "Chi la invia per sbloccarli la perde subito: un programma la gira al truffatore.", "Nessuno regala 3.000 dollari a sconosciuti."] },
    { kind: "url", from: "Barra degli indirizzi", head: "xn--paypl-7ve.com/login",
      body: "Il browser mostra «paypal.com» con una lettera quasi identica. La pagina è uguale a quella vera e chiede email e password.",
      scam: true, why: ["Il prefisso xn-- indica un dominio con caratteri «speciali» (punycode).", "Una sola lettera di un altro alfabeto basta a fare un dominio diverso.", "Meglio entrare sempre dai preferiti o digitando l'indirizzo."] },
    { kind: "wallet", from: "Il tuo wallet · cronologia", head: "Devi mandare 500 USDT al tuo conto sull'exchange",
      body: "Nella cronologia trovi «0x9Fa3…C7E1», da cui ieri ti è arrivato 0 USDT. Il tuo indirizzo dell'exchange è 0x9Fa3…C7E1. Copi quello dalla cronologia?",
      scam: true, why: ["È l'«address poisoning»: un indirizzo creato apposta con inizio e fine uguali al tuo.", "La transazione da 0 serve solo a infilarlo nella tua cronologia.", "Copia l'indirizzo sempre dalla fonte (l'exchange), e controllalo tutto, non solo inizio e fine."] },
    { kind: "chat", from: "Recruiter · LinkedIn", head: "Offerta: Blockchain Lead, 400.000 $ l'anno",
      body: "Il tuo profilo è perfetto! Fai il colloquio video sul nostro sito. Se la webcam non va, incolla questo comando nel terminale per aggiornarla.",
      scam: true, why: ["Stipendio fuori mercato, azienda vera usata come esca.", "Nessun colloquio vero chiede di incollare comandi nel terminale.", "Quel comando scarica ed esegue un programma malevolo in background."] },
    { kind: "chat", from: "WhatsApp · numero sconosciuto", head: "Gruppo «Trading Elite Italia»",
      body: "Il nostro esperto garantisce il 2% al giorno, senza rischi. Oggi ultimi 5 posti: investi da 250 € sulla nostra piattaforma.",
      scam: true, why: ["Nessun investimento serio garantisce rendimenti, tanto meno il 2% al giorno.", "Posti limitati e fretta: pressione psicologica.", "Controlla se la piattaforma è autorizzata: la CONSOB pubblica avvisi e oscura i siti abusivi."] },
    { kind: "wallet", from: "Il tuo wallet · conferma", head: "Firma la transazione",
      body: "Invio di 10 EOS a lucia23.gm, memo «quota cena». Hai appena scritto tu nome, importo e memo, e Lucia te li ha confermati a voce.",
      scam: false, why: ["Hai avviato tu l'operazione, con dati che conosci.", "Destinatario confermato da un altro canale (a voce).", "Controllare comunque nome e importo prima di firmare è sempre una buona abitudine."] },
    { kind: "email", from: "Exchange &lt;noreply@exchange-che-usi.com&gt;", head: "Nuovo accesso al tuo account",
      body: "Accesso da Chrome su Mac, Bari, alle 9:42. Se non sei stato tu, apri l'app e cambia la password. Non ti chiederemo mai password o parole segrete via email.",
      scam: false, why: ["Nessun link da cliccare: ti dice di aprire l'app da solo.", "Non chiede né password né seed.", "Se eri tu (ora e città tornano), non devi fare niente."] },
    { kind: "chat", from: "Stand alla fiera", head: "Regalo per i visitatori",
      body: "Ecco un paper wallet già stampato, con il QR per ricevere e la chiave privata sotto il gratta-e-vinci: caricaci pure i tuoi risparmi.",
      scam: true, why: ["Chi ha generato il paper wallet può conoscere la chiave privata.", "Appena ci carichi qualcosa, può svuotarlo.", "Un wallet si crea sempre da soli, su un dispositivo fidato."] }
  ];
  var tIdx = 0, tScore = 0, tAnswered = false;
  function drawTruffa() {
    var box = $("truffa-box");
    if (tIdx >= CASES.length) {
      box.innerHTML = '<div class="result"><p class="kicker">Risultato</p><h2>' + tScore + " su " + CASES.length + "</h2><p>" +
        (tScore >= 9 ? "Ottimo: difficile fregarti." : tScore >= 6 ? "Bene, ma qualche trappola ti è sfuggita: rileggi i segnali." : "Attenzione: le truffe sono fatte per sembrare vere. Riprova con calma.") +
        '</p><p class="warn">La regola d\'oro: nessuno, mai, ha bisogno delle tue 12 o 24 parole.</p><button type="button" class="btn ghost" data-tq="restart">Ricomincia</button></div>';
      return;
    }
    var c = CASES[tIdx];
    var icon = { email: "✉️", chat: "💬", url: "🌐", wallet: "👛" }[c.kind];
    var html = '<p class="note">Caso ' + (tIdx + 1) + " di " + CASES.length + " · punti: " + tScore + "</p>" +
      '<div class="mock ' + c.kind + '"><div class="mock-h"><span>' + icon + "</span><b>" + c.from + "</b></div>" +
      '<div class="mock-t">' + esc(c.head) + '</div><p>' + esc(c.body) + "</p></div>";
    if (!tAnswered) {
      html += '<div class="row"><button type="button" class="btn bad" data-tq="scam">Truffa</button><button type="button" class="btn good" data-tq="ok">Tutto in regola</button></div>';
    } else {
      html += '<div class="out ' + (tAnswered === "right" ? "ok" : "err") + '"><b>' + (tAnswered === "right" ? "Giusto." : "Sbagliato.") + "</b> " +
        (c.scam ? "È una truffa." : "È legittimo.") + '<ul class="why">' + c.why.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul></div>" +
        '<button type="button" class="btn" data-tq="next">' + (tIdx + 1 < CASES.length ? "Prossimo caso" : "Vedi il risultato") + "</button>";
    }
    box.innerHTML = html;
  }
  $("truffa-box").addEventListener("click", function (e) {
    var a = e.target.dataset.tq;
    if (!a) return;
    if (a === "restart") { tIdx = 0; tScore = 0; tAnswered = false; }
    else if (a === "next") { tIdx++; tAnswered = false; }
    else if (!tAnswered) {
      var right = (a === "scam") === CASES[tIdx].scam;
      if (right) tScore++;
      tAnswered = right ? "right" : "wrong";
    }
    drawTruffa();
  });
  drawTruffa();

  // ---------- 9. Galleria NFT ----------
  // Legge il contratto galleria (in modalità ?contratto= quello del partecipante) e confronta l'impronta
  // dell'immagine scelta con quelle registrate negli NFT.
  function galleryCode() { return C.own ? C.contract : C.galleria; }
  function galleryData() {
    return Promise.all([Chain.rows("nfts", 0, galleryCode()), Chain.rows("history", 0, galleryCode())]);
  }
  function story(hist, id) {
    return hist.filter(function (h) { return h.nft_id === id; }).map(function (h) {
      return "<li><b>" + esc(h.memo || "Passaggio") + "</b> · " + esc(h.from) + " → " + esc(h.to) + "<small>" + fmt(h.ts) + "</small></li>";
    }).join("");
  }
  $("nft-file").addEventListener("change", function (e) {
    var f = e.target.files[0], out = $("nft-out");
    if (!f) return;
    e.target.value = "";
    if (!galleryCode()) { msg(out, "err", "La galleria non è configurata."); return; }
    msg(out, "info", "Calcolo l'impronta e cerco nella galleria…");
    Promise.all([fileHash(f), galleryData()]).then(function (res) {
      var h = res[0], nfts = res[1][0], hist = res[1][1];
      var n = nfts.filter(function (x) { return x.hash === h; })[0];
      if (!n) {
        msg(out, "err", "<b>Non è un'opera della galleria.</b> Forse è una copia, o è stata ritoccata anche di poco: l'impronta non corrisponde a nessun NFT.<br><code>" + h + "</code>");
        return;
      }
      msg(out, "ok", "<b>Originale.</b> «" + esc(n.title) + "» di " + esc(n.artist) + ", NFT n. " + n.id + ".<br>Proprietario oggi: <b>" + esc(n.owner) + "</b>" +
        '<ol class="list story">' + story(hist, n.id) + "</ol>");
    }).catch(fail(out));
  });
  loaders.galleria = function () {
    if (!galleryCode()) { $("nft-list").innerHTML = "<p>La galleria non è configurata.</p>"; return; }
    galleryData().then(function (res) {
      $("nft-list").innerHTML = res[0].map(function (n) {
        return '<div class="nft"><b>' + esc(n.title) + "</b><span>" + esc(n.artist) + "</span><small>NFT n. " + n.id + " · di " + esc(n.owner) + "</small></div>";
      }).join("") || "<p>La galleria è ancora vuota.</p>";
    }).catch(function () { $("nft-list").innerHTML = "<p>Galleria non raggiungibile.</p>"; });
  };

  // ---------- 10. Caccia al tesoro ----------
  // Scrive sul contratto della caccia (in modalità ?contratto= legge quello del partecipante).
  var TEAM_KEY = "hk-lab-team";
  function treasureCode() { return C.own ? C.contract : C.tesoro; }
  function rank(clues, finds) {
    var teams = {};
    finds.forEach(function (f) {
      var t = teams[f.team] || (teams[f.team] = { team: f.team, points: 0, found: 0, first: 0 });
      t.points += +f.points; t.found++; if (+f.first) t.first++;
    });
    return Object.keys(teams).map(function (k) { return teams[k]; }).sort(function (a, b) { return b.points - a.points || b.first - a.first; });
  }
  loaders.tesoro = function () {
    var code = treasureCode();
    if (!code) { $("tesoro-rank").innerHTML = "<li>La caccia non è configurata.</li>"; return; }
    if (!$("team-name").value) $("team-name").value = store(TEAM_KEY) || nick();
    var pre = new URLSearchParams(location.search).get("codice");
    if (pre && !$("team-code").value) $("team-code").value = pre;
    Promise.all([Chain.rows("clues", 0, code), Chain.rows("finds", 0, code)]).then(function (res) {
      var clues = res[0], finds = res[1];
      var foundIds = {};
      finds.forEach(function (f) { foundIds[f.clue_id] = true; });
      $("tesoro-stato").textContent = "Codici nascosti: " + clues.length + " · già trovati da qualcuno: " + Object.keys(foundIds).length;
      $("tesoro-rank").innerHTML = rank(clues, finds).map(function (t) {
        return "<li><b>" + esc(t.team) + "</b><span>" + t.points + " punti</span><small>" + t.found + (t.found === 1 ? " codice, " : " codici, ") + t.first + " per primi</small></li>";
      }).join("");
      if (!finds.length) $("tesoro-stato").textContent += " · nessun codice trovato, per ora";
    }).catch(function () { $("tesoro-rank").innerHTML = "<li>Caccia non raggiungibile.</li>"; });
  };
  $("team-send").addEventListener("click", function () {
    var btn = this, out = $("team-out");
    var team = $("team-name").value.trim().slice(0, 24), codeTxt = $("team-code").value.trim();
    if (!team) { msg(out, "err", "Scrivete il nome della squadra."); return; }
    if (codeTxt.length < 4) { msg(out, "err", "Scrivete il codice trovato sul cartoncino."); return; }
    store(TEAM_KEY, team);
    busy(btn, true);
    msg(out, "info", "Il contratto controlla il codice…");
    var before;
    Chain.rows("finds", 0, treasureCode()).then(function (rs) {
      before = rs.length;
      return Chain.push("claim", { by: C.aula, team: team, code: codeTxt }, { contract: treasureCode() });
    }).then(function (r) {
      return Chain.rows("finds", 0, treasureCode()).then(function (rs) {
        var mine = rs.filter(function (f) { return f.team === team; }).slice(-1)[0];
        var pts = mine ? +mine.points : 0;
        msg(out, "ok", "<b>Codice giusto!</b> " + (mine && +mine.first ? "Siete i primi: <b>+" + pts + " punti</b>." : "Qualcuno l'aveva già trovato: <b>+1 punto</b>.") + " " + txLink(r));
        $("team-code").value = "";
        loaders.tesoro();
      });
    }).catch(fail(out)).then(function () { busy(btn, false); });
  });

  route();
})();
