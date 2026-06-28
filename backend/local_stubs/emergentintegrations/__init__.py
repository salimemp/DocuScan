"""Local stub for the emergentintegrations package.

The real package (https://pypi.org/project/emergentintegrations/) is no
longer on PyPI (404). This stub preserves the import surface so the
backend can boot and routes can register, but LLM calls will fail at
runtime with a clear NotImplementedError pointing at the missing
provider.

When production is ready to ship AI features, replace this stub with
the real package (or migrate to a direct google-generativeai /
anthropic / openai call).
"""
__version__ = "0.0.0-local-stub"