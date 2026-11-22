"""Genera las cinco imagenes del articulo sobre el experimento E04.

Uso, desde la raiz del repositorio:  python docs/articles/img/make_charts.py
Lee los CSV publicados y escribe los PNG en docs/articles/img/.
"""
import csv
import os
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

DATA = Path("experiments/E04-slot-gauge/data/confirmatory")
OUT = Path("docs/articles/img")

GRAY, BLUE, RED, DARK = "#8C8C8C", "#2F6DB5", "#D1495B", "#222222"
SECOND, TRACK, STEEL = "#555555", "#F0F0F0", "#B8C4D0"
LIGHT_GRAY, LIGHT_BLUE = "#CFCFCF", "#B3C9E6"
ARM_NAME = {"kit-bare": "Sin las pruebas", "kit-tests": "Con las pruebas"}
ARM_COLOR = {"kit-bare": GRAY, "kit-tests": BLUE}
SLOT_NAME = {"signature": "Firma del pago", "discount": "Descuento",
             "ledger": "Asientos contables", "webhook": "Decisión del webhook",
             "cart": "Validación del carrito"}
FOOTER = ("Fuente: OpenFabric, experimento E04. 100 repeticiones, modelo "
          "Qwen2.5-Coder 7B. Datos públicos en el repositorio.")
W, H, M = 1600, 900, 80  # lienzo y margen


def fail(msg):
    sys.exit(f"DATOS NO COINCIDEN: {msg}")


def expect(label, got, want):
    if got != want:
        fail(f"{label}: obtenido {got!r}, esperado {want!r}")


# ---------------------------------------------------------------- datos
def read(name):
    with open(DATA / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def flag(v):
    return str(v).strip().lower() in ("1", "true")


def load():
    runs, attempts = read("runs.csv"), read("attempts.csv")
    for r in runs:
        r["arm_name"] = r["arm"].split(".")[0]
        r["gp"], r["ok"] = flag(r["gauge_pass"]), flag(r["correct"])
    expect("filas de runs", len(runs), 100)
    expect("filas de attempts", len(attempts), 220)
    arms = ("kit-bare", "kit-tests")
    correct = {a: sum(r["ok"] for r in runs if r["arm_name"] == a) for a in arms}
    expect("correctas", correct, {"kit-bare": 21, "kit-tests": 19})
    classes = {}
    for a in arms:
        rs = [r for r in runs if r["arm_name"] == a]
        classes[a] = (sum(r["ok"] and r["gp"] for r in rs),
                      sum(not r["ok"] and not r["gp"] for r in rs),
                      sum(not r["ok"] and r["gp"] for r in rs))
        expect(f"{a} correcto sin aprobar", sum(r["ok"] and not r["gp"] for r in rs), 0)
    expect("clases", classes, {"kit-bare": (21, 6, 23), "kit-tests": (19, 18, 13)})
    slots = {s: {a: sum(r["gp"] == r["ok"] for r in runs
                        if r["arm_name"] == a and r["slot"] == s) for a in arms}
             for s in SLOT_NAME}
    want = {"signature": (0, 10), "discount": (4, 5), "ledger": (10, 10),
            "webhook": (5, 5), "cart": (8, 7)}
    expect("decisiones por funcion",
           {s: (v["kit-bare"], v["kit-tests"]) for s, v in slots.items()}, want)
    toks = [int(a["prompt_tokens"]) + int(a["completion_tokens"]) for a in attempts]
    total = sum(toks)
    first = sum(t for a, t in zip(attempts, toks) if a["attempt"] == "1")
    expect("tokens totales", total, 954079)
    expect("tokens primer intento", first, 350253)
    expect("tokens reintentos", total - first, 603826)
    expect("porcentaje reintentos", round(100 * (total - first) / total, 1), 63.3)
    n_att = defaultdict(int)
    for a in attempts:
        n_att[(a["stack"], a["arm"], a["run"])] += 1
    multi = {k for k, n in n_att.items() if n > 1}
    changed = [r for r in runs
               if (r["stack"], r["arm"], r["run"]) in multi
               and flag(r["first_correct"]) != r["ok"]]
    expect("repeticiones con reintentos", len(multi), 24)
    expect("repeticiones con reintentos que cambiaron", len(changed), 0)
    print("correctas:", correct)
    print("clases (aprobado, detectado, sin aviso):", classes)
    print("decisiones acertadas por funcion:", {s: tuple(v.values()) for s, v in slots.items()})
    print("tokens:", total, first, total - first, f"{100*(total-first)/total:.1f}%")
    print("repeticiones con reintentos:", len(multi), "| cambiaron resultado:", len(changed))
    return correct, classes, slots, total, first, len(multi)


# ---------------------------------------------------------------- dibujo
def font(size, bold=False):
    base = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    names = ("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")
    for n in names:
        try:
            return ImageFont.truetype(str(base / n), size)
        except OSError:
            continue
    return ImageFont.load_default()


def tw(d, text, f):
    return d.textlength(text, font=f)


def wrap(d, text, f, maxw):
    lines, cur = [], ""
    for word in text.split():
        t = f"{cur} {word}".strip()
        if tw(d, t, f) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    if len(lines) == 2:  # reparte en dos lineas equilibradas
        words = text.split()
        best = min(range(1, len(words)), key=lambda i: max(
            tw(d, " ".join(words[:i]), f), tw(d, " ".join(words[i:]), f)))
        lines = [" ".join(words[:best]), " ".join(words[best:])]
    return lines


def text(d, xy, s, f, fill=DARK, anchor="ls"):
    d.text(xy, s, font=f, fill=fill, anchor=anchor)


def canvas(title, subtitle, size=(W, H)):
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    ft, fs = font(56, True), font(36)
    y = 40 + 56
    for line in wrap(d, title, ft, size[0] - 2 * M):
        text(d, (M, y), line, ft, DARK)
        y += 66
    y -= 66
    text(d, (M, y + 56), subtitle, fs, SECOND)
    text(d, (M, size[1] - 32), FOOTER, font(24), SECOND)
    return img, d, y + 56 + 40  # y libre bajo el encabezado


def bar(d, x, y, w, h, fill, r=6):
    if w > 0:
        d.rounded_rectangle([x, y, x + w, y + h], radius=min(r, w / 2), fill=fill)


def esc(n):
    return f"{n:,}".replace(",", ".")


# ---------------------------------------------------------------- graficos
def chart_correct(correct):
    img, d, y = canvas("Ver las pruebas no la hizo programar mejor",
                       "Repeticiones con código correcto, de 50")
    scale = (W - 2 * M) / 50
    f_name, f_val = font(40, True), font(40, True)
    y += 60
    for a in ("kit-bare", "kit-tests"):
        text(d, (M, y), ARM_NAME[a], f_name, DARK)
        by = y + 24
        bar(d, M, by, 50 * scale, 90, TRACK)
        bar(d, M, by, correct[a] * scale, 90, ARM_COLOR[a])
        text(d, (M + correct[a] * scale + 24, by + 45), f"{correct[a]} de 50",
             f_val, DARK, "lm")
        y += 24 + 90 + 90
    f_ax = font(30)
    text(d, (M, y - 30), "0", f_ax, SECOND)
    text(d, (W - M, y - 30), "50", f_ax, SECOND, "rs")
    return img


def chart_decision(classes):
    img, d, y = canvas("Pero sí supimos más veces cuándo falló",
                       "Qué pasó con cada una de las 50 repeticiones")
    seg_fill = [DARK, STEEL, RED]
    seg_ink = ["white", DARK, "white"]
    names = ["Correcto y aprobado", "Malo y detectado", "Malo y entregado sin aviso"]
    scale = (W - 2 * M) / 50
    f_name, f_val = font(40, True), font(44, True)
    y += 40
    for a in ("kit-bare", "kit-tests"):
        text(d, (M, y), ARM_NAME[a], f_name, DARK)
        x, by = M, y + 24
        for n, fill, ink in zip(classes[a], seg_fill, seg_ink):
            w = n * scale - 4  # hueco de 4 px entre segmentos
            d.rectangle([x, by, x + w, by + 110], fill=fill)
            text(d, (x + w / 2, by + 55), str(n), f_val, ink, "mm")
            x += n * scale
        y += 24 + 110 + 80
    # nombres de segmentos, una sola vez, bajo las barras
    f_key = font(34)
    widths = [tw(d, n, f_key) + 44 for n in names]
    x = M
    ky = y + 10
    gap = (W - 2 * M - sum(widths)) / 2
    for n, fill, w in zip(names, seg_fill, widths):
        d.rectangle([x, ky - 26, x + 28, ky + 2], fill=fill)
        text(d, (x + 44, ky), n, f_key, DARK)
        x += w + gap
    return img


def chart_by_slot(slots):
    img, d, y = canvas("Toda la mejora salió de una sola función",
                       "Decisiones acertadas de 10, por función")
    order = sorted(slots, key=lambda s: -abs(slots[s]["kit-tests"] - slots[s]["kit-bare"]))
    f_name, f_nameb, f_val, f_arm = font(36), font(38, True), font(36, True), font(32)
    x0, scale, bh = 520, 60, 40
    gh = (H - 70 - y) / len(order)
    for i, s in enumerate(order):
        top = i == 0
        gy = y + i * gh + (gh - (2 * bh + 6)) / 2
        text(d, (M, gy + bh + 3), SLOT_NAME[s], f_nameb if top else f_name,
             DARK if top else SECOND, "lm")
        for j, a in enumerate(("kit-bare", "kit-tests")):
            by = gy + j * (bh + 6)
            n = slots[s][a]
            fill = ARM_COLOR[a] if top else (LIGHT_GRAY if a == "kit-bare" else LIGHT_BLUE)
            bar(d, x0, by, n * scale, bh, fill)
            lx = x0 + n * scale + 16
            text(d, (lx, by + bh / 2), str(n), f_val if top else font(36),
                 DARK if top else SECOND, "lm")
            if top:
                text(d, (lx + tw(d, str(n), f_val) + 20, by + bh / 2), ARM_NAME[a],
                     f_arm, SECOND, "lm")
    return img


def chart_retries(total, first, n_multi):
    img, d, y = canvas("Reintentar costó el 63% de los tokens y no arregló nada",
                       f"{esc(total)} tokens en total")
    retry = total - first
    pf, pr = round(100 * first / total), round(100 * retry / total)
    bw, by, bh = W - 2 * M, y + 110, 130
    wf = bw * first / total
    d.rectangle([M, by, M + wf - 2, by + bh], fill=STEEL)
    d.rectangle([M + wf + 2, by, M + bw, by + bh], fill=DARK)
    f1, f2 = font(40, True), font(40)
    for x, name, n, p in ((M, "Primeros intentos", first, pf),
                          (M + wf + 2, "Reintentos", retry, pr)):
        text(d, (x, by + bh + 60), name, f1, DARK)
        text(d, (x, by + bh + 112), f"{esc(n)} ({p}%)", f2, DARK)
    text(d, (M, by + bh + 250),
         f"En las {n_multi} repeticiones con reintentos, ninguna cambió su resultado.",
         font(38, True), RED)
    return img


def main():
    correct, classes, slots, total, first, n_multi = load()
    OUT.mkdir(parents=True, exist_ok=True)
    for name, img in (("e04-correcto", chart_correct(correct)),
                      ("e04-decision", chart_decision(classes)),
                      ("e04-por-funcion", chart_by_slot(slots)),
                      ("e04-reintentos", chart_retries(total, first, n_multi))):
        path = OUT / f"{name}.png"
        img.save(path, optimize=True)
        print("escrito", path, img.size)


if __name__ == "__main__":
    main()
