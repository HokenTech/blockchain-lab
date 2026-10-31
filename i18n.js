/* Lingua del laboratorio: italiano in aula, inglese con ?lang=en (le pagine del sito in inglese).
   L("testo", "text") sceglie la stringa giusta nel codice; LT() traduce i dati noti letti dalla blockchain
   (tappe, opere, attestati della demo); i testi fissi di index.html si traducono qui sotto, prima di lab.js. */
(function () {
  "use strict";
  var en = new URLSearchParams(location.search).get("lang") === "en";
  window.LAB_LANG = en ? "en" : "it";
  window.L = function (it, eng) {
    return en ? eng : it;
  };

  var EN = {
    // intestazione e home
    "· laboratorio blockchain": "· blockchain lab",
    "Il nome che compare nelle tue registrazioni":
      "The name shown on your records",
    "Chi sei?": "Who are you?",
    "Laboratorio blockchain": "Blockchain lab",
    "Scegli l'esercizio che ti indica il relatore. Tutto funziona dal browser, senza installare niente e senza soldi veri: usiamo una blockchain di prova.":
      "Pick the exercise the speaker tells you. Everything runs in the browser, with nothing to install and no real money: we use a test blockchain.",
    Impronta: "Fingerprint",
    "Che cos'è un hash": "What a hash is",
    Catena: "Chain",
    "Perché non si può barare": "Why you can't cheat",
    Notarizza: "Notarize",
    "Data certa per un file": "A certain date for a file",
    Certificati: "Certificates",
    "Verifica un attestato": "Check a certificate",
    Filiera: "Supply chain",
    "Il viaggio di un lotto": "A batch's journey",
    Gara: "Tender",
    "Buste chiuse": "Sealed bids",
    "Serve?": "Needed?",
    "Ci serve davvero una blockchain?": "Do we really need a blockchain?",
    "Truffa?": "Scam?",
    "Riconosci le truffe crypto": "Spot crypto scams",
    Galleria: "Gallery",
    "NFT: è l'opera originale?": "NFTs: is it the original?",
    Tesoro: "Treasure",
    "Caccia al tesoro su blockchain": "Treasure hunt on the blockchain",
    // 1. impronta
    "L'impronta digitale": "The digital fingerprint",
    "Scrivi una frase e guarda la sua impronta (hash SHA-256). Poi cambia una sola lettera, o aggiungi un punto.":
      "Write a sentence and look at its fingerprint (SHA-256 hash). Then change a single letter, or add a full stop.",
    "La tua frase": "Your sentence",
    "Il workshop si tiene a Bari l'11 novembre 2026.":
      "The workshop takes place in Bari on 11 November 2026.",
    "Prova con un file": "Try with a file",
    "Tocca per scegliere un file (foto, PDF…). Non viene caricato da nessuna parte: l'impronta si calcola qui sul telefono.":
      "Tap to choose a file (photo, PDF…). It isn't uploaded anywhere: the fingerprint is calculated here on your phone.",
    "Impronta del file": "The file's fingerprint",
    "Stesso contenuto, stessa impronta. Sempre, su qualunque computer.":
      "Same content, same fingerprint. Always, on any computer.",
    "Basta una virgola per avere un'impronta del tutto diversa.":
      "One comma is enough to get a completely different fingerprint.",
    "Dall'impronta non si torna al contenuto: è una strada a senso unico.":
      "You can't get from the fingerprint back to the content: it's a one-way street.",
    // 2. catena
    "La catena di blocchi": "The chain of blocks",
    "Ogni blocco contiene l'impronta del blocco precedente. Prova a cambiare i dati del blocco 2: cosa succede ai blocchi dopo?":
      "Each block contains the fingerprint of the block before it. Try changing the data in block 2: what happens to the blocks after it?",
    Ricomincia: "Start again",
    'Il "nonce" è un numero che si prova a caso finché l\'impronta inizia con':
      'The "nonce" is a number tried at random until the fingerprint starts with',
    ": è il lavoro che costa fatica a chi vuole riscrivere la storia.":
      ": that's the work that makes rewriting history hard.",
    // 3. notarizza
    "Notarizza un documento": "Notarize a document",
    "Scegli un file. Sulla blockchain mettiamo solo la sua impronta, non il file: nessuno vede cosa c'è dentro, ma chiunque potrà verificare che esisteva oggi.":
      "Choose a file. Only its fingerprint goes on the blockchain, not the file: nobody sees what's inside, but anyone can check that it existed today.",
    Registra: "Register",
    Verifica: "Check",
    "Tocca per scegliere un file": "Tap to choose a file",
    "Descrizione (facoltativa, è pubblica)":
      "Description (optional, it's public)",
    "es. bozza del mio progetto": "e.g. draft of my project",
    "Registra in blockchain": "Register on the blockchain",
    "Tocca per scegliere il file da verificare":
      "Tap to choose the file to check",
    "Ultime registrazioni": "Latest records",
    // 4. certificati
    "Un ente autorizzato ha registrato l'impronta dei suoi attestati. Carica il PDF che hai ricevuto: scopri chi l'ha emesso, quando, e se è ancora valido.":
      "An authorized body has registered the fingerprints of its certificates. Load the PDF you received: find out who issued it, when, and whether it's still valid.",
    "Non hai un attestato? Scaricane uno, poi caricalo qui sotto:":
      "No certificate to hand? Download one, then load it below:",
    "Tocca per scegliere l'attestato (PDF)":
      "Tap to choose the certificate (PDF)",
    "Attestati emessi": "Certificates issued",
    // 5. filiera
    "Ogni tappa della filiera viene scritta in blockchain da chi la fa. Si può solo aggiungere: niente si cancella, niente si modifica.":
      "Each step of the supply chain is written on the blockchain by whoever does it. You can only add: nothing is deleted, nothing is changed.",
    Lotto: "Batch",
    "Aggiungi una tappa": "Add a step",
    Tappa: "Step",
    Dati: "Data",
    "es. 550 kg di olive, ore 7:30, Molfetta":
      "e.g. 550 kg of olives, 7:30 am, Molfetta",
    "Scrivi la tappa": "Write the step",
    // 6. gara
    "Gara a buste chiuse": "Sealed-bid tender",
    'Fai la tua offerta: in blockchain va solo una "busta chiusa" (l\'impronta di importo + parola segreta). Nessuno, nemmeno chi ha bandito la gara, può leggerla prima della scadenza. Dopo la scadenza apri la tua busta: il contratto controlla che corrisponda.':
      'Make your bid: only a "sealed envelope" goes on the blockchain (the fingerprint of amount + secret word). Nobody, not even whoever called the tender, can read it before the deadline. After the deadline you open your envelope: the contract checks that it matches.',
    "Buste in gara": "Bids in the tender",
    // 8. truffa
    "Truffa o no?": "Scam or not?",
    "Dieci situazioni prese da casi veri. Per ognuna decidi: è una truffa, o è tutto in regola? Poi leggi i segnali da riconoscere.":
      "Ten situations taken from real cases. For each one, decide: is it a scam, or is everything in order? Then read the warning signs.",
    // 9. galleria
    "È l'opera originale?": "Is it the original artwork?",
    "Ogni opera della galleria ha un NFT con l'impronta del suo file. Carica un'immagine: scopri se è l'originale, chi la possiede e da chi è passata.":
      "Every artwork in the gallery has an NFT with its file's fingerprint. Load an image: find out whether it's the original, who owns it and whose hands it has passed through.",
    "Scarica un'opera, poi caricala qui sotto:":
      "Download an artwork, then load it below:",
    "Una copia «uguale»": "An «identical» copy",
    "Tocca per scegliere un'immagine": "Tap to choose an image",
    "Le opere della galleria": "The gallery's artworks",
    // 10. tesoro
    "Caccia al tesoro": "Treasure hunt",
    "Trovate i cartoncini nascosti e scrivete qui il codice segreto. Il contratto conosce solo la sua impronta: se corrisponde, i punti sono vostri. Chi arriva primo prende tutti i punti, gli altri uno.":
      "Find the hidden cards and type the secret code here. The contract knows only its fingerprint: if it matches, the points are yours. The first team to find a code takes all its points, the others one.",
    "La vostra squadra": "Your team",
    "es. I Pirati del Levante": "e.g. The Levant Pirates",
    "Il codice trovato": "The code you found",
    "es. olivo-faro-382": "e.g. olivo-faro-382",
    "Invia il codice": "Send the code",
    Classifica: "Leaderboard",
    // 7. serve
    "Lavoro di gruppo": "Group work",
    "Pensate a un processo reale (del vostro ufficio, della vostra azienda) e rispondete alle domande.":
      "Think of a real process (in your office or your company) and answer the questions.",
    "Il vostro caso": "Your case",
    "es. registro delle presenze ai corsi": "e.g. course attendance register",
    "Testnet Jungle 4 · i dati sono pubblici e di prova ·":
      "Jungle 4 testnet · the data is public and for testing only ·",

    // dati della demo scritti in blockchain (in italiano, come in aula)
    Raccolta: "Harvest",
    Trasporto: "Transport",
    Frantoio: "Olive mill",
    Analisi: "Lab test",
    Confezionamento: "Packaging",
    Spedizione: "Shipping",
    Vendita: "Sale",
    Correzione: "Correction",
    "550 kg di olive raccolte a mano all'alba, con le reti, a Molfetta":
      "550 kg of olives picked by hand at dawn, with nets, in Molfetta",
    "Olive al frantoio entro poche ore dalla raccolta":
      "Olives at the mill within a few hours of picking",
    "Estrazione a freddo sotto i 27 °C con decanter":
      "Cold extraction below 27 °C with a decanter",
    "Olio netto 62,95 kg · resa 11,44% · 68,73 litri (0,916 kg/L a 20 °C)":
      "Net oil 62.95 kg · yield 11.44% · 68.73 litres (0.916 kg/L at 20 °C)",
    "14 lattine da 5 L + 1 da 3 L. Un NFT per ognuna delle 14 lattine da 5 L":
      "14 cans of 5 L + 1 of 3 L. One NFT for each of the 14 five-litre cans",
    "Costo totale del lotto 510 € · 8,84 € al litro":
      "Total cost of the batch €510 · €8.84 per litre",
    "Blockchain: a cosa serve davvero": "Blockchain: what it's really for",
    "frequenza non raggiunta": "attendance requirement not met",
    "Raccolta all'alba": "Harvest at dawn",
    "Olio appena estratto": "Freshly pressed oil",
    "Quattordici lattine": "Fourteen cans",
    Creazione: "Minted",
    "Venduta alla mostra": "Sold at the exhibition",
    Rivenduta: "Resold",
  };
  window.LT = function (s) {
    return en && EN[s] ? EN[s] : s;
  };
  if (!en) return;

  function tr(s) {
    var k = s.replace(/\s+/g, " ").trim();
    if (!k) return null;
    if (EN[k]) return EN[k];
    var m = /^Esercizio (\d+)$/.exec(k);
    return m ? "Exercise " + m[1] : null;
  }
  var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  var nodes = [];
  while (walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach(function (n) {
    var t = tr(n.nodeValue);
    if (!t) return;
    // Le opzioni senza value inviano il testo: si tiene quello italiano, che è il dato scritto in blockchain.
    var p = n.parentNode;
    if (p.tagName === "OPTION" && !p.hasAttribute("value"))
      p.value = n.nodeValue.trim();
    var lead = /^\s*/.exec(n.nodeValue)[0],
      tail = /\s*$/.exec(n.nodeValue)[0];
    n.nodeValue = lead + t + tail;
  });
  document.querySelectorAll("[placeholder], [title]").forEach(function (el) {
    ["placeholder", "title"].forEach(function (a) {
      var t = el.hasAttribute(a) && tr(el.getAttribute(a));
      if (t) el.setAttribute(a, t);
    });
  });
  document.documentElement.lang = "en";
  document.title = "Blockchain lab · Hoken Tech";
})();
