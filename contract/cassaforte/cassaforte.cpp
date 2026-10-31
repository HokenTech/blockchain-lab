// Una cassaforte per i token, con tempo d'attesa e un guardiano.
// Contratto dei partecipanti, workshop "Crypto senza truffe" di Hoken Tech.
//
// L'idea: anche se un ladro ruba la vostra chiave, non può svuotare la cassaforte da un momento all'altro.
// Ogni prelievo va prima chiesto, poi aspetta il tempo stabilito, e in quell'attesa il guardiano può annullarlo.
//
// Compilazione:  cdt-cpp -abigen -o cassaforte.wasm cassaforte.cpp
// Dopo il deploy il contratto deve poter mandare token: cleos set account permission CONTRATTO active --add-code
#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include <string>

using namespace eosio;
using std::string;

class [[eosio::contract("cassaforte")]] cassaforte : public contract {
public:
   using contract::contract;

   // 1. Apri la tua cassaforte: scegli un guardiano e quanti secondi deve durare l'attesa prima di un prelievo.
   [[eosio::action]]
   void open(name owner, name guardian, uint32_t delay_secs) {
      require_auth(owner);
      check(is_account(guardian), "il guardiano deve essere un account esistente");
      check(guardian != owner, "il guardiano deve essere un'altra persona");
      check(delay_secs >= 60 && delay_secs <= 86400, "l'attesa deve essere tra 1 minuto e 24 ore");
      safes_t safes(get_self(), get_self().value);
      check(safes.find(owner.value) == safes.end(), "hai già una cassaforte");
      safes.emplace(owner, [&](auto& r) {
         r.owner = owner;
         r.guardian = guardian;
         r.balance = asset(0, EOS);
         r.delay_secs = delay_secs;
         r.pending = asset(0, EOS);
      });
   }

   // 2. Deposito: si mandano EOS al contratto con il memo "deposito".
   [[eosio::on_notify("eosio.token::transfer")]]
   void deposit(name from, name to, asset quantity, string memo) {
      if (to != get_self() || from == get_self()) return;
      check(quantity.symbol == EOS, "la cassaforte accetta solo EOS");
      check(memo == "deposito", "per depositare scrivi \"deposito\" nel memo");
      safes_t safes(get_self(), get_self().value);
      auto it = safes.require_find(from.value, "prima apri la tua cassaforte con l'azione open");
      safes.modify(it, same_payer, [&](auto& r) { r.balance += quantity; });
   }

   // 3. Richiesta di prelievo: non parte subito, aspetta il tempo stabilito.
   [[eosio::action]]
   void request(name owner, name to, asset quantity) {
      require_auth(owner);
      check(is_account(to), "il destinatario non esiste");
      safes_t safes(get_self(), get_self().value);
      auto it = safes.require_find(owner.value, "non hai una cassaforte");
      check(quantity.symbol == EOS && quantity.amount > 0, "importo non valido");
      check(quantity <= it->balance, "non ci sono abbastanza EOS nella cassaforte");
      check(it->pending.amount == 0, "c'è già un prelievo in attesa");
      const uint32_t now = current_time_point().sec_since_epoch();
      safes.modify(it, same_payer, [&](auto& r) {
         r.pending = quantity;
         r.pending_to = to;
         r.unlock_at = time_point_sec(now + r.delay_secs);
      });
   }

   // 4. Annullamento: lo può fare il proprietario o il guardiano, finché il prelievo è in attesa.
   [[eosio::action]]
   void cancel(name by, name owner) {
      require_auth(by);
      safes_t safes(get_self(), get_self().value);
      auto it = safes.require_find(owner.value, "cassaforte inesistente");
      check(by == it->owner || by == it->guardian, "solo il proprietario o il guardiano possono annullare");
      check(it->pending.amount > 0, "nessun prelievo in attesa");
      safes.modify(it, same_payer, [&](auto& r) { r.pending = asset(0, EOS); r.pending_to = name(); });
   }

   // 5. Esecuzione: passato il tempo d'attesa, chiunque può far partire il prelievo.
   [[eosio::action]]
   void execute(name by, name owner) {
      require_auth(by);
      safes_t safes(get_self(), get_self().value);
      auto it = safes.require_find(owner.value, "cassaforte inesistente");
      check(it->pending.amount > 0, "nessun prelievo in attesa");
      check(current_time_point().sec_since_epoch() >= it->unlock_at.sec_since_epoch(), "il tempo d'attesa non è ancora finito");
      const asset qty = it->pending;
      const name to = it->pending_to;
      safes.modify(it, same_payer, [&](auto& r) { r.balance -= qty; r.pending = asset(0, EOS); r.pending_to = name(); });
      action(permission_level{get_self(), "active"_n}, "eosio.token"_n, "transfer"_n,
             std::make_tuple(get_self(), to, qty, string("Prelievo dalla cassaforte di ") + owner.to_string()))
         .send();
   }

private:
   static constexpr symbol EOS = symbol("EOS", 4);

   struct [[eosio::table]] safe {
      name owner;
      name guardian;
      asset balance;
      uint32_t delay_secs;
      asset pending;
      name pending_to;
      time_point_sec unlock_at;
      uint64_t primary_key() const { return owner.value; }
   };
   typedef multi_index<"safes"_n, safe> safes_t;
};
