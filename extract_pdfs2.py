import pdfplumber, os, sys

files = [
    "ITO_Master_DPR_Qualified_Traffic_Soft_Gate_CRM_Branding_v4.pdf",
    "India_Trade_Overseas_Coal_Vertical_DPR.pdf",
    "India_Trade_Overseas_Nashik_Onion_DPR.pdf"
]

for fn in files:
    out_fn = fn.replace('.pdf','.txt')
    print("Extracting", fn, "->", out_fn)
    with pdfplumber.open(fn) as pdf, open(out_fn, 'w', encoding='utf-8') as out:
        for i, page in enumerate(pdf.pages):
            txt = page.extract_text()
            if txt:
                out.write(f"--- Page {i+1} ---\n")
                out.write(txt)
                out.write("\n\n")
    print("Done", fn)