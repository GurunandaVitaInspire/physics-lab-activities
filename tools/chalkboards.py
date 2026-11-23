"""Draw one chalkboard per lesson with the claude-drawing skill (chalk style).
Usage: python tools/chalkboards.py public/boards [lesson numbers...]  (then convert to 960x540 JPG)
Requires the claude-drawing skill in ~/.claude/skills/claude-drawing plus numpy + Pillow."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.expanduser('~'), '.claude', 'skills', 'claude-drawing', 'lib'))
from chalk import Chalkboard, WHITE, YELLOW, PINK, BLUE, RED, ORANGE, GREEN, VIOLET

out_dir = sys.argv[1]
only = sys.argv[2:] or None
os.makedirs(out_dir, exist_ok=True)
W, H = 1200, 675


SUB = '₀₁₂₃₄₅₆₇₈₉'


def chem(cb, s, x, y, size, colour=WHITE):
    """Write a formula, drawing unicode subscripts as small lowered digits (the chalk fonts lack those glyphs)."""
    runs, cur, sub = [], '', False
    for ch in s:
        is_sub = ch in SUB
        if is_sub != sub and cur:
            runs.append((cur, sub)); cur = ''
        sub = is_sub
        cur += str(SUB.index(ch)) if is_sub else ch
    if cur:
        runs.append((cur, sub))
    for text, is_sub in runs:
        sz = size * 0.62 if is_sub else size
        cb.text(text, x, y + (size * 0.2 if is_sub else 0), sz, colour)
        x += cb.text_width(text, sz) + (2 if is_sub else 0)
    return x


def board(seed, title):
    cb = Chalkboard(W, H, seed=seed)
    cb.slate()
    with cb.erased(keep=0.25, angle=2):
        cb.text('Class X · Physical Science', 640, 600, 30)
    cb.swipe([(40, 300), (600, 280), (1160, 320)], width=120, strength=0.5)
    cb.dust(amount=0.8)
    cb.text(title, 70, 110, 54)
    cb.underline(70, 70 + min(1000, cb.text_width(title, 54)), 128, YELLOW)
    return cb


def finish(cb, n):
    cb.frame()
    cb.chalk_stick(260, cb.tray_y, 80, WHITE)
    cb.chalk_stick(380, cb.tray_y, 60, YELLOW, rot=4)
    cb.eraser(930, cb.tray_y + 7, w=160, h=42)
    cb.save(os.path.join(out_dir, f'lesson{n}.png'))
    print('saved lesson', n, flush=True)


def tube(cb, x, y, h=250, w=56, colour=WHITE):
    # a test tube: two walls and a round bottom
    r = w / 2
    pts = [(x - r, y)] + [(x - r, y + h - r)]
    pts += [(x - r * math.cos(a), y + h - r + r * math.sin(a)) for a in [i / 12 * math.pi for i in range(13)]]
    pts += [(x + r, y)]
    cb.stroke(pts, colour, width=4.2, smooth=True)
    cb.line(x - r - 8, y, x - r + 4, y, colour, width=3.5)
    cb.line(x + r - 4, y, x + r + 8, y, colour, width=3.5)


def L1():
    cb = board(1, 'Chemical Reactions')
    tube(cb, 230, 190, 280, 70)
    for i in range(10):
        cb.circle(205 + (i * 37) % 50, 420 - i * 22, 5 + (i % 3) * 2, WHITE, width=2.6)
    cb.text('Zn', 205, 445, 30, YELLOW)
    cb.arrow([(330, 230), (360, 170), (400, 150)], YELLOW)
    chem(cb, 'H₂  pop!', 410, 160, 40, YELLOW)
    chem(cb, 'Zn + 2HCl → ZnCl₂ + H₂↑', 420, 330, 46)
    chem(cb, 'Pb(NO₃)₂ + 2KI → PbI₂↓ + 2KNO₃', 420, 420, 38, PINK)
    chem(cb, 'PbI₂ — a bright yellow precipitate', 420, 490, 32, YELLOW)
    finish(cb, 1)


def L2():
    cb = board(2, 'Water of Crystallisation')
    tube(cb, 240, 190, 260, 70)
    for i in range(7):
        cb.dot(220 + (i * 13) % 40, 420 - (i % 3) * 10, 6, BLUE)
    for i in range(4):
        cb.dot(235 + i * 6, 220 + i * 14, 3, WHITE)
    cb.text('drops of water', 300, 240, 30)
    cb.arrow([(296, 232), (262, 226)], WHITE, head=12)
    chem(cb, 'CuSO₄·5H₂O', 430, 330, 48, BLUE)
    cb.arrow([(720, 315), (820, 315)], WHITE)
    cb.text('heat', 740, 295, 28, ORANGE)
    chem(cb, 'CuSO₄ + 5H₂O', 840, 330, 48)
    cb.text('blue', 520, 390, 34, BLUE)
    cb.text('white', 900, 390, 34)
    cb.text('add water → blue again', 520, 480, 38, YELLOW)
    finish(cb, 2)


def L3():
    cb = board(3, 'Metals and Non-metals')
    # a nail
    cb.line(170, 200, 170, 460, WHITE, width=7)
    cb.line(140, 200, 200, 200, WHITE, width=7)
    cb.stroke([(162, 460), (170, 490), (178, 460)], WHITE, width=5)
    cb.side((170, 300), (170, 440), ORANGE, stick=16, pressure=0.5)
    cb.text('rust', 210, 380, 32, ORANGE)
    chem(cb, 'Fe + CuSO₄ → FeSO₄ + Cu', 330, 300, 46)
    cb.text('blue', 520, 360, 30, BLUE)
    cb.text('pale green', 650, 360, 30, GREEN)
    cb.text('air + water → rust', 330, 450, 44, ORANGE)
    cb.box(320, 410, 760, 470, YELLOW)
    finish(cb, 3)


def L4():
    cb = board(4, 'Carbon Compounds')
    # micelle: oil drop with soap tails pointing in, heads out
    cx, cy, r = 250, 340, 70
    cb.loop(cx, cy, r, r, YELLOW, turns=1.05)
    for k in range(14):
        a = k / 14 * math.tau
        x0, y0 = cx + math.cos(a) * (r - 30), cy + math.sin(a) * (r - 30)
        x1, y1 = cx + math.cos(a) * (r + 22), cy + math.sin(a) * (r + 22)
        cb.line(x0, y0, x1, y1, WHITE, width=2.6)
        cb.dot(x1 + math.cos(a) * 6, y1 + math.sin(a) * 6, 6, BLUE)
    cb.text('oil', 228, 350, 30, YELLOW)
    cb.text('micelle', 190, 470, 32)
    chem(cb, 'CH₃COOH + C₂H₅OH', 420, 300, 42)
    chem(cb, '→  CH₃COOC₂H₅ + H₂O', 470, 360, 42)
    cb.text('ester — fruity smell', 470, 420, 34, PINK)
    chem(cb, 'CO₂ turns lime water milky', 420, 500, 34, YELLOW)
    finish(cb, 4)


def L9():
    cb = board(9, 'Reflection & Refraction')
    ax = 330
    cb.rule(80, ax, 860, ax, WHITE, width=3)
    # concave mirror arc on the right
    pts = [(820 - 30 * ((y - ax) / 160) ** 2, y) for y in range(ax - 160, ax + 161, 16)]
    cb.stroke(pts, WHITE, width=5)
    for (x, lab) in [(820 - 150, 'F'), (820 - 300, 'C')]:
        cb.dot(x, ax, 6, YELLOW)
        cb.text(lab, x - 8, ax + 44, 34, YELLOW)
    # object beyond C (u = 440 px, f = 150 px) -> image between F and C at v = 228 px, m = -0.52
    cb.arrow([(380, ax), (380, ax - 110)], PINK)
    cb.line(380, ax - 110, 818, ax - 110, ORANGE, width=3.2)      # parallel ray ...
    cb.line(818, ax - 110, 592, ax + 57, ORANGE, width=3.2)       # ... reflects through F
    cb.line(380, ax - 110, 818, ax + 57, ORANGE, width=3.2)       # ray through F ...
    cb.line(818, ax + 57, 592, ax + 57, ORANGE, width=3.2)        # ... returns parallel
    cb.arrow([(592, ax), (592, ax + 57)], PINK)
    cb.text('1/v + 1/u = 1/f', 900, 220, 40)
    cb.text('m = −v/u', 900, 290, 40)
    cb.text('real · inverted', 900, 380, 32, PINK)
    finish(cb, 9)


def L10():
    cb = board(10, 'The Colourful World')
    # prism
    cb.stroke([(330, 470), (450, 230), (570, 470), (330, 470)], WHITE, width=4.5, smooth=False)
    cb.line(90, 360, 392, 352, WHITE, width=5)
    cb.text('white light', 90, 330, 30)
    cols = [RED, ORANGE, YELLOW, GREEN, BLUE, VIOLET]
    for k, c in enumerate(cols):
        cb.line(512, 360 + k * 3, 820, 330 + k * 26, c, width=4)
    cb.text('VIBGYOR', 850, 420, 44)
    cb.text('violet bends most, red least', 600, 560, 32, YELLOW)
    finish(cb, 10)


def L11():
    cb = board(11, 'Electricity')
    # V-I graph
    ox, oy = 150, 500
    cb.arrow([(ox, oy), (ox, 190)], WHITE)
    cb.arrow([(ox, oy), (560, oy)], WHITE)
    cb.text('V', ox - 40, 210, 34)
    cb.text('I', 560, oy + 40, 34)
    cb.line(ox, oy, 500, 230, YELLOW, width=4)
    for k in range(1, 5):
        cb.dot(ox + k * 85, oy - k * 66, 7, PINK)
    cb.text('V = IR', 640, 280, 60, YELLOW)
    cb.loop(720, 262, 110, 46, WHITE)
    cb.text('R = ρl / A', 640, 390, 44)
    chem(cb, 'Rs = R₁ + R₂ + R₃', 640, 460, 34)
    chem(cb, '1/Rp = 1/R₁ + 1/R₂ + 1/R₃', 640, 520, 34)
    finish(cb, 11)


def L12():
    cb = board(12, 'Magnetic Effects of Current')
    cx, cy = 300, 360
    cb.line(cx, 160, cx, 560, ORANGE, width=6)
    cb.arrow([(cx + 22, 330), (cx + 22, 250)], ORANGE, head=14)
    cb.text('I', cx + 34, 280, 34, ORANGE)
    for r in (60, 110, 160):
        cb.loop(cx, cy, r, r * 0.36, WHITE, turns=1.02)
    cb.arrow([(cx + 150, cy + 26), (cx + 120, cy + 48)], WHITE, head=14)
    cb.text('right-hand thumb rule', 560, 300, 40, YELLOW)
    cb.text('force on a wire in a field', 560, 380, 40)
    cb.text("Fleming's left-hand rule", 560, 450, 34, PINK)
    finish(cb, 12)


jobs = {'1': L1, '2': L2, '3': L3, '4': L4, '9': L9, '10': L10, '11': L11, '12': L12}
for k, fn in jobs.items():
    if only and k not in only:
        continue
    fn()
