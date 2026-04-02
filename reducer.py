from __future__ import annotations
from typing import Dict

def _merge(a: Dict, b: Dict) -> Dict:
    """
    Merge two dicts. List values are concatenated.
    If a value in b is None, that key is DELETED from the result (used for phase re-runs).
    """
    out = dict(a or {})
    for k, v in (b or {}).items():
        if v is None:
            out.pop(k, None)          # None = explicit delete (for HITL re-run clearing)
        elif k in out and isinstance(out[k], list) and isinstance(v, list):
            out[k] = out[k] + v       # append lists
        else:
            out[k] = v                # overwrite
    return out
