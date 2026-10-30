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

## Come funziona

- Le pagine sono statiche (HTML, CSS, JavaScript): nessun server.
- Le letture usano i nodi pubblici di Jungle 4.
- Le scritture sono firmate nel browser con il permesso `lab` dell'account d'aula `aulabari.gm`. Quella chiave può chiamare solo le azioni pubbliche del contratto: `notarize`, `addstep`, `bid`, `reveal`, `award`.
- Il contratto è `bitlabreg.gm`, sorgente in [`contract/registro.cpp`](contract/registro.cpp). Si compila con Antelope CDT 4.1.1:
  ```
  cdt-cpp -abigen -o registro.wasm registro.cpp
  ```

Tutto quello che si scrive nel laboratorio è **pubblico**: niente dati personali.

## Pubblicazione

GitHub → **Settings** → **Pages** → *Deploy from a branch*, branch `main`, cartella `/ (root)`.
