from __future__ import annotations
import json
import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

class LogLevel(str, Enum):
    INFO = "INFO"
    DEBUG = "DEBUG"
    WARNING = "WARNING"
    ERROR = "ERROR"

class LogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    level: LogLevel = LogLevel.INFO
    agent: str
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None

class TelemetryManager:
    """Manages telemetry for a single agent execution."""
    def __init__(self, agent_name: str, session_id: Optional[str] = None):
        self.agent_name = agent_name
        self.session_id = session_id
        self.entries: List[LogEntry] = []

    def _log(self, level: LogLevel, message: str, **metadata):
        entry = LogEntry(
            level=level,
            agent=self.agent_name,
            message=message,
            metadata=metadata,
            session_id=self.session_id
        )
        self.entries.append(entry)
        # Still print to console for visibility in logs
        print(f"[{entry.timestamp}] {level.value} | {self.agent_name}: {message}")

    def info(self, message: str, **metadata):
        self._log(LogLevel.INFO, message, **metadata)

    def debug(self, message: str, **metadata):
        self._log(LogLevel.DEBUG, message, **metadata)

    def warning(self, message: str, **metadata):
        self._log(LogLevel.WARNING, message, **metadata)

    def error(self, message: str, **metadata):
        self._log(LogLevel.ERROR, message, **metadata)

    def get_entries(self) -> List[dict]:
        return [e.dict() for e in self.entries]

class TelemetryCallbackHandler(BaseCallbackHandler):
    """LangChain callback to capture LLM interactions into telemetry."""
    def __init__(self, telemetry_manager: TelemetryManager):
        self.telemetry = telemetry_manager

    def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any) -> Any:
        # Capture the prompt sent to the LLM
        self.telemetry.debug(
            f"🧠 LLM Call Started",
            prompts=prompts,
            model_info=serialized.get("name") if serialized else "Unknown",
            invocation_params=kwargs.get("invocation_params", {})
        )

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> Any:
        # Capture the response from the LLM
        generations = response.generations[0] if response.generations else []
        outputs = [g.text for g in generations]
        token_usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
        
        self.telemetry.debug(
            f"✅ LLM Call Completed",
            outputs=outputs,
            token_usage=token_usage
        )
        
        # Also provide a concise summary in INFO
        summary = outputs[0][:100] + "..." if outputs and len(outputs[0]) > 100 else (outputs[0] if outputs else "No response")
        self.telemetry.info(f"🤖 LLM Response: {summary}")

    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs: Any) -> Any:
        self.telemetry.info(f"🛠️ Tool Start: {serialized.get('name')}", tool_input=input_str)

    def on_tool_end(self, output: str, **kwargs: Any) -> Any:
        self.telemetry.info(f"✅ Tool Completed", tool_output=output)

    def on_chain_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> Any:
        self.telemetry.error(f"❌ Chain Error: {str(error)}")
