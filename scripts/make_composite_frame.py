from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import os

WIDTH, HEIGHT = 1920, 1080
CENTER_X, CENTER_Y = WIDTH // 2, HEIGHT // 2 + 30

CHARACTERS = [
    # filename, label, bottom_crop_pct (exclude watermark area), top_offset_pct
    ("akiyama-mio.jpg", "Mio", 0.28, 0.0),
    ("tachibana-kanade.jpg", "Kanade", 0.10, 0.0),
    ("shana.jpg", "Shana", 0.30, 0.0),
    ("kato-megumi.jpg", "Megumi", 0.30, 0.0),
    ("rem.jpg", "Rem", 0.08, 0.0),
    ("violet-evergarden.png", "Violet", 0.08, 0.0),
    ("elaina.jpg", "Elaina", 0.28, 0.0),
    ("misaka-mikoto.jpg", "Mikoto", 0.05, 0.0),
]

BG_PATH = "images/generated/nebula-bg.jpg"
if os.path.exists(BG_PATH):
    bg = Image.open(BG_PATH).convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)
else:
    bg = Image.new("RGB", (WIDTH, HEIGHT), "#0a0a1a")
    draw = ImageDraw.Draw(bg)
    for y in range(HEIGHT):
        r = int(10 + (y / HEIGHT) * 15)
        g = int(10 + (y / HEIGHT) * 10)
        b = int(26 + (y / HEIGHT) * 20)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))

bg = bg.filter(ImageFilter.GaussianBlur(4))

draw = ImageDraw.Draw(bg)

# Ambient nebula glows
glow1 = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
g1 = ImageDraw.Draw(glow1)
for r in range(300, 0, -5):
    alpha = int(30 * (r / 300))
    g1.ellipse([CENTER_X - r, CENTER_Y - r - 50, CENTER_X + r, CENTER_Y + r - 50], fill=(80, 60, 180, alpha))
bg = Image.alpha_composite(bg.convert("RGBA"), glow1).convert("RGB")

draw = ImageDraw.Draw(bg)

# Card arrangement in ellipse
card_w, card_h = 195, 270
rx, ry = 720, 330
angles = [i * (2 * math.pi / 8) - math.pi / 2 for i in range(8)]

positions = []
for i, angle in enumerate(angles):
    x = CENTER_X + rx * math.cos(angle)
    y = CENTER_Y + ry * math.sin(angle)
    positions.append((int(x - card_w / 2), int(y - card_h / 2)))

# Constellation lines between cards
bg = bg.convert("RGBA")
for i in range(len(positions)):
    x1 = positions[i][0] + card_w // 2
    y1 = positions[i][1] + card_h // 2
    x2 = positions[(i + 1) % len(positions)][0] + card_w // 2
    y2 = positions[(i + 1) % len(positions)][1] + card_h // 2
    for (ax, ay, bx, by, alpha) in [
        (x1, y1, x2, y2, 40),
        (x1, y1, CENTER_X, CENTER_Y, 25)
    ]:
        overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.line([(ax, ay), (bx, by)], fill=(0, 200, 255, alpha), width=2)
        overlay = overlay.filter(ImageFilter.GaussianBlur(3))
        bg = Image.alpha_composite(bg, overlay)

# Place character cards
base_dir = "images/login"
for i, (filename, name, bottom_crop, top_offset) in enumerate(CHARACTERS):
    path = os.path.join(base_dir, filename)
    if not os.path.exists(path):
        print(f"Missing {path}")
        continue
    img = Image.open(path).convert("RGBA")
    src_w, src_h = img.size

    # First crop away watermark area at bottom and apply top offset
    crop_top = int(src_h * top_offset)
    crop_bottom = int(src_h * (1 - bottom_crop))
    img = img.crop((0, crop_top, src_w, crop_bottom))
    src_w, src_h = img.size

    # Crop to portrait ratio, focus on center/upper body
    target_ratio = card_w / card_h
    src_ratio = src_w / src_h
    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        # bias toward top to keep face visible
        top = int((src_h - new_h) * 0.25)
        img = img.crop((0, top, src_w, top + new_h))
    img = img.resize((card_w, card_h), Image.LANCZOS)

    # Bottom gradient overlay to hide any remaining text edge
    gradient = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gradient)
    fade_height = int(card_h * 0.18)
    for y in range(fade_height):
        alpha = int(180 * (y / fade_height))
        gd.line([(0, card_h - fade_height + y), (card_w, card_h - fade_height + y)], fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, gradient)

    # Glass card frame
    card = Image.new("RGBA", (card_w + 10, card_h + 10), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    # shadow
    cd.rounded_rectangle([8, 8, card_w + 2, card_h + 2], radius=18, fill=(0, 0, 0, 120))
    # glass bg
    cd.rounded_rectangle([0, 0, card_w, card_h], radius=16, fill=(255, 255, 255, 35))
    # border glow
    cd.rounded_rectangle([0, 0, card_w, card_h], radius=16, outline=(200, 230, 255, 120), width=2)
    # inner sheen
    cd.rounded_rectangle([4, 4, card_w - 4, 40], radius=12, fill=(255, 255, 255, 40))

    # Mask image to rounded rect
    mask = Image.new("L", (card_w, card_h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, card_w, card_h], radius=16, fill=255)
    img.putalpha(mask)

    card.paste(img, (0, 0), img)

    # Outer glow (full-size overlay)
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    px, py = positions[i]
    cx = px + card_w // 2
    cy = py + card_h // 2
    for r in range(40, 0, -4):
        alpha = int(35 * (r / 40))
        gd.rounded_rectangle([cx - card_w//2 - r, cy - card_h//2 - r, cx + card_w//2 + r, cy + card_h//2 + r], radius=16 + r, outline=(100, 200, 255, alpha), width=2)
    glow = glow.filter(ImageFilter.GaussianBlur(10))
    bg = Image.alpha_composite(bg.convert("RGBA"), glow)

    # Card layer (full-size overlay)
    card_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    card_layer.paste(card, (px, py), card)
    bg = Image.alpha_composite(bg, card_layer)

# Title
bg = bg.convert("RGBA")
draw = ImageDraw.Draw(bg)

# Try to load a font
try:
    font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 84)
except:
    font_large = ImageFont.load_default()

title = "NEBULA CHRONICLE"
bbox = draw.textbbox((0, 0), title, font=font_large)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = (WIDTH - tw) // 2
ty = CENTER_Y - th // 2 - 10

# title glow
for offset in range(20, 0, -4):
    alpha = int(30 * (offset / 20))
    draw.text((tx, ty), title, font=font_large, fill=(0, 243, 255, alpha))

draw.text((tx, ty), title, font=font_large, fill=(240, 250, 255, 255))



out_path = "images/generated/nebula-trailer-frame.jpg"
bg.convert("RGB").save(out_path, quality=95)
print(f"Saved composite frame to {out_path}")
