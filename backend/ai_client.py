"""Thin async wrapper around the official `google-genai` SDK.

This module replaces the previous `emergentintegrations` package, which
was never actually published on PyPI (the routers were running against
a local stub that raised NotImplementedError). The wrapper preserves
the exact API surface the routers depend on:

    chat = LlmChat(
        api_key="...",
        session_id="...",         # accepted but unused (we send stateless)
        system_message="...",     # injected as system_instruction
    ).with_model("gemini", "gemini-2.5-flash")

    response = await chat.send_message(UserMessage(
        text="...",
        file_contents=[ImageContent(image_base64="...")],
    ))

Why we don't use the chat-session abstraction
--------------------------------------------
`LlmChat.send_message()` previously implied a stateful multi-turn
session. The routers only ever send a single message per request and
discard the session, so we map each call to a fresh
`client.models.generate_content(...)` invocation. This is stateless,
cheaper (no history to keep), and matches how the routers actually use
the API. If a future router wants real multi-turn, add a `start_chat()`
helper alongside `send_message()`.

Why google-genai (not google-generativeai)
------------------------------------------
`google.generativeai` was deprecated in 2025. The replacement is
`google-genai` (https://pypi.org/project/google-genai/), which ships a
newer `genai.Client` API and a richer `types.GenerateContentConfig`.
Pin a major version so an SDK breaking-change won't silently take the
backend down.

Defensive kwargs
----------------
`UserMessage` accepts both `file_contents=[...]` (canonical name) and
`image_contents=[...]` (typo'd in a few routers — preserved for
backwards compatibility while we normalise). New code should use
`file_contents`.
"""
from __future__ import annotations

import asyncio
import base64
import logging
from typing import List, Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)


# ── Default model ──────────────────────────────────────────────────────────
# gemini-2.5-flash is the stable, balanced, low-cost default. Callers can
# still override via .with_model("gemini", "gemini-2.5-pro") for higher
# quality or "gemini-2.5-flash-lite" for cheaper bulk calls.
DEFAULT_MODEL = "gemini-2.5-flash"
SUPPORTED_PROVIDERS = {"gemini"}


# ── Public API surface ─────────────────────────────────────────────────────

class ImageContent:
    """Base64-encoded image for multimodal prompts.

    The router is expected to strip any `data:image/...;base64,` prefix
    before constructing an ImageContent (the underlying SDK doesn't
    accept the data-URI prefix).
    """

    def __init__(self, image_base64: str):
        self.image_base64 = image_base64


class UserMessage:
    """A single user turn: optional text + zero or more images.

    Accepts both `file_contents=` and `image_contents=` for backwards
    compatibility with routers that previously had a typo'd kwarg. New
    code should use `file_contents`.
    """

    def __init__(
        self,
        text: str = "",
        file_contents: Optional[List[ImageContent]] = None,
        image_contents: Optional[List[ImageContent]] = None,
    ):
        self.text = text
        # Prefer the canonical `file_contents`; fall back to the alias.
        if file_contents is not None:
            self.file_contents = file_contents
        elif image_contents is not None:
            self.file_contents = image_contents
            logger.debug(
                "UserMessage received `image_contents` (legacy alias); "
                "rename to `file_contents`."
            )
        else:
            self.file_contents = []


class LlmChat:
    """Async-compatible Gemini chat client.

    Usage:
        chat = LlmChat(api_key=..., system_message="...") \
            .with_model("gemini", "gemini-2.5-flash")
        text = await chat.send_message(UserMessage(text="hi"))

    `session_id` is accepted for API parity with the previous package
    but is unused (we're stateless).
    """

    def __init__(
        self,
        api_key: str,
        session_id: Optional[str] = None,
        system_message: Optional[str] = None,
    ):
        if not api_key:
            raise ValueError("LlmChat requires a non-empty api_key")
        self.api_key = api_key
        self.session_id = session_id  # accepted but unused
        self.system_message = system_message
        self._model_name: Optional[str] = None

    def with_model(self, provider: str, model: str) -> "LlmChat":
        """Set the provider + model. Returns self for chaining."""
        if provider not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported provider {provider!r}; "
                f"supported: {sorted(SUPPORTED_PROVIDERS)}"
            )
        if not model:
            raise ValueError("Model name is required")
        self._model_name = model
        return self

    async def send_message(self, user_message: UserMessage) -> str:
        """Send a single user turn and return the model's text reply."""
        if not self._model_name:
            # Default to the canonical Flash model if the caller didn't
            # call .with_model(...). The original emergentintegrations
            # API required the explicit call, but several routers were
            # inconsistent — make this forgiving rather than 500-ing.
            logger.debug(
                "LlmChat.send_message() called without .with_model(); "
                "defaulting to %s",
                DEFAULT_MODEL,
            )
            self._model_name = DEFAULT_MODEL

        client = genai.Client(api_key=self.api_key)
        contents = _build_contents(user_message)
        config = types.GenerateContentConfig(
            system_instruction=self.system_message,
        ) if self.system_message else None

        # `client.models.generate_content` is sync under the hood. Run
        # it in the default executor so we don't block the event loop
        # while the HTTP request is in flight.
        loop = asyncio.get_running_loop()

        def _do_generate():
            kwargs = {"model": self._model_name, "contents": contents}
            if config is not None:
                kwargs["config"] = config
            return client.models.generate_content(**kwargs)

        response = await loop.run_in_executor(None, _do_generate)
        # `.text` is None if the model refused / was filtered; surface
        # an empty string rather than letting `None` propagate (the
        # routers already do `json.loads(response)` downstream).
        return response.text or ""


# ── Internal helpers ───────────────────────────────────────────────────────

def _build_contents(user_message: UserMessage) -> List[types.Part]:
    """Convert a UserMessage into the SDK's `contents` list of Parts."""
    parts: List[types.Part] = []
    if user_message.text:
        parts.append(types.Part(text=user_message.text))
    for img in user_message.file_contents:
        try:
            img_bytes = base64.b64decode(img.image_base64, validate=True)
        except Exception as exc:
            # Don't crash on a bad base64 — log and skip so the call
            # still goes through with whatever other content is valid.
            logger.warning("Skipping malformed image content: %s", exc)
            continue
        # Default to JPEG; PNG is also common and the SDK accepts both
        # via the mime_type hint. The previous emergentintegrations
        # package auto-detected from the magic bytes — we keep it
        # simple and assume JPEG since the scan pipeline produces
        # JPEGs from PIL. Callers producing PNGs should use a content
        # type the SDK accepts and we can sniff here if needed.
        parts.append(
            types.Part.from_bytes(
                mime_type=_guess_image_mime(img_bytes),
                data=img_bytes,
            )
        )
    return parts


def _guess_image_mime(data: bytes) -> str:
    """Sniff image format from magic bytes (PNG / JPEG / WebP / GIF)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "image/gif"
    # Fall back to JPEG (most common in our pipeline).
    return "image/jpeg"