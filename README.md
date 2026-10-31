# Laboratorio blockchain · Hoken Tech

Il laboratorio dei workshop blockchain di [Hoken Tech](https://www.hokentech.tech/workshops): sette esercizi da fare dal telefono, senza installare niente, su una blockchain di prova (EOS, rete di test Jungle 4).

**Apri il laboratorio:** https://hokentech.github.io/blockchain-lab/

| Esercizio | Cosa si impara |
|---|---|
| 1 · Impronta | cos'è un hash: stesso file, stessa impronta; una virgola la cambia tutta |
| 2 · Catena | perché i blocchi collegati rendono visibile ogni manomissione |
| 3 · Notarizza | dare una data certa a un file registrando solo la sua impronta |
| 4 · Certificati | verificare un attestato: valido, revocato o falso |
| 5 · Filiera | le tappe di un lotto di olio, che si possono solo aggiungere |
| 6 · Gara | una gara d'appalto a buste chiuse gestita da uno smart contract |
| 7 · Serve? | capire se a un caso reale serve davvero una blockchain |
| 8 · Truffa? | dieci situazioni prese da casi veri: truffa o tutto in regola? |
| 9 · Galleria | un'immagine è l'opera originale di un NFT? Chi la possiede, da chi è passata? |
| 10 · Tesoro | caccia al tesoro a squadre: i codici trovati si riscattano qui, con la classifica dal vivo |

## Come funziona

- Le pagine sono statiche (HTML, CSS, JavaScript): nessun server.
- Le letture usano i nodi pubblici di Jungle 4.
- Le scritture sono firmate nel browser con il permesso `lab` dell'account d'aula `aulabari.gm`. Quella chiave può chiamare solo le azioni pubbliche del contratto: `notarize`, `addstep`, `bid`, `reveal`, `award`.
- Il contratto è `bitlabreg.gm`, sorgente in [`contract/registro.cpp`](contract/registro.cpp). Si compila con Antelope CDT 4.1.1:
  ```
  cdt-cpp -abigen -o registro.wasm registro.cpp
  ```

Tutto quello che si scrive nel laboratorio è **pubblico**: niente dati personali.

## Il vostro smart contract (versione estesa dei workshop)

Nella cartella `contract/` ci sono i contratti che i partecipanti compilano e pubblicano sul proprio account di test, uno per workshop:

| Cartella | Workshop | Cosa fa |
|---|---|---|
| [`contract/notaio`](contract/notaio/notaio.cpp) | Notarizzare e certificare | impronte di file con data certa, attestati emessi e revocati |
| [`contract/filiera`](contract/filiera/filiera.cpp) | Filiera e passaporto digitale | attori autorizzati con un ruolo, lotti, tappe firmate da chi le fa |
| [`contract/cassaforte`](contract/cassaforte/cassaforte.cpp) | Crypto senza truffe | cassaforte con tempo d'attesa e guardiano: un ladro con la chiave non la svuota |
| [`contract/galleria`](contract/galleria/galleria.cpp) | NFT oltre l'hype | NFT di opere con impronta del file, proprietario e storia dei passaggi |
| [`contract/tesoro`](contract/tesoro/tesoro.cpp) | Caccia al tesoro su blockchain | codici nascosti registrati solo come impronta, punti a chi li trova per primo |

I comandi qui sotto usano il contratto `notaio`: per gli altri cambia solo il nome della cartella e dei file. Da GitHub: **Code → Codespaces → Create codespace on main**, poi nel terminale:

```bash
bash setup.sh                                              # compilatore e client, circa un minuto
npx @wharfkit/cli account -n NOMESCELTO.gm | tee ~/account.txt
```

Poi il faucet su https://monitor4.jungletestnet.io/ (riquadro Faucet: token e CPU di prova) e:

```bash
echo "alias cleos='cleos -u https://jungle4.cryptolions.io'" >> ~/.bashrc && source ~/.bashrc
cd contract/notaio && cdt-cpp -abigen -o notaio.wasm notaio.cpp
cleos wallet create --to-console
cleos wallet import --private-key LA_VOSTRA_CHIAVE_PRIVATA
cleos system buyram NOMESCELTO.gm NOMESCELTO.gm -k 260
cleos set contract NOMESCELTO.gm . notaio.wasm notaio.abi -p NOMESCELTO.gm@active
cleos push action NOMESCELTO.gm init '["Il nome del vostro ente"]' -p NOMESCELTO.gm@active
```

Il laboratorio legge il vostro contratto aggiungendo il nome dell'account all'indirizzo: `https://hokentech.github.io/blockchain-lab/?contratto=NOMESCELTO.gm`

## Pubblicazione

GitHub → **Settings** → **Pages** → *Deploy from a branch*, branch `main`, cartella `/ (root)`.
