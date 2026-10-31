/* Laboratorio blockchain: navigazione e i dieci esercizi. Le stringhe sono in italiano e inglese: L(it, en) da i18n.js. */
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
    return chainDate(ts).toLocaleString(L("it-IT", "en-GB"), {
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
      '" target="_blank" rel="noopener">' + L("Vedi la transazione sull'explorer", "See the transaction on the explorer") + "</a>"
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
        "<form><h2>" + L("Come ti chiami?", "What's your name?") + "</h2><p>" +
        L("Il nome (o un soprannome) compare nelle tue registrazioni, che sono pubbliche.", "Your name (or a nickname) appears on your records, which are public.") +
        "</p>" +
        '<input maxlength="24" required placeholder="' + L("es.", "e.g.") + ' Lucia B." value="' +
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
    // Nella demo non si scrive: niente nome da chiedere, Chain.push risponde con il messaggio della demo.
    if (C.demo) return Promise.resolve(nick() || "demo");
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
    demo.textContent = L("Versione dimostrativa: puoi leggere e verificare, ma non scrivere. Al workshop si usa quella completa.", "Demo version: you can read and check, but not write. The workshop uses the full one.");
    document.querySelector("main").insertBefore(demo, document.querySelector("main").firstChild);
  } else if (C.own) {
    var own = document.createElement("p");
    own.className = "banner own";
    own.innerHTML = L("Stai guardando il registro del contratto <b>", "You are looking at the register of the contract <b>") + esc(C.contract) + L("</b>: puoi verificare file e attestati. Per scrivere su questo contratto si usa cleos. ", "</b>: you can check files and certificates. To write to this contract, use cleos. ") + "<a href=\"" + location.pathname + "\">" + L("Torna al registro dell'aula", "Back to the classroom register") + "</a>";
    document.querySelector("main").insertBefore(own, document.querySelector("main").firstChild);
  } else if (!Chain.ready()) {
    var warn = document.createElement("p");
    warn.className = "banner";
    warn.textContent =
      L("Modalità dimostrazione: gli esercizi 1, 2 e 7 funzionano; per scrivere in blockchain il relatore deve completare la configurazione.", "Demo mode: exercises 1, 2 and 7 work; to write to the blockchain the speaker has to finish the setup.");
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
      $("imp-diff").textContent = changed + L(" caratteri su 64 sono cambiati.", " of 64 characters have changed.");
    else if (lastHash)
      $("imp-diff").textContent = L("Impronta identica: il testo è lo stesso.", "Same fingerprint: the text is the same.");
    lastHash = h;
  }
  $("imp-text").addEventListener("input", updImpronta);
  $("imp-file").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    $("imp-file-hash").textContent = L("calcolo…", "calculating…");
    fileHash(f).then(function (h) {
      $("imp-file-hash").textContent = h;
    });
  });
  updImpronta();

  // ---------- 2. Catena ----------
  var DIFF = "000";
  var GENESIS = "0".repeat(64);
  var INITIAL = [
    L("Apertura del registro", "Register opened"),
    L("Diploma n. 12 a Lucia Bianchi", "Diploma no. 12 to Lucia Bianchi"),
    L("Lotto OL-2025: 550 kg di olive", "Batch OL-2025: 550 kg of olives"),
    L("Gara 7: arrivata la busta di Rossi Srl", "Tender 7: Rossi Srl's envelope received"),
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
          '<div class="bh"><b>' + L("Blocco ", "Block ") +
          b.n +
          "</b><span>" +
          (ok ? L("valido", "valid") : L("NON valido", "NOT valid")) +
          "</span></div>" +
          "<label>" + L("Dati", "Data") + '<input data-i="' +
          i +
          '" value="' +
          esc(b.data) +
          '"></label>' +
          '<div class="kv"><span>Nonce</span><code>' +
          b.nonce +
          "</code></div>" +
          '<div class="kv"><span>' + L("Precedente", "Previous") + "</span><code>" +
          short(b.prev) +
          "</code></div>" +
          '<div class="kv"><span>' + L("Impronta", "Fingerprint") + "</span><code>" +
          short(b.hash) +
          "</code></div>" +
          (ok
            ? ""
            : '<button type="button" class="btn small" data-mine="' +
              i +
              '">' + L("Ricalcola (mina)", "Recalculate (mine)") + "</button>") +
          "</div>"
        );
      })
      .join('<div class="link" aria-hidden="true"></div>');
    var mineLast = blocks[blocks.length - 1].hash;
    var agree = mineLast === original;
    $("nodes").innerHTML =
      node(L("La tua copia", "Your copy"), mineLast, true) +
      node(L("Nodo di Lucia", "Lucia's node"), original, agree) +
      node(L("Nodo di Marco", "Marco's node"), original, agree) +
      '<p class="verdict ' +
      (agree ? "ok" : "bad") +
      '">' +
      (agree
        ? L("Tutte e tre le copie coincidono: la rete è d'accordo.", "All three copies match: the network agrees.")
        : L("La tua copia è diversa dalle altre due. La rete tiene la versione della maggioranza: la tua modifica viene scartata.", "Your copy is different from the other two. The network keeps the majority's version: your change is thrown out.")) +
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
    b.textContent = L("Sto cercando il nonce…", "Looking for the nonce…");
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
    $("not-hash").textContent = L("calcolo…", "calculating…");
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
        msg(out, "info", L("Controllo il registro…", "Checking the register…"));
        // Il contratto rifiuterebbe comunque un doppione: controllare prima dà subito la data della prima registrazione.
        return Chain.rows("docs").then(function (rs) {
          var prev = rs.filter(function (x) {
            return x.hash === notHash;
          })[0];
          if (prev) return { dup: prev };
          msg(out, "info", L("Invio in corso…", "Sending…"));
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
            L("<b>Questo file è già registrato</b> dal ", "<b>This file is already registered</b> since ") +
              fmt(r.dup.ts) +
              L(" (da ", " (by ") +
              esc(r.dup.nick) +
              L("). Chi lo ha registrato per primo ha la prova: un secondo non serve, e il contratto lo rifiuterebbe.", "). Whoever registered it first has the proof: a second record isn't needed, and the contract would refuse it.")
          );
          return;
        }
        msg(
          out,
          "ok",
          L("<b>Fatto.</b> Da questo momento chiunque può verificare che il file esisteva oggi. ", "<b>Done.</b> From now on anyone can check that the file existed today. ") +
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
    msg(out, "info", L("Calcolo l'impronta e cerco nel registro…", "Calculating the fingerprint and searching the register…"));
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
              L("<b>Trovato.</b> Registrato il ", "<b>Found.</b> Registered on ") +
                fmt(r.ts) +
                L(" da ", " by ") +
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
              L("<b>Non trovato.</b> Nessuno ha registrato questo file, oppure il file è stato modificato anche solo di un byte.", "<b>Not found.</b> Nobody has registered this file, or the file has been changed, even by a single byte.") + "<br><code>" +
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
                esc(r.label || L("senza descrizione", "no description")) +
                "<small>" +
                fmt(r.ts) +
                " · <code>" +
                short(r.hash) +
                "</code></small></li>"
              );
            })
            .join("") || "<li>" + L("Ancora nessuna registrazione.", "No records yet.") + "</li>";
      })
      .catch(function () {
        $("not-list").innerHTML = "<li>" + L("Registro non raggiungibile.", "Register unreachable.") + "</li>";
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
    msg(out, "info", L("Verifico…", "Checking…"));
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
            L("<b>Attestato non riconosciuto.</b> Non è stato emesso da un ente del registro, oppure è stato modificato.", "<b>Certificate not recognized.</b> It wasn't issued by a body in the register, or it has been changed.") + "<br><code>" +
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
            L("<b>Attestato revocato.</b> Emesso da ", "<b>Certificate revoked.</b> Issued by ") +
              who +
              L(" a ", " to ") +
              esc(c.holder) +
              L(" per «", " for «") +
              esc(LT(c.course)) +
              L("», poi revocato: ", "», then revoked: ") +
              esc(LT(c.reason)) +
              "."
          );
        else
          msg(
            out,
            "ok",
            L("<b>Attestato valido.</b> Emesso da ", "<b>Valid certificate.</b> Issued by ") +
              who +
              L(" a <b>", " to <b>") +
              esc(c.holder) +
              L("</b> per «", "</b> for «") +
              esc(LT(c.course)) +
              L("» il ", "» on ") +
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
                esc(LT(c.course)) +
                "<small>" +
                esc(res[1][c.issuer] || c.issuer) +
                " · " +
                fmt(c.ts) +
                (+c.revoked ? L(" · REVOCATO", " · REVOKED") : "") +
                "</small></li>"
              );
            })
            .join("") || "<li>" + L("Nessun attestato emesso.", "No certificates issued.") + "</li>";
      })
      .catch(function () {
        $("cert-list").innerHTML = "<li>" + L("Registro non raggiungibile.", "Register unreachable.") + "</li>";
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
            esc(LT(s.stage)) +
            "</b><p>" +
            esc(LT(s.data)) +
            "</p><small>" +
            esc(LT(s.nick)) +
            " · " +
            fmt(s.ts) +
            "</small></li>"
          );
        })
        .join("") || "<li>" + L("Nessuna tappa per questo lotto.", "No steps for this batch.") + "</li>";
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
        $("lot-steps").innerHTML = "<li>" + L("Registro non raggiungibile.", "Register unreachable.") + "</li>";
      });
  };
  $("lot-pick").addEventListener("change", drawLot);
  $("step-send").addEventListener("click", function () {
    var btn = this,
      out = $("step-out"),
      data = $("step-data").value.trim();
    if (!data) {
      msg(out, "err", L("Scrivi i dati della tappa.", "Write the step's data."));
      return;
    }
    needNick()
      .then(function (n) {
        busy(btn, true);
        msg(out, "info", L("Invio in corso…", "Sending…"));
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
          L("<b>Tappa scritta.</b> Da ora non si può più cancellare. ", "<b>Step written.</b> From now on it can't be deleted. ") + txLink(r)
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
      ? '<div class="tender"><b>' + L("Gara ", "Tender ") +
        tender.id +
        ":</b> " +
        esc(tender.title) +
        "</div>"
      : "";
    if (p === "none") {
      box.innerHTML =
        '<p class="out info">' + L("Nessuna gara aperta: aspetta che il relatore la bandisca.", "No open tender: wait for the speaker to call one.") + "</p>";
      return;
    }
    if (p === "bid") {
      box.innerHTML =
        head +
        '<p class="clock">' + L("Offerte aperte ancora per ", "Bids open for another ") + "<b>" +
        left(tender.bid_end) +
        "</b></p>" +
        (already
          ? '<p class="out ok">' + L("La tua busta chiusa è in gara.", "Your sealed envelope is in the tender.") +
            (mine
              ? L(" Importo: ", " Amount: ") +
                mine.amount +
                L(" € · parola segreta: <b>", " € · secret word: <b>") +
                esc(mine.salt) +
                L("</b> (salvata su questo telefono).", "</b> (saved on this phone).")
              : "") +
            "</p>"
          : '<label class="field">' + L("La tua offerta in euro (vince la più bassa)", "Your bid in euros (the lowest wins)") + '<input id="bid-amount" type="number" min="1" step="1" inputmode="numeric" placeholder="' + L("es.", "e.g.") + ' 48000"></label>' +
            '<button type="button" class="btn" id="bid-send">' + L("Chiudi la busta e invia", "Seal the envelope and send") + "</button>") +
        '<div id="gara-out" class="out"></div>';
    } else if (p === "reveal") {
      box.innerHTML =
        head +
        '<p class="clock">' + L("Apertura buste: hai ancora ", "Opening the envelopes: you have ") + "<b>" +
        left(tender.reveal_end) +
        "</b></p>" +
        (mine &&
        !bids.some(function (b) {
          return b.nick === n && +b.revealed;
        })
          ? '<button type="button" class="btn" id="bid-reveal">' + L("Apri la mia busta (", "Open my envelope (") +
            mine.amount +
            " €)</button>"
          : '<p class="out info">' +
            (already
              ? L("Busta già aperta, oppure la parola segreta non è su questo telefono.", "Envelope already opened, or the secret word isn't on this phone.")
              : L("Non hai una busta in questa gara.", "You don't have an envelope in this tender.")) +
            "</p>") +
        '<div id="gara-out" class="out"></div>';
    } else if (p === "toaward") {
      box.innerHTML =
        head +
        '<p class="clock">' + L("Tempo scaduto. Chiunque può chiedere al contratto di aggiudicare.", "Time's up. Anyone can ask the contract to award the tender.") + '</p><button type="button" class="btn" id="bid-award">' + L("Aggiudica la gara", "Award the tender") + '</button><div id="gara-out" class="out"></div>';
    } else {
      box.innerHTML =
        head +
        '<p class="out ok winner">' + L("Vince ", "The winner is ") + "<b>" +
        esc(tender.winner) +
        "</b>" +
        (+tender.amount
          ? L(" con ", " with ") + (+tender.amount).toLocaleString(L("it-IT", "en-GB")) + " €"
          : "") +
        L(". Deciso dal contratto, non da una persona.", ". Decided by the contract, not by a person.") + "</p>";
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
              ? (+b.amount).toLocaleString(L("it-IT", "en-GB")) + " €"
              : L("busta chiusa", "sealed envelope")) +
            "<small><code>" +
            short(b.sealed) +
            "</code></small></li>"
          );
        })
        .join("") || "<li>" + L("Ancora nessuna busta.", "No envelopes yet.") + "</li>";
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
          '<p class="out err">' + L("Registro non raggiungibile.", "Register unreachable.") + "</p>";
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
        msg(out, "err", L("Scrivi un importo intero in euro.", "Write a whole amount in euros."));
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
            L("Busta chiusa: <code>", "Sealed envelope: <code>") + short(sealed) + L("</code>. Invio…", "</code>. Sending…")
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
      q: L("Dovete conservare dei dati o uno storico di operazioni?", "Do you need to keep data or a history of operations?"),
      yes: "multi",
      no: "R-nodata",
    },
    multi: {
      q: L("Ci sono più soggetti diversi (uffici, aziende, persone) che devono scrivere in quel registro?", "Are there several different parties (offices, companies, people) who need to write to that register?"),
      yes: "trust",
      no: "R-db",
    },
    trust: {
      q: L("Esiste qualcuno di cui tutti si fidano, sempre disponibile, che può tenere il registro per tutti?", "Is there someone everybody trusts, always available, who can keep the register for everyone?"),
      yes: "R-trusted",
      no: "oracle",
    },
    oracle: {
      q: L("I dati nascono digitali (un file, un pagamento, una firma)? Rispondete no se qualcuno deve dichiarare cosa succede nel mondo fisico.", "Is the data born digital (a file, a payment, a signature)? Answer no if someone has to declare what happens in the physical world."),
      yes: "known",
      no: "known",
      flag: "no",
    },
    known: {
      q: L("Chi scrive è noto e autorizzato (aziende di un consorzio, enti, uffici)?", "Are the writers known and authorized (companies in a consortium, public bodies, offices)?"),
      yes: "public",
      no: "R-public",
    },
    public: {
      q: L("Chiunque, anche fuori dal gruppo, deve poter verificare i dati senza chiedere il permesso a nessuno?", "Must anyone, even outside the group, be able to check the data without asking anybody's permission?"),
      yes: "R-public",
      no: "R-permissioned",
    },
  };
  var R = {
    "R-nodata": [
      L("Non serve", "Not needed"),
      L("Senza dati da conservare non c'è un registro da proteggere.", "With no data to keep, there's no register to protect."),
    ],
    "R-db": [
      L("Basta un database", "A database is enough"),
      L("Se scrive un solo soggetto, la blockchain aggiunge costi e complessità senza benefici. Al massimo, per avere una data certa, si può notarizzare ogni tanto l'impronta del database.", "If only one party writes, a blockchain adds cost and complexity with no benefit. At most, to get a certain date, you can notarize the database's fingerprint now and then."),
    ],
    "R-trusted": [
      L("Database gestito da chi è fidato", "A database run by the trusted party"),
      L("Se c'è un soggetto di cui tutti si fidano (un ente, un notaio, un consorzio), è più semplice ed economico che tenga lui il registro. La blockchain serve proprio quando questo soggetto manca.", "If there's a party everyone trusts (a public body, a notary, a consortium), it's simpler and cheaper for them to keep the register. A blockchain is useful precisely when that party is missing."),
    ],
    "R-permissioned": [
      L("Blockchain con permessi", "Permissioned blockchain"),
      L("Più soggetti noti che non vogliono dipendere da uno solo: una blockchain in cui scrivono solo i membri autorizzati (per esempio un consorzio di filiera, o EBSI per i diplomi in Europa).", "Several known parties who don't want to depend on just one: a blockchain where only authorized members write (for example a supply chain consortium, or EBSI for diplomas in Europe)."),
    ],
    "R-public": [
      L("Blockchain pubblica", "Public blockchain"),
      L("Chi scrive non è noto in anticipo, oppure chiunque deve poter verificare senza chiedere permessi: è il caso tipico di una blockchain pubblica, come quella che abbiamo usato oggi.", "The writers aren't known in advance, or anyone must be able to check without asking permission: the typical case for a public blockchain, like the one we used today."),
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
        (a === "yes" ? L("Sì", "Yes") : L("No", "No")) +
        "</b></div>";
      node = q[a];
    });
    if (R[node]) {
      var c = $("serve-case").value.trim();
      html +=
        '<div class="result"><p class="kicker">' +
        (c ? esc(c) : L("Il vostro caso", "Your case")) +
        "</p><h2>" +
        R[node][0] +
        "</h2><p>" +
        R[node][1] +
        "</p>" +
        (oracleWarn
          ? '<p class="warn">' + L("<b>Attenzione all'oracolo:</b> la blockchain garantisce che un dato non cambi, non che sia vero. Se qualcuno dichiara cosa succede nel mondo fisico servono controlli, sensori o firme di chi ne risponde.", "<b>Watch out for the oracle:</b> a blockchain guarantees that data doesn't change, not that it's true. If someone declares what happens in the physical world, you need checks, sensors or signatures from whoever is accountable.") + "</p>"
          : "") +
        '<button type="button" class="btn ghost" data-serve="restart">' + L("Ricomincia", "Start again") + "</button></div>";
    } else {
      html +=
        '<div class="qa"><p>' +
        Q[node].q +
        '</p><div class="row"><button type="button" class="btn" data-serve="yes">' + L("Sì", "Yes") + '</button><button type="button" class="btn" data-serve="no">No</button></div></div>' +
        (path.length
          ? '<button type="button" class="btn ghost small" data-serve="back">' + L("Indietro", "Back") + "</button>"
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
      body: L("Se non sei stato tu, proteggi subito il tuo account: clicca qui e conferma l'accesso inserendo le 12 parole del tuo wallet.", "If this wasn't you, protect your account now: click here and confirm access by entering your wallet's 12 words."),
      scam: true, why: L(["Mittente: il dominio non è blockchain.com.", "Urgenza: «subito», altrimenti perdi tutto.", "Nessun servizio chiede mai le 12 parole del wallet."],
        ["Sender: the domain isn't blockchain.com.", "Urgency: «now», or you lose everything.", "No service ever asks for your wallet's 12 words."]) },
    { kind: "chat", from: "Uniswap · Discord", head: L("Messaggio privato", "Private message"),
      body: L("🎉 Airdrop in corso! Hai diritto a 2,5 ETH. Collega MetaMask entro oggi su uniswap-claim.app per riceverli.", "🎉 Airdrop live! You're entitled to 2.5 ETH. Connect MetaMask today on uniswap-claim.app to receive them."),
      scam: true, why: L(["I progetti seri non scrivono in privato su Discord.", "Regalo enorme e scadenza: leva sull'avidità e sulla fretta.", "Il sito copia la grafica di Uniswap, ma l'indirizzo è un altro."],
        ["Serious projects don't send private messages on Discord.", "A huge gift and a deadline: it plays on greed and haste.", "The site copies Uniswap's look, but the address is different."]) },
    { kind: "chat", from: "crypto_mentor · Telegram", head: L("Gruppo «Investiamo insieme»", "Group «Let's invest together»"),
      body: L("Ops, ho incollato per sbaglio le mie 12 parole: dentro ci sono 3.000 $ in USDT. Prendeteli voi, a me non servono 😅", "Oops, I pasted my 12 words by mistake: there's $3,000 in USDT inside. Take it, I don't need it 😅"),
      scam: true, why: L(["Il wallet ha i token ma non la moneta per pagare la commissione.", "Chi la invia per sbloccarli la perde subito: un programma la gira al truffatore.", "Nessuno regala 3.000 dollari a sconosciuti."],
        ["The wallet has the tokens but not the coin to pay the fee.", "Whoever sends some to unlock them loses it at once: a program forwards it to the scammer.", "Nobody gives $3,000 away to strangers."]) },
    { kind: "url", from: L("Barra degli indirizzi", "Address bar"), head: "xn--paypl-7ve.com/login",
      body: L("Il browser mostra «paypal.com» con una lettera quasi identica. La pagina è uguale a quella vera e chiede email e password.", "The browser shows «paypal.com» with one almost identical letter. The page looks like the real one and asks for your email and password."),
      scam: true, why: L(["Il prefisso xn-- indica un dominio con caratteri «speciali» (punycode).", "Una sola lettera di un altro alfabeto basta a fare un dominio diverso.", "Meglio entrare sempre dai preferiti o digitando l'indirizzo."],
        ["The xn-- prefix means a domain with «special» characters (punycode).", "A single letter from another alphabet is enough to make a different domain.", "Always go in from your bookmarks or by typing the address."]) },
    { kind: "wallet", from: L("Il tuo wallet · cronologia", "Your wallet · history"), head: L("Devi mandare 500 USDT al tuo conto sull'exchange", "You need to send 500 USDT to your exchange account"),
      body: L("Nella cronologia trovi «0x9Fa3…C7E1», da cui ieri ti è arrivato 0 USDT. Il tuo indirizzo dell'exchange è 0x9Fa3…C7E1. Copi quello dalla cronologia?", "In your history you find «0x9Fa3…C7E1», which sent you 0 USDT yesterday. Your exchange address is 0x9Fa3…C7E1. Do you copy it from the history?"),
      scam: true, why: L(["È l'«address poisoning»: un indirizzo creato apposta con inizio e fine uguali al tuo.", "La transazione da 0 serve solo a infilarlo nella tua cronologia.", "Copia l'indirizzo sempre dalla fonte (l'exchange), e controllalo tutto, non solo inizio e fine."],
        ["It's «address poisoning»: an address made on purpose with the same start and end as yours.", "The 0 transaction is only there to slip it into your history.", "Always copy the address from the source (the exchange), and check all of it, not just the start and end."]) },
    { kind: "chat", from: "Recruiter · LinkedIn", head: L("Offerta: Blockchain Lead, 400.000 $ l'anno", "Offer: Blockchain Lead, $400,000 a year"),
      body: L("Il tuo profilo è perfetto! Fai il colloquio video sul nostro sito. Se la webcam non va, incolla questo comando nel terminale per aggiornarla.", "Your profile is perfect! Do the video interview on our site. If your webcam doesn't work, paste this command into the terminal to update it."),
      scam: true, why: L(["Stipendio fuori mercato, azienda vera usata come esca.", "Nessun colloquio vero chiede di incollare comandi nel terminale.", "Quel comando scarica ed esegue un programma malevolo in background."],
        ["An off-market salary, with a real company used as bait.", "No real interview asks you to paste commands into the terminal.", "That command downloads and runs malware in the background."]) },
    { kind: "chat", from: L("WhatsApp · numero sconosciuto", "WhatsApp · unknown number"), head: L("Gruppo «Trading Elite Italia»", "Group «Trading Elite Italia»"),
      body: L("Il nostro esperto garantisce il 2% al giorno, senza rischi. Oggi ultimi 5 posti: investi da 250 € sulla nostra piattaforma.", "Our expert guarantees 2% a day, risk-free. Last 5 places today: invest from €250 on our platform."),
      scam: true, why: L(["Nessun investimento serio garantisce rendimenti, tanto meno il 2% al giorno.", "Posti limitati e fretta: pressione psicologica.", "Controlla se la piattaforma è autorizzata: la CONSOB pubblica avvisi e oscura i siti abusivi."],
        ["No serious investment guarantees returns, let alone 2% a day.", "Limited places and haste: psychological pressure.", "Check whether the platform is authorized: regulators (CONSOB in Italy) publish warnings and block illegal sites."]) },
    { kind: "wallet", from: L("Il tuo wallet · conferma", "Your wallet · confirmation"), head: L("Firma la transazione", "Sign the transaction"),
      body: L("Invio di 10 EOS a lucia23.gm, memo «quota cena». Hai appena scritto tu nome, importo e memo, e Lucia te li ha confermati a voce.", "Sending 10 EOS to lucia23.gm, memo «dinner share». You've just typed the name, amount and memo yourself, and Lucia confirmed them to you in person."),
      scam: false, why: L(["Hai avviato tu l'operazione, con dati che conosci.", "Destinatario confermato da un altro canale (a voce).", "Controllare comunque nome e importo prima di firmare è sempre una buona abitudine."],
        ["You started the operation, with data you know.", "The recipient was confirmed through another channel (in person).", "Checking the name and amount before signing is always a good habit anyway."]) },
    { kind: "email", from: "Exchange &lt;noreply@exchange-che-usi.com&gt;", head: L("Nuovo accesso al tuo account", "New sign-in to your account"),
      body: L("Accesso da Chrome su Mac, Bari, alle 9:42. Se non sei stato tu, apri l'app e cambia la password. Non ti chiederemo mai password o parole segrete via email.", "Sign-in from Chrome on Mac, Bari, at 9:42. If this wasn't you, open the app and change your password. We will never ask for passwords or secret words by email."),
      scam: false, why: L(["Nessun link da cliccare: ti dice di aprire l'app da solo.", "Non chiede né password né seed.", "Se eri tu (ora e città tornano), non devi fare niente."],
        ["No link to click: it tells you to open the app yourself.", "It asks for neither a password nor a seed.", "If it was you (time and city match), you don't need to do anything."]) },
    { kind: "chat", from: L("Stand alla fiera", "Stand at a trade fair"), head: L("Regalo per i visitatori", "A gift for visitors"),
      body: L("Ecco un paper wallet già stampato, con il QR per ricevere e la chiave privata sotto il gratta-e-vinci: caricaci pure i tuoi risparmi.", "Here's a ready-printed paper wallet, with the QR code to receive and the private key under a scratch-off panel: go ahead and put your savings on it."),
      scam: true, why: L(["Chi ha generato il paper wallet può conoscere la chiave privata.", "Appena ci carichi qualcosa, può svuotarlo.", "Un wallet si crea sempre da soli, su un dispositivo fidato."],
        ["Whoever generated the paper wallet may know the private key.", "As soon as you put something on it, they can empty it.", "Always create a wallet yourself, on a trusted device."]) }
  ];
  var tIdx = 0, tScore = 0, tAnswered = false;
  function drawTruffa() {
    var box = $("truffa-box");
    if (tIdx >= CASES.length) {
      box.innerHTML = '<div class="result"><p class="kicker">' + L("Risultato", "Result") + "</p><h2>" + tScore + L(" su ", " out of ") + CASES.length + "</h2><p>" +
        (tScore >= 9 ? L("Ottimo: difficile fregarti.", "Excellent: you're hard to fool.") : tScore >= 6 ? L("Bene, ma qualche trappola ti è sfuggita: rileggi i segnali.", "Good, but a few traps got past you: read the signs again.") : L("Attenzione: le truffe sono fatte per sembrare vere. Riprova con calma.", "Careful: scams are made to look real. Try again, calmly.")) +
        '</p><p class="warn">' + L("La regola d'oro: nessuno, mai, ha bisogno delle tue 12 o 24 parole.", "The golden rule: nobody, ever, needs your 12 or 24 words.") + '</p><button type="button" class="btn ghost" data-tq="restart">' + L("Ricomincia", "Start again") + "</button></div>";
      return;
    }
    var c = CASES[tIdx];
    var icon = { email: "✉️", chat: "💬", url: "🌐", wallet: "👛" }[c.kind];
    var html = '<p class="note">' + L("Caso ", "Case ") + (tIdx + 1) + L(" di ", " of ") + CASES.length + L(" · punti: ", " · points: ") + tScore + "</p>" +
      '<div class="mock ' + c.kind + '"><div class="mock-h"><span>' + icon + "</span><b>" + c.from + "</b></div>" +
      '<div class="mock-t">' + esc(c.head) + '</div><p>' + esc(c.body) + "</p></div>";
    if (!tAnswered) {
      html += '<div class="row"><button type="button" class="btn bad" data-tq="scam">' + L("Truffa", "Scam") + '</button><button type="button" class="btn good" data-tq="ok">' + L("Tutto in regola", "All in order") + "</button></div>";
    } else {
      html += '<div class="out ' + (tAnswered === "right" ? "ok" : "err") + '"><b>' + (tAnswered === "right" ? L("Giusto.", "Right.") : L("Sbagliato.", "Wrong.")) + "</b> " +
        (c.scam ? L("È una truffa.", "It's a scam.") : L("È legittimo.", "It's legitimate.")) + '<ul class="why">' + c.why.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul></div>" +
        '<button type="button" class="btn" data-tq="next">' + (tIdx + 1 < CASES.length ? L("Prossimo caso", "Next case") : L("Vedi il risultato", "See the result")) + "</button>";
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
      return "<li><b>" + esc(LT(h.memo) || L("Passaggio", "Transfer")) + "</b> · " + esc(h.from) + " → " + esc(h.to) + "<small>" + fmt(h.ts) + "</small></li>";
    }).join("");
  }
  $("nft-file").addEventListener("change", function (e) {
    var f = e.target.files[0], out = $("nft-out");
    if (!f) return;
    e.target.value = "";
    if (!galleryCode()) { msg(out, "err", L("La galleria non è configurata.", "The gallery isn't configured.")); return; }
    msg(out, "info", L("Calcolo l'impronta e cerco nella galleria…", "Calculating the fingerprint and searching the gallery…"));
    Promise.all([fileHash(f), galleryData()]).then(function (res) {
      var h = res[0], nfts = res[1][0], hist = res[1][1];
      var n = nfts.filter(function (x) { return x.hash === h; })[0];
      if (!n) {
        msg(out, "err", L("<b>Non è un'opera della galleria.</b> Forse è una copia, o è stata ritoccata anche di poco: l'impronta non corrisponde a nessun NFT.", "<b>It isn't an artwork from the gallery.</b> Maybe it's a copy, or it's been retouched even slightly: the fingerprint doesn't match any NFT.") + "<br><code>" + h + "</code>");
        return;
      }
      msg(out, "ok", L("<b>Originale.</b> «", "<b>Original.</b> «") + esc(LT(n.title)) + L("» di ", "» by ") + esc(n.artist) + L(", NFT n. ", ", NFT no. ") + n.id + L(".<br>Proprietario oggi: <b>", ".<br>Owner today: <b>") + esc(n.owner) + "</b>" +
        '<ol class="list story">' + story(hist, n.id) + "</ol>");
    }).catch(fail(out));
  });
  loaders.galleria = function () {
    if (!galleryCode()) { $("nft-list").innerHTML = "<p>" + L("La galleria non è configurata.", "The gallery isn't configured.") + "</p>"; return; }
    galleryData().then(function (res) {
      $("nft-list").innerHTML = res[0].map(function (n) {
        return '<div class="nft"><b>' + esc(LT(n.title)) + "</b><span>" + esc(n.artist) + "</span><small>" + L("NFT n. ", "NFT no. ") + n.id + L(" · di ", " · owned by ") + esc(n.owner) + "</small></div>";
      }).join("") || "<p>" + L("La galleria è ancora vuota.", "The gallery is still empty.") + "</p>";
    }).catch(function () { $("nft-list").innerHTML = "<p>" + L("Galleria non raggiungibile.", "Gallery unreachable.") + "</p>"; });
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
    if (!code) { $("tesoro-rank").innerHTML = "<li>" + L("La caccia non è configurata.", "The hunt isn't configured.") + "</li>"; return; }
    if (!$("team-name").value) $("team-name").value = store(TEAM_KEY) || nick();
    var pre = new URLSearchParams(location.search).get("codice");
    if (pre && !$("team-code").value) $("team-code").value = pre;
    Promise.all([Chain.rows("clues", 0, code), Chain.rows("finds", 0, code)]).then(function (res) {
      var clues = res[0], finds = res[1];
      var foundIds = {};
      finds.forEach(function (f) { foundIds[f.clue_id] = true; });
      $("tesoro-stato").textContent = L("Codici nascosti: ", "Hidden codes: ") + clues.length + L(" · già trovati da qualcuno: ", " · already found by someone: ") + Object.keys(foundIds).length;
      $("tesoro-rank").innerHTML = rank(clues, finds).map(function (t) {
        return "<li><b>" + esc(t.team) + "</b><span>" + t.points + L(" punti", " points") + "</span><small>" + t.found + (t.found === 1 ? L(" codice, ", " code, ") : L(" codici, ", " codes, ")) + t.first + L(" per primi", " found first") + "</small></li>";
      }).join("");
      if (!finds.length) $("tesoro-stato").textContent += L(" · nessun codice trovato, per ora", " · no codes found yet");
    }).catch(function () { $("tesoro-rank").innerHTML = "<li>" + L("Caccia non raggiungibile.", "Hunt unreachable.") + "</li>"; });
  };
  $("team-send").addEventListener("click", function () {
    var btn = this, out = $("team-out");
    var team = $("team-name").value.trim().slice(0, 24), codeTxt = $("team-code").value.trim();
    if (!team) { msg(out, "err", L("Scrivete il nome della squadra.", "Write your team's name.")); return; }
    if (codeTxt.length < 4) { msg(out, "err", L("Scrivete il codice trovato sul cartoncino.", "Write the code you found on the card.")); return; }
    store(TEAM_KEY, team);
    busy(btn, true);
    msg(out, "info", L("Il contratto controlla il codice…", "The contract is checking the code…"));
    var before;
    Chain.rows("finds", 0, treasureCode()).then(function (rs) {
      before = rs.length;
      return Chain.push("claim", { by: C.aula, team: team, code: codeTxt }, { contract: treasureCode() });
    }).then(function (r) {
      return Chain.rows("finds", 0, treasureCode()).then(function (rs) {
        var mine = rs.filter(function (f) { return f.team === team; }).slice(-1)[0];
        var pts = mine ? +mine.points : 0;
        msg(out, "ok", L("<b>Codice giusto!</b> ", "<b>Right code!</b> ") + (mine && +mine.first ? L("Siete i primi: <b>+", "You're first: <b>+") + pts + L(" punti</b>.", " points</b>.") : L("Qualcuno l'aveva già trovato: <b>+1 punto</b>.", "Someone found it before you: <b>+1 point</b>.")) + " " + txLink(r));
        $("team-code").value = "";
        loaders.tesoro();
      });
    }).catch(fail(out)).then(function () { busy(btn, false); });
  });

  route();
})();
