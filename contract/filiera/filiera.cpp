// La vostra filiera su blockchain: attori autorizzati, lotti, tappe firmate da chi le fa.
// Contratto dei partecipanti, workshop "Filiera e passaporto digitale dei prodotti" di Hoken Tech.
//
// Compilazione:  cdt-cpp -abigen -o filiera.wasm filiera.cpp
// La tabella "steps" ha gli stessi campi del registro d'aula: il laboratorio web
// (https://hokentech.github.io/blockchain-lab/?contratto=TUOACCOUNT, esercizio 5) la sa leggere.
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("filiera")]] filiera : public contract {
public:
   using contract::contract;

   // 1. Il proprietario del contratto decide chi fa parte della filiera, e con quale ruolo.
   [[eosio::action]]
   void addactor(name actor, string role, string org) {
      require_auth(get_self());
      check(is_account(actor), "questo account non esiste");
      check(role == "produttore" || role == "trasformatore" || role == "trasportatore" || role == "laboratorio" || role == "venditore",
            "ruolo non valido: produttore, trasformatore, trasportatore, laboratorio o venditore");
      check(org.size() >= 1 && org.size() <= 40, "il nome dell'azienda deve avere da 1 a 40 caratteri");
      actors_t actors(get_self(), get_self().value);
      auto it = actors.find(actor.value);
      if (it == actors.end()) actors.emplace(get_self(), [&](auto& r) { r.actor = actor; r.role = role; r.org = org; });
      else actors.modify(it, same_payer, [&](auto& r) { r.role = role; r.org = org; });
   }

   // 2. Solo un produttore può creare un lotto nuovo.
   [[eosio::action]]
   void newlot(name by, string lot, string product) {
      require_auth(by);
      auto who = actor_of(by);
      check(who.role == "produttore", "solo un produttore può creare un lotto");
      check(lot.size() >= 1 && lot.size() <= 24, "il codice del lotto deve avere da 1 a 24 caratteri");
      check(product.size() >= 1 && product.size() <= 60, "descrivi il prodotto in massimo 60 caratteri");
      lots_t lots(get_self(), get_self().value);
      auto bycode = lots.get_index<"bycode"_n>();
      check(bycode.find(code_key(lot)) == bycode.end(), "esiste già un lotto con questo codice");
      lots.emplace(by, [&](auto& r) {
         r.id = lots.available_primary_key();
         r.lot = lot;
         r.product = product;
         r.producer = by;
         r.closed = false;
         r.ts = time_point_sec(current_time_point());
      });
      add(by, who.org, lot, "Creazione", product);
   }

   // 3. Ogni attore autorizzato scrive la sua tappa, firmandola. Non si modifica e non si cancella.
   [[eosio::action]]
   void addstep(name by, string lot, string stage, string data) {
      require_auth(by);
      auto who = actor_of(by);
      check(stage.size() >= 1 && stage.size() <= 40, "il nome della tappa deve avere da 1 a 40 caratteri");
      check(data.size() >= 1 && data.size() <= 200, "i dati devono avere da 1 a 200 caratteri");
      auto l = lot_of(lot);
      check(!l.closed, "il lotto è chiuso: non si aggiungono altre tappe");
      add(by, who.org + " (" + who.role + ")", lot, stage, data);
   }

   // 4. Il venditore chiude il lotto quando l'ultimo pezzo è venduto. Da qui in poi è in sola lettura.
   [[eosio::action]]
   void closelot(name by, string lot) {
      require_auth(by);
      auto who = actor_of(by);
      check(who.role == "venditore", "solo un venditore può chiudere un lotto");
      lots_t lots(get_self(), get_self().value);
      auto bycode = lots.get_index<"bycode"_n>();
      auto it = bycode.find(code_key(lot));
      check(it != bycode.end(), "lotto inesistente");
      check(!it->closed, "lotto già chiuso");
      bycode.modify(it, same_payer, [&](auto& r) { r.closed = true; });
      add(by, who.org + " (" + who.role + ")", lot, "Chiusura", "Lotto venduto: nessuna altra tappa");
   }

private:
   struct [[eosio::table]] actor_row {
      name actor;
      string role;
      string org;
      uint64_t primary_key() const { return actor.value; }
   };
   typedef multi_index<"actors"_n, actor_row> actors_t;

   struct [[eosio::table]] lot_row {
      uint64_t id;
      string lot;
      string product;
      name producer;
      bool closed;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
      uint64_t by_code() const { return code_key(lot); }
   };
   typedef multi_index<"lots"_n, lot_row,
      indexed_by<"bycode"_n, const_mem_fun<lot_row, uint64_t, &lot_row::by_code>>> lots_t;

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

   // I primi 8 byte dell'impronta del codice: un numero per cercare un lotto senza scorrere la tabella.
   static uint64_t code_key(const string& code) {
      auto h = sha256(code.data(), code.size()).extract_as_byte_array();
      uint64_t k = 0;
      for (int i = 0; i < 8; i++) k = (k << 8) | h[i];
      return k;
   }

   actor_row actor_of(name who) {
      actors_t actors(get_self(), get_self().value);
      auto it = actors.find(who.value);
      check(it != actors.end(), "non fai parte di questa filiera: chiedi al proprietario del contratto di aggiungerti");
      return *it;
   }

   lot_row lot_of(const string& lot) {
      lots_t lots(get_self(), get_self().value);
      auto bycode = lots.get_index<"bycode"_n>();
      auto it = bycode.find(code_key(lot));
      check(it != bycode.end(), "lotto inesistente");
      return *it;
   }

   void add(name by, const string& nick, const string& lot, const string& stage, const string& data) {
      steps_t steps(get_self(), get_self().value);
      steps.emplace(by, [&](auto& r) {
         r.id = steps.available_primary_key();
         r.lot = lot;
         r.stage = stage;
         r.data = data;
         r.nick = nick;
         r.by = by;
         r.ts = time_point_sec(current_time_point());
      });
   }
};
