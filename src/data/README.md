# Daten-Ordner für Chatbot

Dieser Ordner enthält die Konfiguration und Dokumente für den Chatbot.

## Struktur

- `system-prompt.txt` - Enthält die Verhaltensanweisungen für den Chatbot
- `documents/` - Ordner mit statischen Dokumenten (FAQs, Produktdokumentation, etc.)

## Verwendung

### System-Prompt anpassen

Bearbeiten Sie `system-prompt.txt`, um das Verhalten des Chatbots zu ändern. Der System-Prompt wird bei jeder Anfrage geladen und dem Modell übergeben.

### Dokumente hinzufügen

1. Erstellen Sie neue Markdown- oder Text-Dateien im `documents/` Ordner
2. Die Dateien werden automatisch geladen und dem Chatbot als Kontext zur Verfügung gestellt
3. Unterstützte Formate: `.md` (Markdown) und `.txt` (Text)

### Beispiel

```
documents/
  ├── faq.md
  ├── product-docs.md
  └── company-info.txt
```

Alle diese Dateien werden automatisch in den Kontext des Chatbots eingefügt.

## Hinweise

- Änderungen an den Dateien werden beim nächsten API-Aufruf wirksam
- Bei größeren Dokumenten kann es zu längeren Antwortzeiten kommen
- Der System-Prompt sollte präzise und klar formuliert sein
