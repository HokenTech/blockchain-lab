// Registro pubblico del workshop "Blockchain: a cosa serve davvero, oltre le criptovalute".
// Quattro usi in un solo contratto, uno per ogni parte del workshop:
//   1. notarize            impronta (hash) di un documento con data certa
//   2. issue / revoke      certificati emessi solo da enti autorizzati, revocabili ma non cancellabili
//   3. addstep             tappe di filiera di un lotto, solo in aggiunta
//   4. newtender / bid / reveal / award   gara a buste chiuse: nessuno vede le offerte prima della scadenza
// Compilazione: cdt-cpp -abigen -o registro.wasm registro.cpp   (Antelope CDT 4.1.1)
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("registro")]] registro : public contract {
public:
   using contract::contract;

   // ---------- 1. Notarizzazione ----------

   [[eosio::action]]
   void notarize(name by, checksum256 hash, string nick, string label) {
      require_auth(by);
      check_text(nick, 1, 24, "nick");
      check_text(label, 0, 80, "label");
      docs_t docs(get_self(), get_self().value);
      auto idx = docs.get_index<"byhash"_n>();
      check(idx.find(hash) == idx.end(), "questo documento e' gia' registrato: guarda la data della prima registrazione");
      docs.emplace(by, [&](auto& r) {
         r.id = next_id(docs);
         r.hash = hash;
         r.by = by;
         r.nick = nick;
         r.label = label;
         r.ts = now();
      });
   }

   // ---------- 2. Certificati ----------

   [[eosio::action]]
   void addissuer(name issuer, string org) {
      require_auth(get_self());
      check(is_account(issuer), "l'ente deve avere un account");
      check_text(org, 1, 60, "org");
      issuers_t iss(get_self(), get_self().value);
      auto it = iss.find(issuer.value);
      if (it == iss.end()) iss.emplace(get_self(), [&](auto& r) { r.issuer = issuer; r.org = org; });
      else iss.modify(it, same_payer, [&](auto& r) { r.org = org; });
   }

   [[eosio::action]]
   void issue(name issuer, string holder, string course, checksum256 hash) {
      require_auth(issuer);
      issuers_t iss(get_self(), get_self().value);
      check(iss.find(issuer.value) != iss.end(), "solo un ente autorizzato puo' emettere certificati");
      check_text(holder, 1, 48, "holder");
      check_text(course, 1, 80, "course");
      certs_t certs(get_self(), get_self().value);
      auto idx = certs.get_index<"byhash"_n>();
      check(idx.find(hash) == idx.end(), "esiste gia' un certificato con questa impronta");
      certs.emplace(issuer, [&](auto& r) {
         r.id = next_id(certs);
         r.issuer = issuer;
         r.holder = holder;
         r.course = course;
         r.hash = hash;
         r.ts = now();
         r.revoked = false;
      });
   }

   // La revoca non cancella: il certificato resta visibile con il motivo, e chiunque vede che e' stato revocato.
   [[eosio::action]]
   void revoke(name issuer, uint64_t id, string reason) {
      require_auth(issuer);
      check_text(reason, 1, 80, "reason");
      certs_t certs(get_self(), get_self().value);
      auto it = certs.require_find(id, "certificato inesistente");
      check(it->issuer == issuer, "solo chi l'ha emesso puo' revocarlo");
      check(!it->revoked, "certificato gia' revocato");
      certs.modify(it, same_payer, [&](auto& r) { r.revoked = true; r.reason = reason; });
   }

   // ---------- 3. Filiera ----------

   // Non esiste un'azione per modificare o cancellare una tappa: un errore si corregge solo aggiungendo una tappa nuova.
   [[eosio::action]]
   void addstep(name by, string lot, string stage, string data, string nick) {
      require_auth(by);
      check_text(lot, 1, 24, "lot");
      check_text(stage, 1, 40, "stage");
      check_text(data, 1, 200, "data");
      check_text(nick, 1, 24, "nick");
      steps_t steps(get_self(), get_self().value);
      steps.emplace(by, [&](auto& r) {
         r.id = next_id(steps);
         r.lot = lot;
         r.stage = stage;
         r.data = data;
         r.nick = nick;
         r.by = by;
         r.ts = now();
      });
   }

   // ---------- 4. Gara a buste chiuse (commit / reveal) ----------

   [[eosio::action]]
   void newtender(name by, string title, uint32_t bid_secs, uint32_t reveal_secs) {
      require_auth(by);
      issuers_t iss(get_self(), get_self().value);
      check(by == get_self() || iss.find(by.value) != iss.end(), "solo un ente autorizzato puo' bandire una gara");
      check_text(title, 1, 80, "title");
      check(bid_secs >= 60 && bid_secs <= 86400, "durata offerte tra 1 minuto e 24 ore");
      check(reveal_secs >= 60 && reveal_secs <= 86400, "durata apertura buste tra 1 minuto e 24 ore");
      tenders_t tenders(get_self(), get_self().value);
      const uint32_t t = now().sec_since_epoch();
      tenders.emplace(by, [&](auto& r) {
         r.id = next_id(tenders);
         r.by = by;
         r.title = title;
         r.bid_end = time_point_sec(t + bid_secs);
         r.reveal_end = time_point_sec(t + bid_secs + reveal_secs);
         r.awarded = false;
      });
   }

   // sealed = sha256("<importo>:<segreto>:<nick>"), calcolato nel browser di chi fa l'offerta.
   [[eosio::action]]
   void bid(name by, uint64_t tender, string nick, checksum256 sealed) {
      require_auth(by);
      check_text(nick, 1, 24, "nick");
      tenders_t tenders(get_self(), get_self().value);
      auto t = tenders.require_find(tender, "gara inesistente");
      check(now() < t->bid_end, "tempo scaduto: le offerte sono chiuse");
      bids_t bids(get_self(), get_self().value);
      check(find_bid(bids, tender, nick) == bids.end(), "hai gia' presentato un'offerta in questa gara");
      bids.emplace(by, [&](auto& r) {
         r.id = next_id(bids);
         r.tender = tender;
         r.nick = nick;
         r.by = by;
         r.sealed = sealed;
         r.revealed = false;
         r.amount = 0;
         r.ts = now();
      });
   }

   [[eosio::action]]
   void reveal(name by, uint64_t tender, string nick, uint64_t amount, string salt) {
      require_auth(by);
      tenders_t tenders(get_self(), get_self().value);
      auto t = tenders.require_find(tender, "gara inesistente");
      check(now() >= t->bid_end, "le buste si aprono solo dopo la scadenza delle offerte");
      check(now() < t->reveal_end, "tempo per aprire le buste scaduto");
      check(salt.size() >= 4 && salt.size() <= 64, "segreto tra 4 e 64 caratteri");
      bids_t bids(get_self(), get_self().value);
      auto b = find_bid(bids, tender, nick);
      check(b != bids.end(), "nessuna offerta con questo nome");
      check(!b->revealed, "busta gia' aperta");
      const string plain = u64_to_str(amount) + ":" + salt + ":" + nick;
      check(sha256(plain.data(), plain.size()) == b->sealed, "importo o segreto non corrispondono alla busta chiusa");
      bids.modify(b, same_payer, [&](auto& r) { r.revealed = true; r.amount = amount; });
   }

   // Chiunque puo' chiamarla dopo la scadenza: vince l'offerta piu' bassa tra quelle aperte, a parita' la prima arrivata.
   // Chi chiama paga la RAM in piu' della riga (il nome del vincitore), perche' e' l'unico che firma.
   [[eosio::action]]
   void award(name by, uint64_t tender) {
      require_auth(by);
      tenders_t tenders(get_self(), get_self().value);
      auto t = tenders.require_find(tender, "gara inesistente");
      check(now() >= t->reveal_end, "si aggiudica solo dopo l'apertura delle buste");
      check(!t->awarded, "gara gia' aggiudicata");
      bids_t bids(get_self(), get_self().value);
      auto idx = bids.get_index<"bytender"_n>();
      string winner;
      uint64_t best = 0, best_id = 0;
      bool found = false;
      for (auto it = idx.lower_bound(tender); it != idx.end() && it->tender == tender; ++it) {
         if (!it->revealed) continue;
         if (!found || it->amount < best || (it->amount == best && it->id < best_id)) {
            found = true; best = it->amount; best_id = it->id; winner = it->nick;
         }
      }
      tenders.modify(t, by, [&](auto& r) {
         r.awarded = true;
         r.winner = found ? winner : string("nessuna offerta valida");
         r.amount = best;
      });
   }

   // ---------- Pulizia tra un'edizione e l'altra ----------

   [[eosio::action]]
   void reset(name table, uint32_t max_rows) {
      require_auth(get_self());
      if (table == "docs"_n) wipe(docs_t(get_self(), get_self().value), max_rows);
      else if (table == "certs"_n) wipe(certs_t(get_self(), get_self().value), max_rows);
      else if (table == "steps"_n) wipe(steps_t(get_self(), get_self().value), max_rows);
      else if (table == "tenders"_n) wipe(tenders_t(get_self(), get_self().value), max_rows);
      else if (table == "bids"_n) wipe(bids_t(get_self(), get_self().value), max_rows);
      else check(false, "tabella sconosciuta");
   }

private:
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

   struct [[eosio::table]] issuer_row {
      name issuer;
      string org;
      uint64_t primary_key() const { return issuer.value; }
   };
   typedef multi_index<"issuers"_n, issuer_row> issuers_t;

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

   struct [[eosio::table]] step {
      uint64_t id;
      string lot;
      string stage;
      string data;
      string nick;
      name by;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
   };
   typedef multi_index<"steps"_n, step> steps_t;

   struct [[eosio::table]] tender_row {
      uint64_t id;
      name by;
      string title;
      time_point_sec bid_end;
      time_point_sec reveal_end;
      bool awarded;
      string winner;
      uint64_t amount;
      uint64_t primary_key() const { return id; }
   };
   typedef multi_index<"tenders"_n, tender_row> tenders_t;

   struct [[eosio::table]] bid_row {
      uint64_t id;
      uint64_t tender;
      string nick;
      name by;
      checksum256 sealed;
      bool revealed;
      uint64_t amount;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
      uint64_t by_tender() const { return tender; }
   };
   typedef multi_index<"bids"_n, bid_row,
      indexed_by<"bytender"_n, const_mem_fun<bid_row, uint64_t, &bid_row::by_tender>>> bids_t;

   static time_point_sec now() { return time_point_sec(current_time_point()); }

   template <typename T>
   static uint64_t next_id(const T& table) {
      return table.begin() == table.end() ? 1 : (--table.end())->id + 1;
   }

   static void check_text(const string& s, size_t min, size_t max, const char* field) {
      check(s.size() >= min && s.size() <= max, string("lunghezza non valida: ") + field);
   }

   static string u64_to_str(uint64_t v) {
      if (v == 0) return "0";
      char buf[21];
      int i = 20;
      buf[i] = 0;
      while (v > 0) { buf[--i] = char('0' + v % 10); v /= 10; }
      return string(buf + i);
   }

   static bids_t::const_iterator find_bid(bids_t& bids, uint64_t tender, const string& nick) {
      auto idx = bids.get_index<"bytender"_n>();
      for (auto it = idx.lower_bound(tender); it != idx.end() && it->tender == tender; ++it) {
         if (it->nick == nick) return bids.find(it->id);
      }
      return bids.end();
   }

   template <typename T>
   static void wipe(T table, uint32_t max_rows) {
      uint32_t n = 0;
      for (auto it = table.begin(); it != table.end() && n < max_rows; ++n) it = table.erase(it);
   }
};
