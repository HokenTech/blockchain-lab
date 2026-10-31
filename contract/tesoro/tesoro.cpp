// Una caccia al tesoro su blockchain: i codici nascosti sono registrati solo come impronta.
// Contratto dell'aula e dei partecipanti, workshop "Caccia al tesoro su blockchain" di Hoken Tech.
//
// Chi organizza registra l'impronta di ogni codice segreto (non il codice): nessuno può leggerlo dal registro,
// e l'organizzatore non può cambiarlo dopo. Chi trova un cartoncino invia il codice: il contratto ne calcola
// l'impronta, la confronta e assegna i punti. Il primo che trova un codice prende tutti i punti, gli altri uno.
//
// Compilazione:  cdt-cpp -abigen -o tesoro.wasm tesoro.cpp
#include <eosio/eosio.hpp>
#include <eosio/crypto.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("tesoro")]] tesoro : public contract {
public:
   using contract::contract;

   // 1. L'organizzatore nasconde un codice: ne registra solo l'impronta, i punti e un indizio.
   //    L'impronta va calcolata sul codice scritto in minuscolo (sha256sum di "olivo-faro-382", senza a capo).
   [[eosio::action]]
   void addclue(checksum256 hash, uint32_t points, string hint) {
      require_auth(get_self());
      check(points >= 1 && points <= 100, "i punti vanno da 1 a 100");
      check(hint.size() <= 80, "l'indizio può avere al massimo 80 caratteri");
      clues_t clues(get_self(), get_self().value);
      auto byhash = clues.get_index<"byhash"_n>();
      check(byhash.find(hash) == byhash.end(), "questo codice è già nascosto");
      clues.emplace(get_self(), [&](auto& r) {
         r.id = clues.available_primary_key();
         r.hash = hash;
         r.points = points;
         r.hint = hint;
      });
   }

   // 2. Una squadra ha trovato un codice e lo invia. Il contratto lo controlla senza averlo mai conosciuto prima.
   [[eosio::action]]
   void claim(name by, string team, string code) {
      require_auth(by);
      check(team.size() >= 1 && team.size() <= 24, "il nome della squadra deve avere da 1 a 24 caratteri");
      const string c = normalize(code);
      check(c.size() >= 4 && c.size() <= 40, "il codice deve avere da 4 a 40 caratteri");
      clues_t clues(get_self(), get_self().value);
      auto byhash = clues.get_index<"byhash"_n>();
      auto clue = byhash.find(sha256(c.data(), c.size()));
      check(clue != byhash.end(), "codice sbagliato: controllate di averlo copiato bene");

      finds_t finds(get_self(), get_self().value);
      auto byclue = finds.get_index<"byclue"_n>();
      bool first = true;
      for (auto it = byclue.lower_bound(clue->id); it != byclue.end() && it->clue_id == clue->id; ++it) {
         first = false;
         check(it->team != team, "la vostra squadra ha già trovato questo codice");
      }
      const uint32_t points = first ? clue->points : 1;
      finds.emplace(by, [&](auto& r) {
         r.id = finds.available_primary_key();
         r.clue_id = clue->id;
         r.team = team;
         r.points = points;
         r.first = first;
         r.ts = time_point_sec(current_time_point());
      });
   }

   // 3. Nuova partita: cancella i ritrovamenti (e, se all è vero, anche i codici nascosti).
   [[eosio::action]]
   void reset(bool all) {
      require_auth(get_self());
      finds_t finds(get_self(), get_self().value);
      for (auto it = finds.begin(); it != finds.end();) it = finds.erase(it);
      if (all) {
         clues_t clues(get_self(), get_self().value);
         for (auto it = clues.begin(); it != clues.end();) it = clues.erase(it);
      }
   }

private:
   struct [[eosio::table]] clue {
      uint64_t id;
      checksum256 hash;
      uint32_t points;
      string hint;
      uint64_t primary_key() const { return id; }
      checksum256 by_hash() const { return hash; }
   };
   typedef multi_index<"clues"_n, clue,
      indexed_by<"byhash"_n, const_mem_fun<clue, checksum256, &clue::by_hash>>> clues_t;

   struct [[eosio::table]] find {
      uint64_t id;
      uint64_t clue_id;
      string team;
      uint32_t points;
      bool first;
      time_point_sec ts;
      uint64_t primary_key() const { return id; }
      uint64_t by_clue() const { return clue_id; }
   };
   typedef multi_index<"finds"_n, find,
      indexed_by<"byclue"_n, const_mem_fun<find, uint64_t, &find::by_clue>>> finds_t;

   // Minuscole e niente spazi ai lati: "  Olivo-Faro-382 " vale come "olivo-faro-382".
   static string normalize(const string& s) {
      size_t a = 0, b = s.size();
      while (a < b && s[a] == ' ') a++;
      while (b > a && s[b - 1] == ' ') b--;
      string out = s.substr(a, b - a);
      for (auto& ch : out) if (ch >= 'A' && ch <= 'Z') ch = char(ch - 'A' + 'a');
      return out;
   }
};
