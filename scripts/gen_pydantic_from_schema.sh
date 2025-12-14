#!/usr/bin/env bash
set -euo pipefail

# Generate Pydantic models from FIBO JSON schema
# This script downloads the official schema from Bria-AI/FIBO repo and generates type-safe models

# Default schema URL (adjust if schema location changes in the repo)
SCHEMA_RAW_URL="${1:-https://raw.githubusercontent.com/Bria-AI/FIBO/main/schema/fibo_schema.json}"

# Alternative schema locations to try
ALTERNATIVE_URLS=(
    "https://raw.githubusercontent.com/Bria-AI/FIBO/main/schemas/fibo_schema.json"
    "https://raw.githubusercontent.com/Bria-AI/FIBO/main/api/schema.json"
    "https://raw.githubusercontent.com/Bria-AI/FIBO/main/docs/schema.json"
)

OUT_DIR="${2:-backend/app}"
TEMP_SCHEMA="${OUT_DIR}/fibo_schema_temp.json"
OUT_PYDANTIC="${OUT_DIR}/models_fibo.py"
SCHEMA_FINAL="${OUT_DIR}/fibo_schema.json"

# Create output directory if it doesn't exist
mkdir -p "$OUT_DIR"

echo "Generating Pydantic models from FIBO JSON schema..."
echo "Target schema URL: $SCHEMA_RAW_URL"
echo "Output directory: $OUT_DIR"
echo ""

# Try to download schema from primary URL
download_success=false
if curl -fsSL "$SCHEMA_RAW_URL" -o "$TEMP_SCHEMA" 2>/dev/null; then
    echo "✓ Downloaded schema from primary URL"
    download_success=true
else
    echo "⚠ Primary URL failed, trying alternatives..."
    for alt_url in "${ALTERNATIVE_URLS[@]}"; do
        if curl -fsSL "$alt_url" -o "$TEMP_SCHEMA" 2>/dev/null; then
            echo "✓ Downloaded schema from: $alt_url"
            download_success=true
            SCHEMA_RAW_URL="$alt_url"
            break
        fi
    done
fi

if [ "$download_success" = false ]; then
    echo "⚠ Warning: Could not download schema from GitHub."
    echo "  This might be because:"
    echo "    1. Schema location has changed in the FIBO repo"
    echo "    2. Network connectivity issues"
    echo "    3. Repository structure changed"
    echo ""
    echo "  Checking for local schema in libs/fibo..."
    
    # Try to find schema in local submodule
    if [ -f "libs/fibo/schema/fibo_schema.json" ]; then
        cp "libs/fibo/schema/fibo_schema.json" "$TEMP_SCHEMA"
        echo "✓ Found local schema in libs/fibo/schema/fibo_schema.json"
        download_success=true
    elif [ -f "libs/fibo/schemas/fibo_schema.json" ]; then
        cp "libs/fibo/schemas/fibo_schema.json" "$TEMP_SCHEMA"
        echo "✓ Found local schema in libs/fibo/schemas/fibo_schema.json"
        download_success=true
    fi
fi

if [ "$download_success" = false ]; then
    echo "❌ Error: Could not find FIBO schema."
    echo "  Please ensure:"
    echo "    1. FIBO submodule is added: ./scripts/add_fibo_submodule.sh"
    echo "    2. Or provide schema URL: $0 <schema_url>"
    echo ""
    echo "  Using fallback: will keep existing models_fibo.py if it exists"
    exit 1
fi

# Validate JSON
if ! python3 -m json.tool "$TEMP_SCHEMA" > /dev/null 2>&1; then
    echo "❌ Error: Downloaded file is not valid JSON"
    rm -f "$TEMP_SCHEMA"
    exit 1
fi

# Save final schema
cp "$TEMP_SCHEMA" "$SCHEMA_FINAL"
echo "✓ Schema saved to $SCHEMA_FINAL"

# Check if datamodel-code-generator is installed
if ! command -v datamodel-codegen >/dev/null 2>&1; then
    echo "datamodel-codegen not found, installing..."
    pip install datamodel-code-generator || {
        echo "⚠ Warning: Could not install datamodel-codegen"
        echo "  Install manually: pip install datamodel-code-generator"
        echo "  Or use the fallback models_fibo.py"
        rm -f "$TEMP_SCHEMA"
        exit 1
    }
fi

echo "Generating Pydantic models to ${OUT_PYDANTIC}..."
datamodel-codegen \
    --input "$TEMP_SCHEMA" \
    --input-file-type jsonschema \
    --output "$OUT_PYDANTIC" \
    --class-name FiboSchema \
    --use-annotated \
    --use-generic-container-types \
    --use-standard-collections || {
    echo "⚠ Warning: datamodel-codegen failed. Using fallback models."
    rm -f "$TEMP_SCHEMA"
    exit 1
}

# Clean up temp file
rm -f "$TEMP_SCHEMA"

echo ""
echo "✓ Successfully generated Pydantic models at ${OUT_PYDANTIC}"
echo "✓ Schema saved at ${SCHEMA_FINAL}"
echo ""
echo "You can now import and use these models in your code:"
echo "  from app.models_fibo import FiboSchema"
