// La vostra galleria di NFT: opere uniche, con impronta del file, proprietario e storia dei passaggi.
// Contratto dei partecipanti, workshop "NFT oltre l'hype: arte, cultura, turismo" di Hoken Tech.
//
// Compilazione:  cdt-cpp -abigen -o galleria.wasm galleria.cpp
// Il laboratorio web (https://hokentech.github.io/blockchain-lab/?contratto=TUOACCOUNT, esercizio 9)
// sa leggere le tabelle "nfts" e "history" e verificare se un'immagine è l'opera originale.
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("galleria")]] galleria : public contract {
public:
   using contract::contract;

   // 1. Conio: solo la galleria (il proprietario del contratto) crea un NFT, e lo assegna a qualcuno.
   //    L'opera non sta in blockchain: ci sta la sua impronta, più un link dove vederla.
   [[eosio::action]]
   void mint(name to, string title, string artist, checksum256 hash, string uri) {
      require_auth(get_self());
      check(is_account(to), "il destinatario non esiste");
      check(title.size() >= 1 && title.size() <= 60, "il titolo deve avere da 1 a 60 caratteri");
      check(artist.size() >= 1 && artist.size() <= 40, "il nome dell'artista deve avere da 1 a 40 caratteri");
      check(uri.size() <= 200, "il link può avere al massimo 200 caratteri");
      nfts_t nfts(get_self(), get_self().value);
      auto byhash = nfts.get_index<"byhash"_n>();
      check(byhash.find(hash) == byhash.end(), "questa opera ha già il suo NFT");
      const uint64_t id = nfts.available_primary_key();
      nfts.emplace(get_self(), [&](auto& r) {
         r.id = id;
         r.title = title;
         r.artist = artist;
         r.owner = to;
         r.hash = hash;
         r.uri = uri;
         r.ts = time_point_sec(current_time_point());
      });
      log(get_self(), id, get_self(), to, "Creazione");
   }

   // 2. Passaggio di proprietà: lo firma solo chi possiede l'NFT in quel momento.
   [[eosio::action]]
   void transfer(name from, name to, uint64_t id, string memo) {
      require_auth(from);
      check(is_account(to), "il destinatario non esiste");
      check(from != to, "non puoi cedere un NFT a te stesso");
      check(memo.size() <= 80, "il messaggio può avere al massimo 80 caratteri");
      nfts_t nfts(get_self(), get_self().value);
      auto it = nfts.require_find(id, "NFT inesistente");
      check(it->owner == from, "questo NFT non è tuo");
      nfts.modify(it, same_payer, [&](auto& r) { r.owner = to; });
      log(from, id, from, to, memo);
   }

private:
   struct [[eosio::table]] nft {
      uint64_t id;
      string title;
      string artist;
      name owner;
      checksum256 hash;
      string uri;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
      checksum256 by_hash() const { return hash; }
      uint64_t by_owner() const { return owner.value; }
   };
   typedef multi_index<"nfts"_n, nft,
      indexed_by<"byhash"_n, const_mem_fun<nft, checksum256, &nft::by_hash>>,
      indexed_by<"byowner"_n, const_mem_fun<nft, uint64_t, &nft::by_owner>>> nfts_t;

   // La storia: ogni creazione e ogni passaggio, per sempre.
   struct [[eosio::table]] move {
      uint64_t id;
      uint64_t nft_id;
      name from;
      name to;
      string memo;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
   };
   typedef multi_index<"history"_n, move> history_t;

   void log(name payer, uint64_t nft_id, name from, name to, const string& memo) {
      history_t history(get_self(), get_self().value);
      history.emplace(payer, [&](auto& r) {
         r.id = history.available_primary_key();
         r.nft_id = nft_id;
         r.from = from;
         r.to = to;
         r.memo = memo;
         r.ts = time_point_sec(current_time_point());
      });
   }
};
