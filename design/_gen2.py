# Versioni interattive di Oggi, Dispensa e Noi.
# Stessi valori del sistema visivo di _gen.py.
import re
exec(open("_gen.py").read().split("# ─────────────────────────── OGGI")[0])

HEAD = f'''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  {FONTS}
  <style>
    body {{ margin: 0; }}
    a {{ color: {ACCENT}; }} a:hover {{ color: #7d3e20; }}
  </style>
</helmet>
<div style="width: 390px; height: 844px; background: {BG}; font-family: 'Public Sans', system-ui, sans-serif; color: {INK}; display: flex; flex-direction: column; overflow: hidden;">
'''

def wrap(body, active, logic):
    return HEAD + body + '<div style="flex-grow: 1;"></div>' + nav(active) + f'''</div>
</x-dc>
<script data-dc-script data-props='{{"$preview":{{"width":390,"height":844}}}}'>
{logic}
</script>
</body>
</html>
'''

# ─────────── OGGI: le voci del giorno si spuntano ───────────
oggi_body = (
  header("Domenica 30 agosto", "Buongiorno,<br>Paolo e Giulia")
  + f'<div style="margin: 0 24px 12px 24px; padding: 18px 20px; background: {SURF}; border: 1px solid {BORDER}; border-radius: 4px;">'
  + label("Oggi")
  + '<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 12px;">'
  + '<sc-for list="{{ voci }}" as="v" hint-placeholder-count="3">'
  + '<div onClick="{{ v.toggle }}" style="display: flex; gap: 12px; align-items: center; padding: 7px 0; cursor: pointer;">'
  + '<div style="width: 18px; height: 18px; border-radius: 3px; border: 1.5px solid {{ v.boxBorder }}; background: {{ v.boxBg }}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">'
  + '<sc-if value="{{ v.fatto }}" hint-placeholder-val="{{ true }}">'
  + '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
  + '</sc-if></div>'
  + f'<div style="width: 3px; align-self: stretch; background: {{{{ v.barra }}}}; flex-shrink: 0;"></div>'
  + '<div style="display: flex; flex-direction: column; gap: 1px;">'
  + '<div style="font-size: 15px; font-weight: 500; color: {{ v.titoloColore }}; text-decoration: {{ v.strike }};">{{ v.titolo }}</div>'
  + f'<div style="font-size: 13px; color: {MUTED};">{{{{ v.sotto }}}}</div></div></div>'
  + '</sc-for></div>'
  + '<div style="font-size: 12.5px; color: #a49a8e; margin-top: 12px;">{{ riassunto }}</div>'
  + '</div>'
  + f'<div style="margin: 0 24px; padding: 16px 18px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">'
  + f'<div style="display: flex; flex-direction: column; gap: 3px;"><div style="font-size: 14px; font-weight: 600;">Check-in della settimana</div>'
  + f'<div style="font-size: 13px; color: #7a6f64;">Giulia ha già risposto</div></div>'
  + f'<div style="padding: 9px 16px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500; white-space: nowrap;">Rispondi</div></div>'
)

oggi_logic = '''class Component extends DCLogic {
  constructor(props) { super(props); this.state = { fatti: {} }; }
  renderVals() {
    const righe = [
      { titolo: "Cena da Marta", sotto: "20:30 · con Giulia", barra: "%ACC%" },
      { titolo: "Pagare l'affitto", sotto: "Scade oggi · assegnato a te", barra: "#d8cfc2" },
      { titolo: "Yogurt in scadenza", sotto: "2 prodotti scadono domani", barra: "#d8cfc2" }
    ];
    let fatti = 0;
    const voci = righe.map((r, i) => {
      const fatto = this.state.fatti[i] === true;
      if (fatto) fatti++;
      return {
        titolo: r.titolo, sotto: r.sotto, fatto: fatto,
        barra: fatto ? "#e5ddd2" : r.barra,
        boxBorder: fatto ? "%ACC%" : "#d8cfc2",
        boxBg: fatto ? "%ACC%" : "transparent",
        titoloColore: fatto ? "#a49a8e" : "%INK%",
        strike: fatto ? "line-through" : "none",
        toggle: () => {
          const next = Object.assign({}, this.state.fatti);
          next[i] = !next[i];
          this.setState({ fatti: next });
        }
      };
    });
    const restanti = righe.length - fatti;
    return {
      voci: voci,
      riassunto: restanti === 0 ? "Tutto fatto per oggi." : restanti + " cose ancora da fare"
    };
  }
}'''.replace("%ACC%", ACCENT).replace("%INK%", INK)

open("Main.dc.html","w").write(wrap(oggi_body, "home", oggi_logic))
print("Main interattiva")

# ─────────── NOI: umore selezionabile + reveal della risposta ───────────
noi_body = (
  header("Check-in · settimana 35", "Come stiamo?")
  + f'<div style="margin: 0 24px 12px 24px; padding: 18px 20px; background: {SURF}; border: 1px solid {BORDER}; border-radius: 4px;">'
  + f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 20px; line-height: 1.35;">'
    f'"Cosa ti ha fatto sentire più vicino a me questa settimana?"</div>'
  + label("Come ti senti").replace('color: ' + ACCENT, 'color: ' + ACCENT + '; margin: 20px 0 10px 0')
  + '<div style="display: flex; gap: 8px;">'
  + '<sc-for list="{{ umori }}" as="u" hint-placeholder-count="3">'
  + '<div onClick="{{ u.scegli }}" style="flex-grow: 1; text-align: center; padding: 11px 0; border: 1px solid {{ u.bordo }}; background: {{ u.sfondo }}; border-radius: 2px; font-size: 13.5px; font-weight: {{ u.peso }}; color: {{ u.colore }}; cursor: pointer;">{{ u.nome }}</div>'
  + '</sc-for></div>'
  + label("La tua risposta").replace('color: ' + ACCENT, 'color: ' + ACCENT + '; margin: 20px 0 10px 0')
  + f'<div onClick="{{{{ scrivi }}}}" style="background: {BG}; border: 1px solid {BORDER}; border-radius: 3px; padding: 13px; min-height: 74px; '
    f'font-size: 14px; color: {{{{ testoColore }}}}; line-height: 1.5; cursor: pointer; white-space: pre-line;">{{{{ testo }}}}</div>'
  + '<div onClick="{{ invia }}" style="display: flex; align-items: center; justify-content: center; background: {{ inviaBg }}; border-radius: 2px; '
    f'padding: 14px; margin-top: 16px; cursor: pointer;"><div style="font-size: 14.5px; font-weight: 500; color: {BG};">{{{{ inviaTesto }}}}</div></div>'
  + '</div>'
  + '<sc-if value="{{ rivelato }}" hint-placeholder-val="{{ false }}">'
  + f'<div style="margin: 0 24px; padding: 18px 20px; background: {SURF}; border: 1px solid {BORDER}; border-left: 2px solid {GIULIA}; border-radius: 4px;">'
  + f'<div style="display: flex; gap: 11px; align-items: center; margin-bottom: 11px;">'
    f'<div style="width: 30px; height: 30px; border-radius: 15px; background: {GIULIA}; color: #ffffff; font-size: 12px; '
    f'font-weight: 600; display: flex; align-items: center; justify-content: center;">G</div>'
    f'<div style="font-size: 13.5px; font-weight: 600;">Giulia · si sente Bene</div></div>'
  + f'<div style="font-size: 15px; line-height: 1.5;">Quando sabato hai disdetto per restare a casa con me anche se non stavo bene.</div></div>'
  + '</sc-if>'
  + '<sc-if value="{{ nonRivelato }}" hint-placeholder-val="{{ true }}">'
  + f'<div style="margin: 0 24px; padding: 15px 18px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; gap: 12px;">'
  + f'<div style="width: 30px; height: 30px; border-radius: 15px; background: {GIULIA}; color: #ffffff; font-size: 12px; '
    f'font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">G</div>'
  + f'<div style="font-size: 13.5px; color: #6d6259; line-height: 1.45;">Giulia ha già risposto.<br>'
    f'Vedrai la sua risposta quando invii la tua.</div></div>'
  + '</sc-if>'
)

noi_logic = '''class Component extends DCLogic {
  constructor(props) { super(props); this.state = { umore: 0, scritto: false, inviato: false }; }
  renderVals() {
    const defs = [["Bene", "#15803d"], ["Così", "%ACC%"], ["Giù", "#7c6f64"]];
    const umori = defs.map((d, i) => {
      const on = this.state.umore === i;
      return {
        nome: d[0],
        bordo: on ? d[1] : "%BORDER%",
        sfondo: on ? d[1] + "12" : "%SURF%",
        peso: on ? "600" : "400",
        colore: on ? d[1] : "%MUTED%",
        scegli: () => this.setState({ umore: i })
      };
    });
    const testo = this.state.scritto
      ? "Il pomeriggio di sabato, quando siamo rimasti a leggere senza dire niente per due ore."
      : "Tocca per scrivere\\u2026";
    return {
      umori: umori,
      testo: testo,
      testoColore: this.state.scritto ? "%INK%" : "%SOFT%",
      scrivi: () => this.setState({ scritto: !this.state.scritto }),
      invia: () => { if (this.state.scritto) this.setState({ inviato: true }); },
      inviaTesto: this.state.inviato ? "Risposta inviata" : "Invia la risposta",
      inviaBg: this.state.inviato ? "#166534" : (this.state.scritto ? "%INK%" : "#c7bdb1"),
      rivelato: this.state.inviato,
      nonRivelato: !this.state.inviato
    };
  }
}'''.replace("%ACC%", ACCENT).replace("%INK%", INK).replace("%SOFT%", SOFT)\
    .replace("%BORDER%", BORDER).replace("%SURF%", SURF).replace("%MUTED%", MUTED)

open("Noi.dc.html","w").write(wrap(noi_body, "heart", noi_logic))
print("Noi interattiva")

# ─────────── DISPENSA: consumo dei prodotti + avviso scadenze dinamico ───────────
disp_body = (
  header(None, "Dispensa")
  + '<div style="margin: 0 24px 18px 24px; display: flex; gap: 7px;">'
  + f'<div style="padding: 8px 15px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500;">Dispensa</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Spesa</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Ricette</div>'
  + '</div>'
  + '<sc-if value="{{ inScadenza }}" hint-placeholder-val="{{ true }}">'
  + f'<div style="margin: 0 24px 14px 24px; padding: 13px 16px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; gap: 11px;">'
  + icon("bell", ACCENT, 17)
  + f'<div style="font-size: 13.5px; color: #6d6259;">{{{{ avviso }}}}</div></div>'
  + '</sc-if>'
  + '<div style="margin: 0 24px;">'
  + '<sc-for list="{{ sezioni }}" as="s" hint-placeholder-count="2">'
  + '<div style="margin-bottom: 20px;">'
  + f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin-bottom: 2px;">{{{{ s.nome }}}}</div>'
  + '<sc-for list="{{ s.righe }}" as="r" hint-placeholder-count="3">'
  + f'<div onClick="{{{{ r.consuma }}}}" style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid {LINE}; cursor: pointer; opacity: {{{{ r.opacita }}}};">'
  + '<div style="flex-grow: 1; font-size: 15px; text-decoration: {{ r.strike }};">{{ r.nome }}</div>'
  + f'<div style="font-size: 13.5px; color: {MUTED};">{{{{ r.qta }}}}</div>'
  + '<div style="padding: 3px 9px; border-radius: 2px; background: {{ r.badgeBg }}; font-size: 11px; font-weight: 600; color: {{ r.badgeColore }}; white-space: nowrap;">{{ r.badge }}</div>'
  + '</div>'
  + '</sc-for></div>'
  + '</sc-for></div>'
)

disp_logic = '''class Component extends DCLogic {
  constructor(props) { super(props); this.state = { finiti: {} }; }
  renderVals() {
    const dati = [
      { nome: "Frigo", righe: [
        { nome: "Yogurt greco",    qta: "4 vasetti", badge: "Domani",   colore: "#c2410c", urgente: true },
        { nome: "Latte intero",    qta: "1 l",       badge: "Scaduto",  colore: "#b91c1c", urgente: true },
        { nome: "Uova",            qta: "6",         badge: "5 giorni", colore: "%MUTED%", urgente: false },
        { nome: "Ricotta salata",  qta: "200 g",     badge: "",         colore: "",        urgente: false }
      ]},
      { nome: "Dispensa", righe: [
        { nome: "Pomodori pelati", qta: "3 lattine", badge: "", colore: "", urgente: false },
        { nome: "Pasta rigatoni",  qta: "500 g",     badge: "", colore: "", urgente: false },
        { nome: "Sedano rapa",     qta: "1",         badge: "", colore: "", urgente: false }
      ]}
    ];
    let urgenti = 0;
    const sezioni = dati.map((sez, si) => ({
      nome: sez.nome,
      righe: sez.righe.map((r, ri) => {
        const chiave = si + "-" + ri;
        const finito = this.state.finiti[chiave] === true;
        if (r.urgente && !finito) urgenti++;
        return {
          nome: r.nome, qta: r.qta,
          badge: finito ? "finito" : r.badge,
          badgeBg: finito ? "%LINE%" : (r.badge ? r.colore + "18" : "transparent"),
          badgeColore: finito ? "%SOFT%" : (r.badge ? r.colore : "transparent"),
          strike: finito ? "line-through" : "none",
          opacita: finito ? "0.45" : "1",
          consuma: () => {
            const next = Object.assign({}, this.state.finiti);
            next[chiave] = !next[chiave];
            this.setState({ finiti: next });
          }
        };
      })
    }));
    return {
      sezioni: sezioni,
      inScadenza: urgenti > 0,
      avviso: urgenti === 1 ? "1 prodotto scade entro domani" : urgenti + " prodotti scadono entro domani"
    };
  }
}'''.replace("%MUTED%", MUTED).replace("%LINE%", LINE).replace("%SOFT%", SOFT)

open("Dispensa.dc.html","w").write(wrap(disp_body, "house", disp_logic))
print("Dispensa interattiva")
