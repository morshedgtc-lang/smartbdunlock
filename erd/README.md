# SmartBD Unlock — Entity Relationship Diagram

## Files

| File | Purpose |
|---|---|
| `schema.mmd` | Mermaid ERD — renders natively on GitHub |
| `schema.puml` | PlantUML — generate high-res PNG/SVG with `plantuml schema.puml` |
| `spec.md` | Full column-level specification (data types, indexes, cascades) |

## Generate PNG

### Option 1: PlantUML (recommended)
```bash
# Install plantuml
brew install plantuml   # macOS
sudo apt install plantuml  # Ubuntu

# Generate PNG
plantuml -tpng schema.puml -o ../docs/erd.png

# Generate SVG
plantuml -tsvg schema.puml -o ../docs/erd.svg
```

### Option 2: Mermaid CLI
```bash
npx @mermaid-js/mermaid-cli mmdc -i schema.mmd -o ../docs/erd.png -t dark -b transparent
```

### Option 3: Online
- Paste `schema.mmd` into [mermaid.live](https://mermaid.live)
- Paste `schema.puml` into [plantuml.com](https://www.plantuml.com/plantuml)

## Database
- PostgreSQL (Railway)
- Prisma 5.22.0 ORM
- 15 tables
- UUID primary keys (cuid)
