# ProLight AI - FIBO Integration Examples

This directory contains focused examples and a Python wrapper to demonstrate integration with various Bria AI APIs, including the core FIBO generation and new advanced services.

## 📦 Structure

```
integration_examples/
├── wrappers/
│   ├── fibo_client.py          # Python wrapper for Bria AI APIs
│   └── fibo_schema_example.json # Example structured FIBO prompt
├── examples/
│   ├── ads_generation.py       # Example for Ads Generation API
│   ├── image_onboarding.py     # Example for Image Onboarding
│   ├── video_editing.py        # Example for Video Editing (async v2)
│   ├── tailored_generation.py  # Example for Tailored Generation
│   ├── product_shot_editing.py # Example for Product Shot Editing
│   ├── image_editing.py        # Example for Image Editing
│   └── image_generation_and_status.py # Example for Image Generation (v1) and Status Service
└── README.md                   # This file
```

## 🚀 Getting Started

### Prerequisites

1.  **Python 3.11+**
2.  **`requests` library**: `pip install requests`

### Configuration

Set your Bria AI API Key as an environment variable:

```bash
export FIBO_API_KEY="YOUR_API_KEY_HERE"
```

### Running Examples

You can run any of the examples directly from the `integration_examples` directory:

```bash
cd integration_examples

# Run the Image Generation and Status example
python -m examples.image_generation_and_status

# Run the Ads Generation example
python -m examples.ads_generation
```

**Note:** The `fibo_client.py` uses a mock implementation if `FIBO_API_KEY` is not set, allowing you to test the integration flow without a live key.

## 💡 Key Integration Patterns

| API | Purpose | Example File |
| :--- | :--- | :--- |
| **Image Generation (v1)** | Core FIBO generation | `image_generation_and_status.py` |
| **Status Service** | Polling for job completion | `image_generation_and_status.py` |
| **Ads Generation** | High-level creative generation | `ads_generation.py` |
| **Image Onboarding** | Uploading and processing assets | `image_onboarding.py` |
| **Video Editing** | Asynchronous video manipulation | `video_editing.py` |
| **Tailored Generation** | Generation refined by user data | `tailored_generation.py` |
| **Product Shot Editing** | Specialized product image refinement | `product_shot_editing.py` |
| **Image Editing** | General image manipulation | `image_editing.py` |

## 🛠️ Next Steps for ProLight AI

These examples can be directly integrated into the ProLight AI backend (`backend/app/services/fibo_adapter.py`) to replace the existing stubs and expand functionality.

1.  **Replace Stubs**: Update the `FIBOAdapter` in the main ProLight AI codebase to use the patterns from `fibo_client.py`.
2.  **Add Endpoints**: Create new FastAPI endpoints in `backend/app/api/` to expose these new capabilities to the frontend.
3.  **Frontend UI**: Develop new React components to utilize the new API endpoints.
