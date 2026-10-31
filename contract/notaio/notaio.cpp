// Il tuo registro su blockchain: notarizzazione di file e attestati verificabili.
// Contratto dei partecipanti, workshop "Notarizzare e certificare con la blockchain" di Hoken Tech.
//
// Compilazione:  cdt-cpp -abigen -o notaio.wasm notaio.cpp
// Le tabelle hanno gli stessi nomi e campi del registro d'aula: il laboratorio web
// (https://hokentech.github.io/blockchain-lab/?contratto=TUOACCOUNT) sa leggerle.
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("notaio")]] notaio : public contract {
public:
   using contract::contract;

   // 1. Il nome del tuo ente, quello che compare sugli attestati. Si chiama una volta dopo il deploy.
   [[eosio::action]]
   void init(string org) {
      require_auth(get_self());
      check(org.size() >= 1 && org.size() <= 60, "il nome dell'ente deve avere da 1 a 60 caratteri");
      issuers_t issuers(get_self(), get_self().value);
      auto it = issuers.find(get_self().value);
      if (it == issuers.end()) issuers.emplace(get_self(), [&](auto& r) { r.issuer = get_self(); r.org = org; });
      else issuers.modify(it, same_payer, [&](auto& r) { r.org = org; });
   }

   // 2. Notarizzazione: chiunque può registrare l'impronta di un file, una volta sola.
   [[eosio::action]]
   void notarize(name by, checksum256 hash, string nick, string label) {
      require_auth(by);
      check(nick.size() >= 1 && nick.size() <= 24, "il nome deve avere da 1 a 24 caratteri");
      check(label.size() <= 80, "la descrizione può avere al massimo 80 caratteri");
      docs_t docs(get_self(), get_self().value);
      auto byhash = docs.get_index<"byhash"_n>();
      check(byhash.find(hash) == byhash.end(), "questo file è già registrato");
      docs.emplace(by, [&](auto& r) {
         r.id = docs.available_primary_key();
         r.hash = hash;
         r.by = by;
         r.nick = nick;
         r.label = label;
         r.ts = time_point_sec(current_time_point());
      });
   }

   // 3. Attestati: li emette solo il proprietario del contratto, cioè il tuo ente.
   [[eosio::action]]
   void issue(string holder, string course, checksum256 hash) {
      require_auth(get_self());
      check(holder.size() >= 1 && holder.size() <= 48, "nome del titolare non valido");
      check(course.size() >= 1 && course.size() <= 80, "nome del corso non valido");
      certs_t certs(get_self(), get_self().value);
      auto byhash = certs.get_index<"byhash"_n>();
      check(byhash.find(hash) == byhash.end(), "esiste già un attestato con questa impronta");
      certs.emplace(get_self(), [&](auto& r) {
         r.id = certs.available_primary_key();
         r.issuer = get_self();
         r.holder = holder;
         r.course = course;
         r.hash = hash;
         r.ts = time_point_sec(current_time_point());
         r.revoked = false;
      });
   }

   // 4. Revoca: l'attestato resta visibile, con il motivo. Non si cancella niente.
   [[eosio::action]]
   void revoke(uint64_t id, string reason) {
      require_auth(get_self());
      check(reason.size() >= 1 && reason.size() <= 80, "scrivi il motivo della revoca");
      certs_t certs(get_self(), get_self().value);
      auto it = certs.require_find(id, "attestato inesistente");
      check(!it->revoked, "attestato già revocato");
      certs.modify(it, same_payer, [&](auto& r) { r.revoked = true; r.reason = reason; });
   }

private:
   struct [[eosio::table]] issuer_row {
      name issuer;
      string org;
      uint64_t primary_key() const { return issuer.value; }
   };
   typedef multi_index<"issuers"_n, issuer_row> issuers_t;

   struct [[eosio::table]] doc {
      uint64_t id;
      checksum256 hash;
      name by;
      string nick;
      string label;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
      checksum256 by_hash() const { return hash; }
   };
   typedef multi_index<"docs"_n, doc,
      indexed_by<"byhash"_n, const_mem_fun<doc, checksum256, &doc::by_hash>>> docs_t;

   struct [[eosio::table]] cert {
      uint64_t id;
      name issuer;
      string holder;
      string course;
      checksum256 hash;
      time_point_sec ts;
      bool revoked;
      string reason;
      uint64_t primary_key() const { return id; }
      checksum256 by_hash() const { return hash; }
   };
   typedef multi_index<"certs"_n, cert,
      indexed_by<"byhash"_n, const_mem_fun<cert, checksum256, &cert::by_hash>>> certs_t;
};
