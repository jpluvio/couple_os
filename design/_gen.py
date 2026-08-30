# Generatore delle schermate in direzione A (editoriale caldo).
# Un file .dc.html per artboard; il sistema visivo sta qui in un posto solo.

BG      = "#faf7f2"
SURF    = "#ffffff"
BORDER  = "#ece4d9"
INK     = "#1a1714"
MUTED   = "#8a7f74"
SOFT    = "#a49a8e"
ACCENT  = "#a8562e"
TINT    = "#f2ece2"
LINE    = "#f5efe6"
PAOLO   = "#a8562e"
GIULIA  = "#4a6b63"

FONTS = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&'
         'family=Public+Sans:wght@400;500;600&display=swap">')

ICONS = {
 "home":  '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/>',
 "cal":   '<path d="M6 2v4M18 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/>',
 "house": '<path d="M4 6h16M4 12h16M4 18h10"/>',
 "money": '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
 "heart": '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z"/>',
 "bell":  '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
 "cart":  '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 2-1.6L21 7H6"/>',
 "plus":  '<path d="M12 5v14M5 12h14"/>',
 "minus": '<path d="M5 12h14"/>',
 "check": '<path d="M20 6 9 17l-5-5"/>',
 "chat":  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
 "board": '<path d="M3 3h18v13H7l-4 4z"/>',
 "img":   '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
 "up":    '<path d="m18 15-6-6-6 6"/>',
}

def icon(name, color, size=20, sw=1.6):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="{color}" stroke-width="{sw}" stroke-linecap="round" '
            f'stroke-linejoin="round">{ICONS[name]}</svg>')

NAV = [("home","Oggi"),("cal","Agenda"),("house","Casa"),("money","Soldi"),("heart","Noi")]

def nav(active):
    out = []
    for key, label in NAV:
        on = key == active
        col = INK if on else SOFT
        weight = "600" if on else "400"
        out.append(
          f'<div style="display: flex; flex-direction: column; align-items: center; '
          f'gap: 5px; width: 62px;">{icon(key, col, 21)}'
          f'<div style="font-size: 10.5px; font-weight: {weight}; color: {col};">{label}</div></div>')
    return ('<div style="border-top: 1px solid ' + BORDER + '; background: #fffdfa; '
            'padding: 12px 16px 30px 16px; display: flex; justify-content: space-between;">'
            + "".join(out) + '</div>')

def page(body, active, title):
    return f'''<!doctype html>
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
{body}
<div style="flex-grow: 1;"></div>
{nav(active)}
</div>
</x-dc>
</body>
</html>
'''

def header(kicker, title, bell=True):
    b = ('<div style="width: 40px; height: 40px; border-radius: 20px; background: ' + TINT +
         '; display: flex; align-items: center; justify-content: center; position: relative; flex-shrink: 0;">'
         + icon("bell", "#5c5249", 19) +
         '<div style="position: absolute; top: 7px; right: 8px; width: 7px; height: 7px; '
         'border-radius: 4px; background: ' + ACCENT + ';"></div></div>') if bell else ''
    k = (f'<div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; '
         f'color: {MUTED};">{kicker}</div>') if kicker else ''
    return (f'<div style="padding: 56px 24px 18px 24px; display: flex; align-items: flex-start; '
            f'justify-content: space-between; gap: 12px;">'
            f'<div style="display: flex; flex-direction: column; gap: 3px;">{k}'
            f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 32px; '
            f'line-height: 1.08; font-weight: 400;">{title}</div></div>{b}</div>')

def card(inner, pad="18px 20px", extra=""):
    return (f'<div style="margin: 0 24px 12px 24px; padding: {pad}; background: {SURF}; '
            f'border: 1px solid {BORDER}; border-radius: 4px; {extra}">{inner}</div>')

def label(text):
    return (f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; '
            f'color: {ACCENT};">{text}</div>')


# ─────────────────────────── OGGI ───────────────────────────
def thread_row(color, title, sub):
    return (f'<div style="display: flex; gap: 12px; align-items: stretch;">'
            f'<div style="width: 3px; background: {color}; flex-shrink: 0;"></div>'
            f'<div style="display: flex; flex-direction: column; gap: 1px; padding: 1px 0;">'
            f'<div style="font-size: 15px; font-weight: 500;">{title}</div>'
            f'<div style="font-size: 13px; color: {MUTED};">{sub}</div></div></div>')

oggi = (
  header("Domenica 30 agosto", "Buongiorno,<br>Paolo e Giulia")
  + card(label("Oggi")
      + '<div style="display: flex; flex-direction: column; gap: 13px; margin-top: 14px;">'
      + thread_row(ACCENT, "Cena da Marta", "20:30 · con Giulia")
      + thread_row("#d8cfc2", "Pagare l'affitto", "Scade oggi · assegnato a te")
      + thread_row("#d8cfc2", "Yogurt in scadenza", "2 prodotti scadono domani")
      + '</div>')
  + '<div style="margin: 0 24px 12px 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">'
  + f'<div style="padding: 16px; background: {SURF}; border: 1px solid {BORDER}; border-radius: 4px; display: flex; flex-direction: column; gap: 10px;">'
  + icon("board", ACCENT, 20)
  + f'<div style="display: flex; flex-direction: column; gap: 2px;"><div style="font-size: 14px; font-weight: 600;">Bacheca</div>'
  + f'<div style="font-size: 13px; color: {MUTED};">2 nuovi messaggi</div></div></div>'
  + f'<div style="padding: 16px; background: {SURF}; border: 1px solid {BORDER}; border-radius: 4px; display: flex; flex-direction: column; gap: 10px;">'
  + icon("money", ACCENT, 20)
  + f'<div style="display: flex; flex-direction: column; gap: 2px;"><div style="font-size: 14px; font-weight: 600;">Agosto</div>'
  + '<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 21px; line-height: 1;">€ 842,10</div></div></div>'
  + '</div>'
  + f'<div style="margin: 0 24px; padding: 16px 18px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">'
  + f'<div style="display: flex; flex-direction: column; gap: 3px;"><div style="font-size: 14px; font-weight: 600;">Check-in della settimana</div>'
  + f'<div style="font-size: 13px; color: #7a6f64;">Giulia ha già risposto</div></div>'
  + f'<div style="padding: 9px 16px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500; white-space: nowrap;">Rispondi</div></div>'
)
open("Main.dc.html","w").write(page(oggi, "home", "Oggi"))

# ─────────────────────────── AGENDA ───────────────────────────
days = ["L","M","M","G","V","S","D"]
strip = []
for i, d in enumerate(days):
    on = i == 6
    bg = INK if on else "transparent"
    fg = BG if on else INK
    num = 24 + i
    strip.append(
      f'<div style="display: flex; flex-direction: column; align-items: center; gap: 7px; flex-grow: 1;">'
      f'<div style="font-size: 11px; color: {SOFT};">{d}</div>'
      f'<div style="width: 32px; height: 32px; border-radius: 16px; background: {bg}; color: {fg}; '
      f'display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500;">{num}</div></div>')

def event(color, time, title, sub):
    return (f'<div style="display: flex; gap: 14px; align-items: stretch; padding: 14px 0; border-bottom: 1px solid {LINE};">'
            f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 15px; width: 46px; color: {MUTED}; padding-top: 1px;">{time}</div>'
            f'<div style="width: 3px; background: {color}; flex-shrink: 0;"></div>'
            f'<div style="display: flex; flex-direction: column; gap: 2px;">'
            f'<div style="font-size: 15px; font-weight: 500;">{title}</div>'
            f'<div style="font-size: 13px; color: {MUTED};">{sub}</div></div></div>')

agenda = (
  header("Agosto 2026", "Agenda")
  + f'<div style="margin: 0 20px 18px 20px; display: flex; gap: 2px;">{"".join(strip)}</div>'
  + f'<div style="margin: 0 24px;"><div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin-bottom: 4px;">Domenica 30</div>'
  + event(GIULIA, "09:30", "Mercato con Giulia", "Piazza delle Erbe")
  + event(PAOLO, "18:00", "Palestra", "solo tu")
  + event(GIULIA, "20:30", "Cena da Marta", "insieme")
  + '</div>'
  + f'<div style="margin: 20px 24px 0 24px; display: flex; gap: 18px;">'
  + f'<div style="display: flex; align-items: center; gap: 7px;"><div style="width: 9px; height: 9px; border-radius: 5px; background: {PAOLO};"></div>'
  + f'<div style="font-size: 12.5px; color: {MUTED};">Paolo</div></div>'
  + f'<div style="display: flex; align-items: center; gap: 7px;"><div style="width: 9px; height: 9px; border-radius: 5px; background: {GIULIA};"></div>'
  + f'<div style="font-size: 12.5px; color: {MUTED};">Giulia</div></div></div>'
)
open("Agenda.dc.html","w").write(page(agenda, "cal", "Agenda"))

# ─────────────────────────── DISPENSA ───────────────────────────
def pantry_row(name, qty, expiry=None, exp_color=None, last=False):
    border = "" if last else f"border-bottom: 1px solid {LINE};"
    badge = ""
    if expiry:
        badge = (f'<div style="padding: 3px 9px; border-radius: 2px; background: {exp_color}18; '
                 f'font-size: 11px; font-weight: 600; color: {exp_color}; white-space: nowrap;">{expiry}</div>')
    return (f'<div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; {border}">'
            f'<div style="flex-grow: 1; font-size: 15px;">{name}</div>'
            f'<div style="font-size: 13.5px; color: {MUTED};">{qty}</div>{badge}</div>')

def section(title, rows):
    return (f'<div style="margin-bottom: 20px;">'
            f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin-bottom: 2px;">{title}</div>'
            + "".join(rows) + '</div>')

dispensa = (
  header(None, "Dispensa")
  + '<div style="margin: 0 24px 18px 24px; display: flex; gap: 7px;">'
  + f'<div style="padding: 8px 15px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500;">Dispensa</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Spesa</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Ricette</div>'
  + '</div>'
  + f'<div style="margin: 0 24px 14px 24px; padding: 13px 16px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; gap: 11px;">'
  + icon("bell", ACCENT, 17)
  + f'<div style="font-size: 13.5px; color: #6d6259;">2 prodotti scadono entro domani</div></div>'
  + '<div style="margin: 0 24px;">'
  + section("Frigo", [
      pantry_row("Yogurt greco", "4 vasetti", "Domani", "#c2410c"),
      pantry_row("Latte intero", "1 l", "Scaduto", "#b91c1c"),
      pantry_row("Uova", "6", "5 giorni", MUTED),
      pantry_row("Ricotta salata", "200 g", None, None, last=True),
    ])
  + section("Dispensa", [
      pantry_row("Pomodori pelati", "3 lattine"),
      pantry_row("Pasta rigatoni", "500 g"),
      pantry_row("Sedano rapa", "1", None, None, last=True),
    ])
  + '</div>'
)
open("Dispensa.dc.html","w").write(page(dispensa, "house", "Dispensa"))

# ─────────────────────────── RICETTE ───────────────────────────
def ing_row(qty, name, badge=None, muted=False, last=False):
    border = "" if last else f"border-bottom: 1px solid {LINE};"
    qcol = SOFT if muted else ACCENT
    qfont = "'Public Sans', sans-serif" if muted else "'Newsreader', Georgia, serif"
    qsize = "13px" if muted else "15px"
    b = ""
    if badge:
        b = (f'<div style="padding: 3px 9px; border-radius: 2px; background: #16653418; '
             f'font-size: 11px; font-weight: 600; color: #166534; white-space: nowrap;">{badge}</div>')
    ncol = MUTED if muted else INK
    return (f'<div style="display: flex; align-items: center; gap: 12px; padding: 11px 0; {border}">'
            f'<div style="font-family: {qfont}; font-size: {qsize}; font-weight: 500; width: 62px; color: {qcol};">{qty}</div>'
            f'<div style="font-size: 14.5px; flex-grow: 1; color: {ncol};">{name}</div>{b}</div>')

ricette = (
  header(None, "Ricette")
  + '<div style="margin: 0 24px 16px 24px; display: flex; gap: 7px;">'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Dispensa</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Spesa</div>'
  + f'<div style="padding: 8px 15px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500;">Ricette</div>'
  + '</div>'
  + card(
      f'<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;">'
      f'<div style="display: flex; flex-direction: column; gap: 2px;">'
      f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 23px; line-height: 1.1;">Pasta alla Norma</div>'
      f'<div style="font-size: 13px; color: {MUTED};">Ricetta base per 2 persone</div></div>'
      + icon("up", SOFT, 20) + '</div>'
      + f'<div style="display: flex; align-items: center; justify-content: space-between; background: {BG}; '
        f'border: 1px solid {BORDER}; border-radius: 3px; padding: 10px 12px; margin: 16px 0 4px 0;">'
        f'<div style="font-size: 14px; color: {MUTED};">Porzioni</div>'
        f'<div style="display: flex; align-items: center; gap: 16px;">'
        f'<div style="width: 32px; height: 32px; border-radius: 16px; background: {SURF}; border: 1px solid {BORDER}; '
        f'display: flex; align-items: center; justify-content: center;">{icon("minus", ACCENT, 14, 2)}</div>'
        f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 21px; min-width: 20px; text-align: center;">4</div>'
        f'<div style="width: 32px; height: 32px; border-radius: 16px; background: {ACCENT}; '
        f'display: flex; align-items: center; justify-content: center;">{icon("plus", "#ffffff", 14, 2)}</div></div></div>'
      + f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin: 16px 0 2px 0;">Ingredienti · ricalcolati per 4</div>'
      + ing_row("400 g", "Sedano rapa", badge="in dispensa")
      + ing_row("2", "Melanzane")
      + ing_row("500 g", "Pomodori pelati", badge="in dispensa")
      + ing_row("160 g", "Ricotta salata")
      + ing_row("q.b.", "Basilico", muted=True, last=True)
      + f'<div style="display: flex; align-items: center; justify-content: center; gap: 9px; background: {INK}; '
        f'border-radius: 2px; padding: 14px; margin-top: 18px;">{icon("cart", "#ffffff", 17, 1.7)}'
        f'<div style="font-size: 14.5px; font-weight: 500; color: {BG};">Aggiungi 2 alla lista</div></div>'
      + f'<div style="font-size: 12px; color: {SOFT}; text-align: center; line-height: 1.5; margin-top: 10px;">'
        f'Sedano rapa e pelati li hai già: restano fuori.<br>Le quantità si sommano a quelle già in lista.</div>'
    )
)
open("Ricette.dc.html","w").write(page(ricette, "house", "Ricette"))

# ─────────────────────────── SOLDI ───────────────────────────
# Palette categorica validata (ΔE CVD ≥ 8 su tutte le coppie adiacenti),
# la stessa già usata in constants/finance.ts.
CATS = [("Casa","#2a78d6","312,40",37),("Cibo","#eb6834","228,90",27),
        ("Trasporti","#1baf7a","141,60",17),("Svago","#eda100","96,20",11),
        ("Altre 2","#9ca3af","63,00",8)]

bars = []
heights = [42,63,51,88,74,65]
labels = ["mar","apr","mag","giu","lug","ago"]
for i,(h,l) in enumerate(zip(heights,labels)):
    on = i == 5
    bars.append(f'<div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: flex-end; height: 96px;">'
                f'<div style="height: {h}%; background: {ACCENT if on else "#e5d9c9"};"></div></div>')
month_labels = "".join(
  f'<div style="flex-grow: 1; text-align: center; font-size: 11px; color: {INK if i==5 else SOFT}; '
  f'font-weight: {"600" if i==5 else "400"};">{l}</div>' for i,l in enumerate(labels))

cat_rows = []
for name, col, amt, pct in CATS:
    cat_rows.append(
      f'<div style="margin-bottom: 13px;">'
      f'<div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 5px;">'
      f'<div style="font-size: 14px;">{name}</div>'
      f'<div style="display: flex; align-items: baseline; gap: 8px;">'
      f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 15px;">€ {amt}</div>'
      f'<div style="font-size: 12px; color: {SOFT}; width: 30px; text-align: right;">{pct}%</div></div></div>'
      f'<div style="height: 6px; background: {LINE};"><div style="height: 100%; width: {pct*2.7}%; background: {col};"></div></div></div>')

soldi = (
  header("Agosto 2026", "Soldi")
  + '<div style="margin: 0 24px 16px 24px; display: flex; gap: 7px;">'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Spese</div>'
  + f'<div style="padding: 8px 15px; background: {INK}; color: {BG}; border-radius: 2px; font-size: 13px; font-weight: 500;">Analisi</div>'
  + f'<div style="padding: 8px 15px; background: {SURF}; border: 1px solid {BORDER}; color: {MUTED}; border-radius: 2px; font-size: 13px;">Budget</div>'
  + '</div>'
  + card(
      f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {MUTED};">Speso questo mese</div>'
      f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 38px; line-height: 1.1; margin: 6px 0 4px 0;">€ 842,10</div>'
      f'<div style="font-size: 13.5px; color: {MUTED};"><span style="color: #15803d; font-weight: 600;">▼ € 118,40 (12%)</span> rispetto a luglio</div>')
  + card(
      '<div style="font-size: 14px; font-weight: 600;">Andamento</div>'
      f'<div style="font-size: 12.5px; color: {SOFT}; margin: 2px 0 16px 0;">Ultimi 6 mesi</div>'
      f'<div style="display: flex; gap: 7px; align-items: flex-end;">{"".join(bars)}</div>'
      f'<div style="height: 1px; background: {BORDER}; margin-top: 6px;"></div>'
      f'<div style="display: flex; gap: 7px; margin-top: 7px;">{month_labels}</div>')
  + card(
      '<div style="font-size: 14px; font-weight: 600;">Dove sono finiti i soldi</div>'
      f'<div style="font-size: 12.5px; color: {SOFT}; margin: 2px 0 16px 0;">Categorie principali di agosto</div>'
      + "".join(cat_rows))
)
open("Soldi.dc.html","w").write(page(soldi, "money", "Soldi"))

# ─────────────────────────── NOI (check-in) ───────────────────────────
moods = [("Bene","#15803d"),("Così","#a8562e"),("Giù","#7c6f64")]
mood_pills = "".join(
  f'<div style="flex-grow: 1; text-align: center; padding: 11px 0; border: 1px solid {c if i==0 else BORDER}; '
  f'background: {c+"12" if i==0 else SURF}; border-radius: 2px; font-size: 13.5px; '
  f'font-weight: {"600" if i==0 else "400"}; color: {c if i==0 else MUTED};">{m}</div>'
  for i,(m,c) in enumerate(moods))

noi = (
  header("Check-in · settimana 35", "Come stiamo?")
  + card(
      f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 20px; line-height: 1.35;">'
      f'"Cosa ti ha fatto sentire più vicino a me questa settimana?"</div>'
      f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin: 20px 0 10px 0;">Come ti senti</div>'
      f'<div style="display: flex; gap: 8px;">{mood_pills}</div>'
      f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; margin: 20px 0 10px 0;">La tua risposta</div>'
      f'<div style="background: {BG}; border: 1px solid {BORDER}; border-radius: 3px; padding: 13px; min-height: 74px; '
      f'font-size: 14px; color: {SOFT};">Scrivi qui…</div>'
      f'<div style="display: flex; align-items: center; justify-content: center; background: {INK}; border-radius: 2px; '
      f'padding: 14px; margin-top: 16px;"><div style="font-size: 14.5px; font-weight: 500; color: {BG};">Invia la risposta</div></div>')
  + f'<div style="margin: 0 24px; padding: 15px 18px; background: {TINT}; border-radius: 4px; display: flex; align-items: center; gap: 12px;">'
  + f'<div style="width: 30px; height: 30px; border-radius: 15px; background: {GIULIA}; color: #ffffff; font-size: 12px; '
    f'font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">G</div>'
  + f'<div style="font-size: 13.5px; color: #6d6259; line-height: 1.45;">Giulia ha già risposto.<br>'
    f'Vedrai la sua risposta quando invii la tua.</div></div>'
)
open("Noi.dc.html","w").write(page(noi, "heart", "Noi"))

# ─────────────────────────── BACHECA ───────────────────────────
def post(initial, color, who, when, text, reactions, pinned=False):
    pin = (f'<div style="font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; '
           f'color: {ACCENT}; margin-bottom: 10px;">In evidenza</div>') if pinned else ''
    chips = "".join(
      f'<div style="padding: 4px 10px; border: 1px solid {BORDER}; border-radius: 20px; font-size: 12px; '
      f'color: {MUTED};">{r}</div>' for r in reactions)
    return card(
      pin
      + f'<div style="display: flex; gap: 11px; align-items: center; margin-bottom: 11px;">'
        f'<div style="width: 30px; height: 30px; border-radius: 15px; background: {color}; color: #ffffff; '
        f'font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center;">{initial}</div>'
        f'<div style="display: flex; flex-direction: column; gap: 0px;">'
        f'<div style="font-size: 13.5px; font-weight: 600;">{who}</div>'
        f'<div style="font-size: 12px; color: {SOFT};">{when}</div></div></div>'
      + f'<div style="font-size: 15px; line-height: 1.5; text-wrap: pretty;">{text}</div>'
      + (f'<div style="display: flex; gap: 7px; margin-top: 13px;">{chips}</div>' if reactions else ''),
      extra=f"border-left: 2px solid {ACCENT};" if pinned else "")

bacheca = (
  header(None, "Bacheca")
  + post("G", GIULIA, "Giulia", "2 ore fa",
         "Ho prenotato per sabato alle 20. Se non ti va cambiamo, ma il posto sembrava carino.",
         ["❤️ 1", "👍 1"], pinned=True)
  + post("P", PAOLO, "Paolo", "ieri",
         "Ricordati che giovedì passa il tecnico per la caldaia, fra le 9 e le 12.",
         ["👍 1"])
  + post("G", GIULIA, "Giulia", "3 giorni fa",
         "Ho finito il libro che mi avevi consigliato. Ne parliamo?",
         [])
)
open("Bacheca.dc.html","w").write(page(bacheca, "home", "Bacheca"))

# ─────────────────────────── MEMORIES ───────────────────────────
def photo(tone, h=150):
    # Segnaposto: nessuna immagine reale disponibile.
    return (f'<div style="height: {h}px; background: {tone}; border-radius: 3px; '
            f'display: flex; align-items: center; justify-content: center;">'
            + icon("img", "#ffffff88", 26, 1.4) + '</div>')

def memory(date, title, tone, tags, wide=True):
    chips = "".join(
      f'<div style="padding: 3px 9px; background: {TINT}; border-radius: 20px; font-size: 11.5px; '
      f'color: #6d6259;">{t}</div>' for t in tags)
    return card(
      f'<div style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: {ACCENT}; '
      f'margin-bottom: 10px;">{date}</div>'
      + photo(tone)
      + f'<div style="font-family: \'Newsreader\', Georgia, serif; font-size: 19px; line-height: 1.25; margin: 13px 0 0 0;">{title}</div>'
      + (f'<div style="display: flex; gap: 6px; margin-top: 11px;">{chips}</div>' if tags else ''),
      pad="16px")

memories = (
  header(None, "Memories")
  + f'<div style="margin: 0 24px 14px 24px; padding: 13px 16px; background: {TINT}; border-radius: 4px; '
    f'display: flex; align-items: center; gap: 11px;">'
  + icon("heart", ACCENT, 17)
  + f'<div style="font-size: 13.5px; color: #6d6259;">Un anno fa oggi: Cinque Terre</div></div>'
  + memory("30 agosto 2026", "Il mercato di domenica mattina", "#c9b8a3", ["weekend", "casa"])
  + memory("18 agosto 2026", "Tre giorni in Val di Susa", "#a8967f", ["viaggio"])
)
open("Memories.dc.html","w").write(page(memories, "heart", "Memories"))
