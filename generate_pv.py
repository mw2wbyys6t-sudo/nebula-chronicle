#!/usr/bin/env python3
"""用现有人物海报生成角色展示微短片"""
import os
import subprocess
import tempfile
import shutil

CHARACTERS = [
    {"file": "akiyama-mio.jpg", "name": "秋山澪", "year": "2010 / 2011 萌王", "color": "#00f3ff"},
    {"file": "tachibana-kanade.jpg", "name": "立华奏", "year": "2012 萌王", "color": "#b026ff"},
    {"file": "shana.jpg", "name": "夏娜", "year": "2016 萌王", "color": "#ff2a6d"},
    {"file": "kato-megumi.jpg", "name": "加藤惠", "year": "2017 萌王", "color": "#ffe600"},
    {"file": "rem.jpg", "name": "雷姆", "year": "2018 萌王", "color": "#00a8ff"},
    {"file": "violet-evergarden.png", "name": "薇尔莉特 · 伊芙加登", "year": "2019 萌王", "color": "#ff6b9d"},
    {"file": "elaina.jpg", "name": "伊蕾娜", "year": "2021 萌王", "color": "#7ee8fa"},
    {"file": "misaka-mikoto.jpg", "name": "御坂美琴", "year": "人气之王", "color": "#ffcc00"},
]

INPUT_DIR = "/workspace/images/login"
OUTPUT_DIR = "/workspace/videos"
FONT = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
FONT_EN = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

DURATION = 4.5       # 每个角色展示时长
TRANSITION = 0.8     # 过渡时长
FPS = 30
WIDTH, HEIGHT = 1920, 1080
IMG_HEIGHT = 900


def run(cmd, cwd=None):
    print("$", " ".join(cmd))
    subprocess.run(cmd, cwd=cwd, check=True)


def build_segment(char, index, tmpdir):
    """为单个角色生成带 Ken Burns、文字、暗角的片段"""
    src = os.path.join(INPUT_DIR, char["file"])
    out = os.path.join(tmpdir, f"seg_{index:02d}.mp4")

    # 字幕文件：角色名 + 年份
    ass_path = os.path.join(tmpdir, f"title_{index:02d}.ass")
    # 主题色光晕透明度
    glow_alpha = "0.15"

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(f"""[Script Info]
Title: Title
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TopTitle,{os.path.basename(FONT)},38,&H00DDDDDD,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,6,0,1,2,0,2,40,40,45,1
Style: Name,{os.path.basename(FONT)},110,&H00FFFFFF,&H000000FF,&H00{char['color'][1:]},&H00000000,1,0,0,0,100,100,10,0,1,3,2,2,40,40,155,1
Style: Year,{os.path.basename(FONT)},52,&H00{char['color'][1:]},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,6,0,1,2,1,2,40,40,95,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:10.00,TopTitle,,0,0,0,,{{\\an8\\pos({WIDTH//2},55)}}星云编年史  ·  NEBULA CHRONICLE
Dialogue: 0,0:00:00.00,0:00:10.00,Name,,0,0,0,,{{\\an2\\pos({WIDTH//2},170)}}{char['name']}
Dialogue: 0,0:00:00.00,0:00:10.00,Year,,0,0,0,,{{\\an2\\pos({WIDTH//2},240)}}{char['year']}
""")

    frames = int(DURATION * FPS)
    IMG_W, IMG_H = 700, 1050  # 角色图显示尺寸
    zoom_expr = "'min(zoom+0.0004,1.08)'"
    x_expr = "'iw/2-(iw/zoom)/2'"
    y_expr = "'ih/2-(ih/zoom)/2'"

    filter_complex = (
        # 角色图一分为二：清晰主体 + 模糊光晕背景
        f"[0:v]split=2[clear][blur];"
        f"[blur]scale={WIDTH}:{HEIGHT}:flags=lanczos,gblur=sigma=55,format=yuva420p,"
        f"colorchannelmixer=aa=0.32[bg];"
        f"[clear]scale={IMG_W}:{IMG_H}:flags=lanczos,format=yuva420p,"
        f"zoompan=z={zoom_expr}:x={x_expr}:y={y_expr}:d={frames}:s={IMG_W}x{IMG_H}:fps={FPS},"
        f"setsar=1[img];"
        # 暗角压暗背景边缘
        f"[bg]vignette=PI/7:aspect=1.78[bgv];"
        f"[bgv][img]overlay=(W-w)/2:(H-h)/2:shortest=1:format=auto[base];"
        f"[base]ass={ass_path}[titled];"
        f"[titled]format=yuv420p[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", src,
        "-f", "lavfi", "-i", f"color=c=#03030a:s={WIDTH}x{HEIGHT}:d={DURATION}",
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-t", str(DURATION),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        out
    ]
    run(cmd)
    return out


def concat_segments(segments, tmpdir, output):
    """用 xfade 拼接所有片段"""
    n = len(segments)
    if n == 1:
        shutil.copy(segments[0], output)
        return

    inputs = []
    for seg in segments:
        inputs.extend(["-i", seg])

    # 构建 filter_complex：先用 tpad 把每个输入延长到足够长，再用 xfade 拼接
    pad_duration = int(DURATION * n + TRANSITION * (n - 1)) + 5  # 留一点余量
    filters = []
    for i in range(n):
        filters.append(f"[{i}:v]format=yuv420p,tpad=stop_duration={pad_duration}[v{i}]")

    transitions = ["fade", "smoothleft", "smoothright", "zoomin", "hblur", "fade", "slideleft"]
    current = "v0"
    offset = DURATION
    for i in range(1, n):
        trans = transitions[(i - 1) % len(transitions)]
        next_label = f"v{i}"
        out_label = f"t{i}"
        filters.append(f"[{current}][{next_label}]xfade=transition={trans}:duration={TRANSITION}:offset={offset:.2f}[{out_label}]")
        current = out_label
        offset += DURATION

    filters.append(f"[{current}]trim=0:{(DURATION * n + TRANSITION * (n - 1)):.2f},format=yuv420p[outv]")

    cmd = ["ffmpeg", "-y"] + inputs + [
        "-filter_complex", ";".join(filters),
        "-map", "[outv]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        "-pix_fmt", "yuv420p", "-r", str(FPS),
        output
    ]
    run(cmd)


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmpdir:
        segments = []
        for i, char in enumerate(CHARACTERS):
            print(f"\nGenerating segment {i+1}/{len(CHARACTERS)}: {char['name']}")
            seg = build_segment(char, i, tmpdir)
            segments.append(seg)

        output = os.path.join(OUTPUT_DIR, "character_showcase.mp4")
        print("\nConcatenating segments...")
        concat_segments(segments, tmpdir, output)
        print(f"\nDone: {output}")


if __name__ == "__main__":
    main()
