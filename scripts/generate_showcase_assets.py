import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_banner():
    width = 2400
    height = 760
    img = Image.new("RGBA", (width, height), (7, 10, 19, 255))
    draw = ImageDraw.Draw(img)

    # Fonts
    font_hero = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 82)
    font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 36)
    font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
    font_tag = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    font_code = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 22)
    font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)

    # Draw subtle background grid
    grid_color = (255, 255, 255, 8)
    for x in range(0, width, 60):
        draw.line([(x, 0), (x, height)], fill=grid_color, width=1)
    for y in range(0, height, 60):
        draw.line([(0, y), (width, y)], fill=grid_color, width=1)

    # Radial ambient glows
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Left violet glow
    for r in range(400, 0, -10):
        alpha = int(45 * (1 - r / 400))
        glow_draw.ellipse([200 - r, 300 - r, 200 + r, 300 + r], fill=(139, 92, 246, alpha))
        
    # Right cyan/blue glow
    for r in range(500, 0, -15):
        alpha = int(35 * (1 - r / 500))
        glow_draw.ellipse([1850 - r, 380 - r, 1850 + r, 380 + r], fill=(6, 182, 212, alpha))

    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # Top Badges (Left)
    badges = [
        ("RELEASE v0.5.0", (139, 92, 246), (30, 20, 60)),
        ("100% LOCAL-FIRST", (16, 185, 129), (10, 45, 30)),
        ("ZERO TELEMETRY", (6, 182, 212), (10, 40, 55)),
        ("MIT LICENSE", (245, 158, 11), (50, 35, 10))
    ]
    bx = 120
    by = 90
    for label, border_c, bg_c in badges:
        bbox = font_tag.getbbox(label)
        bw = bbox[2] - bbox[0] + 32
        bh = 38
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=19, fill=(*bg_c, 240), outline=(*border_c, 200), width=1)
        draw.text((bx + 16, by + 8), label, font=font_tag, fill=(*border_c, 255))
        bx += bw + 16

    # Title & Subtitle
    draw.text((120, 160), "FLOWTRACK PRO", font=font_hero, fill=(255, 255, 255, 255))
    
    # Gradient accent line under title
    for i in range(500):
        ratio = i / 500
        r = int(139 * (1 - ratio) + 6 * ratio)
        g = int(92 * (1 - ratio) + 182 * ratio)
        b = int(246 * (1 - ratio) + 212 * ratio)
        draw.line([(120 + i, 265), (120 + i, 268)], fill=(r, g, b, 255), width=3)

    draw.text((120, 285), "Autonomous Local-First Productivity & Deep Study Workstation", font=font_sub, fill=(203, 213, 225, 255))
    
    summary_text = (
        "Integrated active app categorization • Eye-care & ultradian cycles • Spaced repetition SM-2\n"
        "Infinite Fabric whiteboard & MindMap portal • Offline zero-telemetry SQLite WAL"
    )
    draw.text((120, 345), summary_text, font=font_small, fill=(148, 163, 184, 255))

    # Feature Highlight Cards (Right side floating cards)
    cards = [
        {
            "rect": (1480, 85, 2260, 265),
            "accent": (139, 92, 246),
            "title": "⚡ Ergonomic Focus Synthesizer",
            "stat": "50m Focus • 20-20-20 Eye Care • 90m Cycles",
            "desc": "Adaptive Pomodoro engine with acoustic harmonic chime synthesizer"
        },
        {
            "rect": (1480, 290, 2260, 470),
            "accent": (6, 182, 212),
            "title": "🛡️ Win32 Native Activity Tracking",
            "stat": "win-tracker.exe • Local Dexie & SQLite WAL",
            "desc": "Ultra low-RAM active window polling & anti-cheat clock discontinuity detection"
        },
        {
            "rect": (1480, 495, 2260, 675),
            "accent": (16, 185, 129),
            "title": "🧠 Spaced Repetition & MindMap Portal",
            "stat": "SuperMemo SM-2 • Mini-Map Radar Navigation",
            "desc": "Infinite whiteboard deck engine with anti-collision cards and LaTeX/Mermaid"
        }
    ]

    for c in cards:
        rx1, ry1, rx2, ry2 = c["rect"]
        acc = c["accent"]
        # Card shadow & background
        draw.rounded_rectangle([rx1, ry1, rx2, ry2], radius=16, fill=(17, 24, 39, 230), outline=(55, 65, 81, 200), width=1)
        # Accent left indicator
        draw.rounded_rectangle([rx1, ry1, rx1 + 6, ry2], radius=3, fill=(*acc, 255))
        # Card Header
        draw.text((rx1 + 28, ry1 + 22), c["title"], font=font_bold, fill=(243, 244, 246, 255))
        # Metric / Stat Pill
        draw.text((rx1 + 28, ry1 + 68), c["stat"], font=font_code, fill=(*acc, 255))
        # Description
        draw.text((rx1 + 28, ry1 + 112), c["desc"], font=font_small, fill=(156, 163, 175, 255))

    # Bottom feature bar (Left side)
    features = [
        "✓ Cross-Platform (Windows & Linux)",
        "✓ Passive WakaTime Port 7777",
        "✓ Ambient Audio Mixer",
        "✓ Hard Disruption Blocker"
    ]
    fx = 120
    fy = 480
    for feat in features:
        draw.text((fx, fy), feat, font=font_bold, fill=(16, 185, 129, 255))
        fy += 48

    # Download button mockup (Bottom Left)
    btn_x = 120
    btn_y = 660
    btn_w = 420
    btn_h = 60
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=12, fill=(139, 92, 246, 255))
    draw.text((btn_x + 36, btn_y + 16), "⬇ DOWNLOAD v0.5.0 INSTALLER", font=font_bold, fill=(255, 255, 255, 255))

    # Live demo button
    demo_x = btn_x + btn_w + 24
    demo_w = 340
    draw.rounded_rectangle([demo_x, btn_y, demo_x + demo_w, btn_y + btn_h], radius=12, fill=(30, 41, 59, 230), outline=(100, 116, 139, 180), width=1)
    draw.text((demo_x + 36, btn_y + 16), "🌐 LAUNCH WEB APP", font=font_bold, fill=(226, 232, 240, 255))

    os.makedirs("public/images", exist_ok=True)
    out_path = "public/images/flowtrack-banner.png"
    img.save(out_path, "PNG", optimize=True)
    print(f"Banner saved to {out_path} ({os.path.getsize(out_path)} bytes)")

def create_screenshot_showcase():
    width = 2100
    height = 1200
    img = Image.new("RGBA", (width, height), (9, 13, 24, 255))
    draw = ImageDraw.Draw(img)

    font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32)
    font_h2 = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
    font_body = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)
    font_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
    font_stat_big = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 54)
    font_code = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 19)

    # Window frame top bar
    draw.rectangle([0, 0, width, 64], fill=(15, 23, 42, 255))
    draw.line([(0, 64), (width, 64)], fill=(30, 41, 59, 255), width=1)
    
    # Window controls (mac/linux/win style indicators)
    draw.ellipse([30, 24, 46, 40], fill=(239, 68, 68, 255))
    draw.ellipse([56, 24, 72, 40], fill=(234, 179, 8, 255))
    draw.ellipse([82, 24, 98, 40], fill=(34, 197, 94, 255))

    # Top Bar Header title
    draw.text((120, 18), "FlowTrack Pro Workspace — Local Study Station", font=font_title, fill=(241, 245, 249, 255))
    
    # Top Bar Badges (Right side)
    draw.text((1500, 22), "🔥 18-Day Streak", font=font_bold, fill=(249, 115, 22, 255))
    draw.text((1700, 22), "⚡ Lv. 14 Focused Master", font=font_bold, fill=(168, 85, 247, 255))
    draw.text((1960, 22), "● ONLINE", font=font_bold, fill=(34, 197, 94, 255))

    # Main Grid Layout:
    # Left Panel: Timer & Active Session (width: 780)
    # Middle Panel: Heatmap & Timeboxing (width: 700)
    # Right Panel: App Categorization & Whiteboard Preview (width: 540)
    
    # --- PANEL 1: Ergonomic Focus & Audio Mixer ---
    p1 = (40, 90, 800, 1140)
    draw.rounded_rectangle(p1, radius=18, fill=(15, 23, 42, 220), outline=(30, 41, 59, 255), width=1)
    draw.text((p1[0] + 30, p1[1] + 30), "⏱️ Active Study Cycle", font=font_h2, fill=(255, 255, 255, 255))
    draw.text((p1[0] + 30, p1[1] + 66), "Mode: 50m Focus / 10m Refresh • Ultradian Block 2/4", font=font_body, fill=(148, 163, 184, 255))

    # Radial Timer Mockup
    timer_center = (420, 360)
    tr = 170
    # Background circle
    draw.ellipse([timer_center[0] - tr, timer_center[1] - tr, timer_center[0] + tr, timer_center[1] + tr], outline=(30, 41, 59, 255), width=18)
    
    # Active arc (glowing violet)
    arc_box = [timer_center[0] - tr, timer_center[1] - tr, timer_center[0] + tr, timer_center[1] + tr]
    draw.arc(arc_box, start=-90, end=190, fill=(139, 92, 246, 255), width=18)

    # Timer Center Digits
    draw.text((timer_center[0] - 110, timer_center[1] - 45), "34:28", font=font_stat_big, fill=(255, 255, 255, 255))
    draw.text((timer_center[0] - 80, timer_center[1] + 25), "IN DEEP FLOW", font=font_bold, fill=(16, 185, 129, 255))

    # Current Task Bar
    tb = (p1[0] + 30, 600, p1[2] - 30, 710)
    draw.rounded_rectangle(tb, radius=12, fill=(30, 41, 59, 180), outline=(51, 65, 85, 255), width=1)
    draw.text((tb[0] + 20, tb[1] + 16), "CURRENT OBJECTIVE", font=font_code, fill=(139, 92, 246, 255))
    draw.text((tb[0] + 20, tb[1] + 48), "Distributed Systems: Consensus Protocols & Raft", font=font_bold, fill=(241, 245, 249, 255))
    draw.text((tb[0] + 20, tb[1] + 78), "Progress: Step 3 of 5 • 65% Completed", font=font_body, fill=(148, 163, 184, 255))

    # Sound Synthesizer Panel
    draw.text((p1[0] + 30, 740), "🎧 Harmonic Ambience Mixer", font=font_h2, fill=(255, 255, 255, 255))
    ambience = [
        ("🌧️ Gentle Rainfall", "70%", (6, 182, 212)),
        ("☕ Cozy Cafe Chatter", "45%", (245, 158, 11)),
        ("🌊 Binaural Alpha Waves (432Hz)", "85%", (139, 92, 246))
    ]
    ay = 790
    for name, vol, col in ambience:
        draw.text((p1[0] + 30, ay), name, font=font_body, fill=(226, 232, 240, 255))
        draw.text((p1[2] - 110, ay), vol, font=font_bold, fill=col)
        # Slider track
        draw.rounded_rectangle([p1[0] + 30, ay + 32, p1[2] - 30, ay + 42], radius=5, fill=(30, 41, 59, 255))
        # Slider fill
        fill_w = int((p1[2] - p1[0] - 60) * (int(vol.replace('%', '')) / 100))
        draw.rounded_rectangle([p1[0] + 30, ay + 32, p1[0] + 30 + fill_w, ay + 42], radius=5, fill=col)
        ay += 68

    # Anti-cheat status
    draw.rounded_rectangle([p1[0] + 30, 1020, p1[2] - 30, 1100], radius=12, fill=(16, 185, 129, 20), outline=(16, 185, 129, 120), width=1)
    draw.text((p1[0] + 50, 1035), "🛡️ Anti-Cheat Hardware Clock Guard", font=font_bold, fill=(16, 185, 129, 255))
    draw.text((p1[0] + 50, 1065), "System delta verified (0 drift) • Local SQLite WAL integrity intact", font=font_body, fill=(148, 163, 184, 255))


    # --- PANEL 2: Heatmap & Timeboxing ---
    p2 = (830, 90, 1530, 1140)
    draw.rounded_rectangle(p2, radius=18, fill=(15, 23, 42, 220), outline=(30, 41, 59, 255), width=1)
    draw.text((p2[0] + 30, p2[1] + 30), "📊 Annual Study Activity Heatmap", font=font_h2, fill=(255, 255, 255, 255))
    draw.text((p2[0] + 30, p2[1] + 66), "482 Hours Logged • 96% Consistent Streak", font=font_body, fill=(148, 163, 184, 255))

    # Heatmap Grid Render
    hm_x = p2[0] + 30
    hm_y = p2[1] + 110
    cols = 28
    rows = 7
    box_sz = 17
    gap = 5
    for c in range(cols):
        for r in range(rows):
            # Deterministic color pattern
            val = (c * 7 + r * 13) % 10
            if val < 3:
                bg = (30, 41, 59, 255)
            elif val < 6:
                bg = (76, 29, 149, 255)
            elif val < 9:
                bg = (124, 58, 237, 255)
            else:
                bg = (167, 139, 250, 255)
            bx1 = hm_x + c * (box_sz + gap)
            by1 = hm_y + r * (box_sz + gap)
            draw.rounded_rectangle([bx1, by1, bx1 + box_sz, by1 + box_sz], radius=3, fill=bg)

    # Timeboxing Schedule Section
    draw.text((p2[0] + 30, 390), "📅 Timeboxed Schedule & Milestones", font=font_h2, fill=(255, 255, 255, 255))
    
    schedule_items = [
        ("08:00 - 09:30", "Morning Algorithm Drills (LeetCode Hard)", "COMPLETED", (34, 197, 94)),
        ("10:00 - 12:00", "Full-Stack Distributed System Architecture", "COMPLETED", (34, 197, 94)),
        ("13:30 - 15:30", "Deep Work: Raft Consensus Implementation", "ACTIVE NOW", (139, 92, 246)),
        ("16:00 - 17:00", "Anki SM-2 Spaced Repetition Flashcards", "UPCOMING", (148, 163, 184)),
        ("17:30 - 18:30", "Open Source Monorepo Code Review", "UPCOMING", (148, 163, 184))
    ]
    sy = 440
    for time_str, task_title, status, status_c in schedule_items:
        draw.rounded_rectangle([p2[0] + 30, sy, p2[2] - 30, sy + 68], radius=10, fill=(30, 41, 59, 160), outline=(51, 65, 85, 200), width=1)
        draw.text((p2[0] + 48, sy + 14), time_str, font=font_code, fill=(148, 163, 184, 255))
        draw.text((p2[0] + 48, sy + 38), task_title, font=font_bold, fill=(241, 245, 249, 255))
        draw.text((p2[2] - 170, sy + 24), status, font=font_bold, fill=status_c)
        sy += 82

    # Spaced Repetition SM-2 Queue Card
    draw.rounded_rectangle([p2[0] + 30, 920, p2[2] - 30, 1100], radius=14, fill=(88, 28, 135, 60), outline=(147, 51, 234, 160), width=1)
    draw.text((p2[0] + 50, 945), "🧠 Spaced Repetition Engine (SM-2)", font=font_h2, fill=(216, 180, 254, 255))
    draw.text((p2[0] + 50, 985), "18 Flashcards Due Today • Retrievability Score: 94.2%", font=font_body, fill=(243, 232, 255, 255))
    draw.text((p2[0] + 50, 1020), "Next Review Intervals: Easy (14d) • Good (6d) • Hard (2d)", font=font_code, fill=(192, 132, 252, 255))


    # --- PANEL 3: App Tracking & Whiteboard ---
    p3 = (1560, 90, 2060, 1140)
    draw.rounded_rectangle(p3, radius=18, fill=(15, 23, 42, 220), outline=(30, 41, 59, 255), width=1)
    draw.text((p3[0] + 30, p3[1] + 30), "💻 Passive Tracking", font=font_h2, fill=(255, 255, 255, 255))
    draw.text((p3[0] + 30, p3[1] + 66), "win-tracker.exe • Zero Cloud", font=font_code, fill=(6, 182, 212, 255))

    app_logs = [
        ("Visual Studio Code", "3h 48m", "94% Dev", (59, 130, 246)),
        ("Windows Terminal", "1h 12m", "100% Dev", (16, 185, 129)),
        ("Obsidian Research", "48m", "98% Study", (168, 85, 247)),
        ("Chrome Documentation", "35m", "88% Study", (245, 158, 11))
    ]
    apy = 120
    for app_name, dur, cat, cat_c in app_logs:
        draw.rounded_rectangle([p3[0] + 30, apy, p3[2] - 30, apy + 74], radius=10, fill=(30, 41, 59, 160))
        draw.text((p3[0] + 46, apy + 14), app_name, font=font_bold, fill=(241, 245, 249, 255))
        draw.text((p3[0] + 46, apy + 44), f"Duration: {dur}", font=font_body, fill=(148, 163, 184, 255))
        draw.text((p3[2] - 140, apy + 26), cat, font=font_bold, fill=cat_c)
        apy += 88

    # Infinite Whiteboard Deck Preview
    draw.text((p3[0] + 30, 520), "🎨 Whiteboard Deck & MindMap", font=font_h2, fill=(255, 255, 255, 255))
    draw.text((p3[0] + 30, 556), "Fabric.js Infinite Canvas & Radar", font=font_body, fill=(148, 163, 184, 255))

    wb_box = (p3[0] + 30, 600, p3[2] - 30, 890)
    draw.rounded_rectangle(wb_box, radius=12, fill=(8, 12, 22, 255), outline=(51, 65, 85, 255), width=1)
    
    # Whiteboard preview graphics: Mindmap nodes & connections
    draw.line([(p3[0] + 80, 680), (p3[0] + 240, 680)], fill=(139, 92, 246, 200), width=2)
    draw.line([(p3[0] + 240, 680), (p3[0] + 380, 640)], fill=(6, 182, 212, 200), width=2)
    draw.line([(p3[0] + 240, 680), (p3[0] + 380, 740)], fill=(16, 185, 129, 200), width=2)

    # Nodes
    draw.rounded_rectangle([p3[0] + 60, 655, p3[0] + 160, 705], radius=8, fill=(124, 58, 237, 240))
    draw.text((p3[0] + 75, 672), "Core Logic", font=font_code, fill=(255, 255, 255, 255))

    draw.rounded_rectangle([p3[0] + 210, 655, p3[0] + 310, 705], radius=8, fill=(14, 116, 144, 240))
    draw.text((p3[0] + 225, 672), "Raft Engine", font=font_code, fill=(255, 255, 255, 255))

    draw.rounded_rectangle([p3[0] + 350, 615, p3[0] + 440, 665], radius=8, fill=(4, 120, 87, 240))
    draw.text((p3[0] + 365, 632), "Leader", font=font_code, fill=(255, 255, 255, 255))

    draw.rounded_rectangle([p3[0] + 350, 715, p3[0] + 440, 765], radius=8, fill=(180, 83, 9, 240))
    draw.text((p3[0] + 362, 732), "Follower", font=font_code, fill=(255, 255, 255, 255))

    # Whiteboard controls badge
    draw.text((p3[0] + 50, 845), "Mini-Map Radar • 5 Node Geometries • LaTeX", font=font_code, fill=(148, 163, 184, 255))

    # Wakatime receiver status pill
    draw.rounded_rectangle([p3[0] + 30, 930, p3[2] - 30, 1100], radius=14, fill=(15, 23, 42, 200), outline=(6, 182, 212, 100), width=1)
    draw.text((p3[0] + 50, 955), "📡 Loopback WakaTime Receiver", font=font_bold, fill=(6, 182, 212, 255))
    draw.text((p3[0] + 50, 995), "Bound: 127.0.0.1:7777 (DNS-Rebind Guard)", font=font_code, fill=(226, 232, 240, 255))
    draw.text((p3[0] + 50, 1030), "Sync: Zero Cloud • Pure Real-time Pulse Stream", font=font_body, fill=(148, 163, 184, 255))

    out_path = "public/images/flowtrack-screenshot.png"
    img.save(out_path, "PNG", optimize=True)
    print(f"Screenshot showcase saved to {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    create_banner()
    create_screenshot_showcase()
