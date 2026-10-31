/* Accesso alla blockchain di prova: lettura delle tabelle con fetch, scrittura firmata con
   @wharfkit/antelope (vendor/antelope.js, generato da scripts/build-vendor.mjs). */
(function () {
  "use strict";
  var C = window.LAB_CONFIG;
  // ?contratto=nome.gm: il laboratorio legge il registro di un altro contratto con le stesse tabelle
  // (per esempio quello pubblicato da un partecipante). In questa modalità non scrive: si usa cleos.
  var own = new URLSearchParams(location.search).get("contratto");
  if (own && /^[a-z1-5.]{1,12}$/.test(own)) {
    C.contract = own;
    C.own = true;
    C.readOnly = true;
  }
  // ?demo=1: versione dimostrativa incorporata nelle pagine del sito. Legge tutto, non scrive niente,
  // così i visitatori non sporcano il registro d'aula.
  if (new URLSearchParams(location.search).get("demo")) {
    C.demo = true;
    C.readOnly = true;
  }
  var abiCache = {};

  function rpc(path, body) {
    var urls = C.rpc.slice();
    function attempt() {
      var url = urls.shift();
      return fetch(url + path, {
        method: "POST",
        body: JSON.stringify(body || {}),
      })
        .then(function (r) {
          return r.json().then(function (j) {
            if (!r.ok) throw rpcError(j);
            return j;
          });
        })
        .catch(function (e) {
          if (e.fromChain || !urls.length) throw e;
          return attempt();
        });
    }
    return attempt();
  }

  // Il nodo risponde con l'errore del contratto in error.details[0].message: lo ripuliamo per mostrarlo.
  function rpcError(j) {
    var d = j && j.error && j.error.details && j.error.details[0];
    var msg = d ? d.message : (j && j.message) || "errore sconosciuto";
    msg = msg.replace(/^assertion failure with message:\s*/, "");
    var e = new Error(msg);
    e.fromChain = true;
    return e;
  }

  // code: un altro contratto da cui leggere (per esempio la galleria NFT); di solito il registro d'aula.
  function rows(table, limit, code) {
    var out = [];
    code = code || C.contract;
    function page(lower) {
      return rpc("/v1/chain/get_table_rows", {
        json: true,
        code: code,
        scope: code,
        table: table,
        lower_bound: lower,
        limit: 200,
      }).then(function (j) {
        out = out.concat(j.rows);
        if (j.more && out.length < (limit || 2000)) return page(j.next_key);
        return out;
      });
    }
    return page("");
  }

  function ready() {
    return !!(
      C.contract &&
      C.aula &&
      C.aulaKey &&
      window.Antelope &&
      !C.readOnly
    );
  }

  // L'ABI di ogni contratto si scarica una volta sola.
  function getAbi(code) {
    if (abiCache[code]) return Promise.resolve(abiCache[code]);
    return rpc("/v1/chain/get_abi", { account_name: code }).then(function (j) {
      abiCache[code] = j.abi;
      return j.abi;
    });
  }

  // Firma e invia un'azione del contratto con il permesso "lab" dell'account d'aula.
  function push(name, data, auth) {
    if (C.readOnly)
      return Promise.reject(
        new Error(
          C.demo
            ? "Questa è la versione dimostrativa: qui si legge e si verifica, ma non si scrive. Al workshop si usa quella completa."
            : "Qui stai guardando il contratto " + C.contract + ": per scriverci si usa cleos."
        )
      );
    if (!ready())
      return Promise.reject(
        new Error(
          "La scrittura in blockchain non è ancora configurata (manca config o vendor/antelope.js)."
        )
      );
    var A = window.Antelope;
    var actor = (auth && auth.actor) || C.aula;
    var permission = (auth && auth.permission) || C.aulaPermission;
    var key = (auth && auth.key) || C.aulaKey;
    // auth.contract: un altro contratto su cui scrivere (per esempio la caccia al tesoro); di solito il registro d'aula.
    var code = (auth && auth.contract) || C.contract;
    return Promise.all([getAbi(code), rpc("/v1/chain/get_info")]).then(function (
      res
    ) {
      var abi = A.ABI.from(res[0]);
      var info = A.API.v1.GetInfoResponse.from(res[1]);
      var action = A.Action.from(
        {
          account: code,
          name: name,
          authorization: [{ actor: actor, permission: permission }],
          data: data,
        },
        abi
      );
      var trx = A.Transaction.from(
        Object.assign({}, info.getTransactionHeader(30), {
          actions: [action],
        })
      );
      var sig = A.PrivateKey.from(key).signDigest(
        trx.signingDigest(info.chain_id)
      );
      var signed = A.SignedTransaction.from(
        Object.assign({}, trx, { signatures: [sig] })
      );
      return send(signed, C.rpc.slice()).then(function (id) {
        return confirm(id).then(function () {
          return { id: id };
        });
      });
    });
  }

  // Invio con il client di wharfkit (lo stesso degli script), passando al nodo successivo se uno non risponde.
  function send(signed, urls) {
    var client = new window.Antelope.APIClient({ url: urls.shift() });
    return client.v1.chain.send_transaction(signed).then(
      function (r) {
        return String(r.transaction_id);
      },
      function (e) {
        var d = e && e.error && e.error.details && e.error.details[0];
        if (d)
          throw new Error(
            d.message.replace(/^assertion failure with message:\s*/, "")
          );
        if (urls.length) return send(signed, urls);
        throw e;
      }
    );
  }

  // Il nodo risponde subito, ma il blocco potrebbe ancora scartare la transazione:
  // diciamo "fatto" solo quando la vediamo dentro un blocco.
  function confirm(id) {
    var until = Date.now() + 10000;
    function poll() {
      return new Promise(function (r) {
        setTimeout(r, 600);
      })
        .then(function () {
          return rpc("/v1/chain/get_transaction_status", { id: id }).catch(
            function () {
              return null;
            }
          );
        })
        .then(function (st) {
          var s = st && st.state;
          if (s === "IN_BLOCK" || s === "IRREVERSIBLE") return s;
          if (s === "FAILED" || s === "FORKED_OUT")
            throw new Error("La rete ha scartato la transazione: riprova.");
          if (Date.now() > until)
            throw new Error(
              "Transazione non ancora confermata: ricarica tra qualche secondo per controllare."
            );
          return poll();
        });
    }
    return poll();
  }

  function txUrl(id) {
    return C.explorer + "/transaction/" + id;
  }
  function accountUrl(name) {
    return C.explorer + "/account/" + (name || C.contract);
  }

  window.Chain = {
    rpc: rpc,
    rows: rows,
    push: push,
    ready: ready,
    txUrl: txUrl,
    accountUrl: accountUrl,
  };
})();
