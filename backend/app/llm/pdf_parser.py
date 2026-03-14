import pdfplumber


def extract_pages(file_path: str) -> list[str]:
    """Extract text from each page of a PDF. Returns list of page strings."""
    pages = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            # Try table extraction first (better for structured bank statements)
            tables = page.extract_tables()
            if tables:
                page_text = ""
                for table in tables:
                    for row in table:
                        if row:
                            page_text += " | ".join(str(cell or "") for cell in row) + "\n"
            else:
                page_text = page.extract_text() or ""
            pages.append(page_text.strip())
    return pages


def chunk_pages(pages: list[str], chunk_size: int = 4) -> list[str]:
    """Group pages into chunks for LLM calls."""
    return ["\n\n--- PAGE BREAK ---\n\n".join(pages[i:i+chunk_size])
            for i in range(0, len(pages), chunk_size)]
