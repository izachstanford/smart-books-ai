#!/bin/bash
# SmartBooksAI - Data Pipeline Runner
# Executes all four stages in sequence

set -e  # Exit on error

echo ""
echo "🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀"
echo "   SMARTBOOKS AI - FULL DATA PIPELINE"
echo "🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀"
echo ""

cd "$(dirname "$0")"

# Check for virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

echo ""
echo "────────────────────────────────────────────────────────────"
echo "STAGE 1 OF 4: Data Enrichment"
echo "────────────────────────────────────────────────────────────"
python scripts/enrich_data.py

echo ""
echo "────────────────────────────────────────────────────────────"
echo "STAGE 2 OF 4: Embedding Generation"
echo "────────────────────────────────────────────────────────────"
python scripts/generate_embeddings.py

echo ""
echo "────────────────────────────────────────────────────────────"
echo "STAGE 3 OF 4: ChromaDB Index Building"
echo "────────────────────────────────────────────────────────────"
python scripts/build_index.py

echo ""
echo "────────────────────────────────────────────────────────────"
echo "STAGE 4 OF 4: Analytics Pre-computation"
echo "────────────────────────────────────────────────────────────"
python scripts/precompute_analytics.py

echo ""
echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
echo "   ALL STAGES COMPLETE!"
echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
echo ""
echo "Your SmartBooksAI data is ready!"
echo "Next step: Copy data to React app and start with 'npm start'"
echo ""
