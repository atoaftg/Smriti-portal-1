#!/usr/bin/env python3
"""WCAG contrast check for the colour pairs used in css/style.css (AA needs 4.5:1 for normal text)."""
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=.03928 else ((c+.055)/1.055)**2.4
    return .2126*f(r)+.7152*f(g)+.0722*f(b)
def ratio(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+.05)/(lb+.05)
LIGHT=[ # (foreground, background, where used)
 ("#241518","#f8f3f3","body text on page"),("#241518","#ffffff","text on cards"),("#5e4a4d","#ffffff","muted text on cards"),("#5e4a4d","#f8f3f3","muted text on page"),
 ("#ffffff","#8c000d","white on maroon (header, hero, table head)"),("#ffffff","#a8101a","white on primary button (top of gradient)"),("#ffffff","#8c000d","white on primary button (bottom)"),
 ("#f6d9dc","#8c000d","header subtitle"),("#ffd7ae","#8c000d","role label in header"),("#fbe3e5","#8c000d","hero paragraph / landing lead"),("#ffffff","#b3121f","hero title at the light end"),
 ("#ffffff","#a3101c","landing top bar at light end"),("#fbe3e5","#b3121f","hero paragraph at the light end"),
 ("#1b0f00","#f58220","dark text on orange button/avatar/step/eyebrow"),("#1b0f00","#ff9a3d","orange button gradient top"),
 ("#5f0009","#fbe8ea","default chip / code"),("#8c000d","#ffffff","links, KPI maroon number"),("#8c000d","#f8f3f3","links on page"),("#5f0009","#ffffff","card titles"),("#5f0009","#fbe8ea","open question bar, mode box"),
 ("#0a4a94","#e2edfb","blue chip / note"),("#8a3f00","#ffe9d2","orange chip"),("#0b6445","#d9f3e6","green chip"),("#53298f","#ece3f8","purple chip"),("#0a5f6b","#d6f0f3","teal chip"),("#9b1c47","#fbe2ea","rose chip"),
 ("#0b6b4d","#d9f3e6","status ok"),("#8a4a00","#ffe9c7","status warn"),("#a5171f","#fde0e1","status bad"),
 ("#a85100","#ffffff","orange label text on white"),("#a85100","#f8f3f3","orange label on page"),("#4a2600","#ffedd9","demo box / Good-to-know text"),("#7a3a00","#ffffff","demo code"),
 ("#ffffff","#4d0007","toast"),("#e9cfd2","#2c0a0e","landing footer"),("#8a3f00","#ffffff","KPI orange number"),("#0b6445","#ffffff","KPI green number"),("#53298f","#ffffff","KPI purple number"),("#a5171f","#ffffff","KPI alert number"),
 ("#ffffff","#6d000a","table header (dark end)"),
]
DARK=[("#f6eaeb","#1a0d0f","body"),("#f6eaeb","#26151a","cards"),("#cdb4b7","#26151a","muted"),("#ff9ea6","#26151a","links/titles on cards"),("#ffc7cb","#4a1a20","chips, open bars"),
 ("#ffffff","#c3202c","primary button (top)"),("#ffffff","#a3111c","primary button (bottom)"),
 ("#9ccaff","#173257","blue chip"),("#ffc58a","#432a10","orange chip"),("#86e5b6","#123a2b","green chip"),("#cdb4ff","#2f2250","purple chip"),("#8fe3ee","#0f3a41","teal chip"),("#ffa9c4","#47182c","rose chip"),
 ("#6fe0a8","#12392a","ok"),("#ffc069","#3d2d0c","warn"),("#ff9a9f","#42191b","bad")]
bad=0
for name,rows in (("LIGHT",LIGHT),("DARK",DARK)):
    print(f"--- {name}")
    for fg,bg,why in rows:
        r=ratio(fg,bg); ok=r>=4.5; bad+=not ok
        print(f"{'PASS' if ok else 'FAIL'} {r:5.1f}:1  {why}  ({fg} on {bg})")
print("\nAll pairs meet WCAG AA" if not bad else f"\n{bad} pair(s) below 4.5:1")
raise SystemExit(1 if bad else 0)
