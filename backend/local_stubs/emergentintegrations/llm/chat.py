"""Stub for emergentintegrations.llm.chat.

Preserves the API surface used by routers/ai.py and routers/scan.py:

  from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

All classes raise NotImplementedError on construction — the real
package is no longer on PyPI. The stub exists so:
  1. Backend modules can be imported without NameError.
  2. CI can install deps without emergentintegrations==0.1.0 failing.
  3. FastAPI can register the routes; the AI endpoints will return 501
     when called (handled in each router).

To re-enable AI: replace this stub with a real LLM client (e.g.
google-generativeai SDK, anthropic, openai) and update the routers.
"""
from __future__ import annotations


class _StubErrorMixin:
    def __init__(self, *args, **kwargs):
        raise NotImplementedError(
            "emergentintegrations is no longer published on PyPI. "
            "Replace local_stubs/emergentintegrations/llm/chat.py with "
            "a real LLM client (e.g. google-generativeai) and update the "
            "routers to call it directly."
        )


class LlmChat(_StubErrorMixin):  # type: ignore[no-redef]
    """Stub. Real class had a fluent .with_model(provider, model) builder
    and async .send_message(user_message)."""


class UserMessage(_StubErrorMixin):  # type: ignore[no-redef]
    """Stub. Real class held text=... and file_contents=[...]."""


class ImageContent(_StubErrorMixin):  # type: ignore[no-redef]
    """Stub. Real class held image_base64=... strings."""