"""
Extract station-level water quality tables from CPCB NWMP PDFs into one CSV.

Each NWMP PDF is a table of monitoring stations with the annual Min and Max of
each parameter. Column order differs between files and years, and missing
values are blank cells, so values are assigned to columns by their
x-position under the "Min"/"Max" header words rather than by their order.

Output: ml/data/processed/cpcb_water_quality.csv (one row per station-year).
"""
import re
import sys
from pathlib import Path

import pandas as pd
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw" / "cpcb"
OUT_PATH = ROOT / "data" / "processed" / "cpcb_water_quality.csv"

MINMAX_RE = re.compile(r"^(mi|min|ma|max)$", re.I)
VALUE_RE = re.compile(r"^[<>]?\d+(\.\d+)?$")
BDL_TOKENS = {"bdl", "nd", "<dl"}

# Header label -> parameter key. Order matters: more specific patterns first.
PARAM_PATTERNS = [
    ("fs", r"strepto"),
    ("fc", r"(faecal|fecal)\s*coli"),
    ("tc", r"total\s*coli"),
    ("tds", r"dissolved\s*solids"),
    ("bod", r"bio|b\.o\.d|\bbod\b|demand"),
    ("do", r"dissolved\s*(oxygen|o2)|dissolvedo2"),
    ("temp", r"temperat"),
    ("cond", r"conductiv"),
    ("nitrate", r"nitrate"),
    ("fluoride", r"fluoride"),
    ("arsenic", r"arsenic"),
    ("ph", r"\bph\b"),
]

# Source PDFs with mislabelled headers. In 2019_NWMP_DATA_2019.pdf the column
# labelled "Total Coliform" is <= the one labelled "Faecal Coliform" in 99.4%
# of rows; faecal coliform is a subset of total coliform, so the labels are swapped.
HEADER_OVERRIDES = {
    "2019_NWMP_DATA_2019.pdf": {"tc": "fc", "fc": "tc"},
}

# Files whose values are vertically centred on wrapped station names, so they
# often sit above the station code. Band assignment shifts every station by one
# in these files (checked against the raw text), so only nearest-line is used.
NEAREST_LAYOUT_FILES = {
    "2016_Water_Ground_Water_2016.pdf",
    "2022_Water_Quality_data_of_Med_Min_River_2022.pdf",
}

PARAMS = ["temp", "do", "ph", "cond", "bod", "nitrate", "fc", "tc", "fs", "tds", "fluoride", "arsenic"]


def water_body_type(filename):
    name = filename.lower()
    if "nwmp_data" in name or "ground_water" in name:
        return "GROUNDWATER"
    if "pond" in name:
        return "LAKE_POND"
    return "RIVER"


def cx(word):
    return (word[0] + word[2]) / 2


def classify_label(label):
    text = label.lower()
    for key, pattern in PARAM_PATTERNS:
        if re.search(pattern, text):
            return key
    return None


def detect_header(words):
    """Return (header_bottom_y, [(param, min_x, max_x), ...]) or None."""
    mm = [w for w in words if MINMAX_RE.match(w[4])]
    if len(mm) < 12:
        return None
    # Keep only the dominant Min/Max row(s): the header sits in a narrow band.
    y_top = min(w[1] for w in mm)
    mm = sorted([w for w in mm if w[1] - y_top < 15], key=cx)
    # Pair consecutive min/max words.
    pairs = []
    i = 0
    while i < len(mm) - 1:
        a, b = mm[i], mm[i + 1]
        if a[4].lower().startswith("mi") and b[4].lower().startswith("ma"):
            pairs.append((a, b))
            i += 2
        else:
            i += 1
    columns = []
    for a, b in pairs:
        lo, hi = a[0] - 10, b[2] + 10
        label_words = [
            w for w in words
            if w[3] <= y_top + 1 and w[1] > y_top - 70 and lo <= cx(w) <= hi and not MINMAX_RE.match(w[4])
        ]
        label_words.sort(key=lambda w: (round(w[1]), w[0]))
        param = classify_label(" ".join(w[4] for w in label_words))
        columns.append((param, cx(a), cx(b)))
    params = [c[0] for c in columns]
    if None in params or len(set(params)) != len(params) or "fc" not in params:
        return None
    header_bottom = max(w[3] for w in mm)
    return header_bottom, columns


def parse_value(token):
    t = token.strip().lower()
    if t in BDL_TOKENS:
        return 0.0
    if VALUE_RE.match(t):
        return float(t.lstrip("<>"))
    return None


def group_rows(words, tol=3.0):
    rows = []
    for w in sorted(words, key=lambda w: (w[1] + w[3]) / 2):
        yc = (w[1] + w[3]) / 2
        if rows and abs(rows[-1][0] - yc) <= tol:
            rows[-1][1].append(w)
        else:
            rows.append([yc, [w]])
    return [sorted(r[1], key=lambda w: w[0]) for r in rows]


def yc(word):
    return (word[1] + word[3]) / 2


MISSING_TOKENS = {"-", "--", "na", "n.a.", "nil"}


def is_criteria_line(line, first_x):
    """
    Header residue such as the regulatory-limit row ('> 5.0 mg/L', '< 2500 MPN/ 100 Ml').
    Real data rows contain only numbers, BDL or '-' in the value columns.
    """
    for w in line:
        if cx(w) < first_x:
            continue
        token = w[4].strip().lower()
        if parse_value(token) is None and token not in MISSING_TOKENS:
            return True
    return False


def assign_by_band(codes, lines):
    """Each code owns the lines from its own line down to the next code."""
    owned = [[] for _ in codes]
    for line in lines:
        for i in range(len(codes) - 1, -1, -1):
            if yc(line[0]) >= yc(codes[i]) - 4:
                owned[i].append(line)
                break
    return owned


def assign_by_nearest(codes, lines):
    """Each line belongs to the vertically nearest code (values centred on a wrapped name)."""
    owned = [[] for _ in codes]
    for line in lines:
        i = min(range(len(codes)), key=lambda k: abs(yc(codes[k]) - yc(line[0])))
        owned[i].append(line)
    return owned


def read_station(lines, slots, spacing, first_x):
    """Map a station's words to parameter columns. None if empty or ambiguous."""
    values, text_parts = {}, []
    for w in [w for line in lines for w in line]:
        x = cx(w)
        if x < first_x:
            text_parts.append(w[4])
            continue
        val = parse_value(w[4])
        if val is None:
            continue  # '-' or stray text: treat as missing
        nearest = min(slots, key=lambda s: abs(s[0] - x))
        if abs(nearest[0] - x) > spacing * 0.6:
            continue
        key = f"{nearest[1]}_{nearest[2]}"
        if key in values:
            return None  # two values in one cell: lines from two stations mixed
        values[key] = val
    if len(values) < 2:
        return None
    return values, " ".join(text_parts)


def parse_pdf(path):
    doc = pymupdf.open(path)
    year = int(re.search(r"(20\d\d)", path.name).group(1))
    body = water_body_type(path.name)
    records, skipped = [], 0
    header = None
    for page in doc:
        words = page.get_text("words")
        found = detect_header(words)
        header_y = 0
        if found:
            header_y, cols = found
            header = [(HEADER_OVERRIDES.get(path.name, {}).get(p, p), a, b) for p, a, b in cols]
        if header is None:
            continue
        slots = []  # (x_center, param, 'min'|'max')
        for param, min_x, max_x in header:
            slots += [(min_x, param, "min"), (max_x, param, "max")]
        slots.sort()
        spacing = min(b[0] - a[0] for a, b in zip(slots, slots[1:]))
        first_x = slots[0][0] - spacing * 0.6

        body_words = [w for w in words if w[1] > header_y]
        # Station codes are the leftmost word of a line, all at the same x.
        candidates = [r[0] for r in group_rows(body_words) if r[0][4].isdigit() and r[0][0] < 120]
        if not candidates:
            continue
        code_x = sorted(c[0] for c in candidates)[len(candidates) // 2]
        codes = sorted((c for c in candidates if abs(c[0] - code_x) < 15), key=lambda c: c[1])

        lines = [
            line for line in group_rows([w for w in body_words if not any(w is c for c in codes)])
            if not is_criteria_line(line, first_x)
        ]
        by_band = assign_by_band(codes, lines)
        by_nearest = assign_by_nearest(codes, lines)

        for i, code_word in enumerate(codes):
            a = read_station(by_band[i], slots, spacing, first_x)
            b = read_station(by_nearest[i], slots, spacing, first_x)
            if path.name in NEAREST_LAYOUT_FILES:
                result = b
            elif a and b and a[0] == b[0]:
                result = a
            else:
                result = None  # rules disagree or only one succeeded: unreliable
            if result is None:
                skipped += 1
                continue
            values, text = result
            records.append(dict(
                values,
                year=year,
                water_body=body,
                station_code=int(code_word[4]),
                location_text=text[:200],
                source_file=path.name,
            ))
    return records, skipped


def validate(df):
    """Drop physically impossible rows and rows where min > max (column shift)."""
    before = len(df)
    ok = pd.Series(True, index=df.index)
    ranges = {"ph": (0, 14), "temp": (0, 50), "do": (0, 25), "cond": (1, 200000)}
    for p, (lo, hi) in ranges.items():
        for s in ("min", "max"):
            col = f"{p}_{s}"
            if col in df:
                ok &= df[col].isna() | df[col].between(lo, hi)
    for p in PARAMS:
        a, b = f"{p}_min", f"{p}_max"
        if a in df and b in df:
            ok &= df[a].isna() | df[b].isna() | (df[a] <= df[b])
    if "fc_max" in df and "tc_max" in df:
        # Faecal coliform is a subset of total coliform.
        ok &= df["fc_max"].isna() | df["tc_max"].isna() | (df["fc_max"] <= df["tc_max"] * 1.01)
    df = df[ok]
    return df, before - len(df)


def main():
    pdfs = sorted(RAW_DIR.glob("*.pdf"))
    if not pdfs:
        sys.exit(f"No PDFs in {RAW_DIR}. Run download_data.py first.")
    all_records = []
    for pdf in pdfs:
        recs, skipped = parse_pdf(pdf)
        print(f"{pdf.name:55s} rows={len(recs):5d} ambiguous_rows_dropped={skipped}")
        all_records += recs
    df = pd.DataFrame(all_records)
    df, dropped = validate(df)
    # The same station can appear in two files for one year (e.g. a river table
    # and a medium/minor river table); keep the row with the most values.
    df["_n"] = df.notna().sum(axis=1)
    df = df.sort_values("_n", ascending=False).drop_duplicates(["year", "station_code", "water_body"]).drop(columns="_n")
    cols = ["year", "water_body", "station_code", "location_text"] + [
        f"{p}_{s}" for p in PARAMS for s in ("min", "max") if f"{p}_{s}" in df
    ] + ["source_file"]
    df = df[cols].sort_values(["year", "water_body", "station_code"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    print(f"\nInvalid rows dropped: {dropped}")
    print(f"Wrote {len(df)} station-year rows -> {OUT_PATH}")
    print(df.groupby(["water_body"]).size().to_string())
    print(df.groupby("year").size().to_string())


if __name__ == "__main__":
    main()
