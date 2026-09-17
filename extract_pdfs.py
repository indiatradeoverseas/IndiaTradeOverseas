import pdfplumber, sys, os

files = [
    "ITO_Master_DPR_Qualified_Traffic_Soft_Gate_CRM_Branding_v4.pdf",
    "India_Trade_Overseas_Coal_Vertical_DPR.pdf",
    "India_Trade_Overseas_Nashik_Onion_DPR.pdf"
]

for fn in files:
    print("=== START", fn, "===")
    if not os.path.exists(fn):
        print("FILE NOT FOUND:", fn)
        continue
    with pdfplumber.open(fn) as pdf:
        for i, page in enumerate(pdf.pages):
            txt = page.extract_text()
            if txt:
                print(f"--- Page {i+1} ---")
                print(txt)
    print("=== END", fn, "===")