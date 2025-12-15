"""
WebSocket Voice Assistant API
Handles binary audio streaming for STT, LLM, and TTS pipeline.
"""
import os
import logging
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from typing import Optional
import json

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix=f"{settings.API_PREFIX}/voice", tags=["Voice"])

# Simple auth check (can be enhanced with JWT)
def check_voice_auth(token: Optional[str] = Query(None)) -> bool:
    """
    Check WebSocket auth (simple token or JWT).
    In dev mode, allow if no token configured.
    """
    expected_token = os.getenv("VOICE_WS_TOKEN") or os.getenv("API_TOKEN")
    
    # Dev fallback: if no token configured, allow connection
    if not expected_token:
        logger.warning("No VOICE_WS_TOKEN configured, allowing connection (dev mode)")
        return True
    
    return token == expected_token


@router.websocket("/ws")
async def voice_assistant_ws(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    origin: Optional[str] = None
):
    """
    WebSocket endpoint for voice assistant with binary audio streaming.
    
    Handles:
    - Binary audio input (STT)
    - Interim STT partials
    - Final transcript
    - LLM token stream
    - TTS audio chunks
    
    Message format:
    - Binary: Raw audio bytes (PCM, Opus, etc.)
    - JSON: Control messages (start, stop, config)
    
    Response format:
    - Binary: TTS audio chunks
    - JSON: Status updates, STT partials, transcripts, LLM tokens
    """
    # Check origin whitelist
    allowed_origins = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    if origin and origin not in allowed_origins:
        logger.warning(f"Rejected connection from origin: {origin}")
        await websocket.close(code=1008, reason="Origin not allowed")
        return
    
    # Check auth
    if not check_voice_auth(token):
        await websocket.close(code=1008, reason="Authentication failed")
        return
    
    await websocket.accept()
    logger.info("Voice assistant WebSocket connected")
    
    # Audio buffer for STT
    audio_buffer = bytearray()
    is_recording = False
    
    try:
        while True:
            # Receive message (can be binary or text)
            try:
                message = await websocket.receive()
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break
            
            # Handle binary audio data
            if "bytes" in message:
                audio_chunk = message["bytes"]
                audio_buffer.extend(audio_chunk)
                is_recording = True
                
                # Send acknowledgment (optional)
                await websocket.send_json({
                    "type": "audio_received",
                    "bytes": len(audio_chunk),
                    "total_bytes": len(audio_buffer)
                })
                
                # Process audio in chunks (simplified - in production, use proper STT streaming)
                if len(audio_buffer) > 16000:  # Process every ~1 second at 16kHz
                    # TODO: Send to STT service (Deepgram, Whisper, etc.)
                    # For now, send stub response
                    await websocket.send_json({
                        "type": "stt_partial",
                        "text": "[interim transcription...]",
                        "confidence": 0.85
                    })
                    audio_buffer.clear()
            
            # Handle text/JSON control messages
            elif "text" in message:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")
                    
                    if msg_type == "start":
                        # Start recording
                        is_recording = True
                        audio_buffer.clear()
                        await websocket.send_json({
                            "type": "status",
                            "status": "recording",
                            "message": "Recording started"
                        })
                    
                    elif msg_type == "stop":
                        # Stop recording and process final transcript
                        is_recording = False
                        
                        # TODO: Send final audio buffer to STT service
                        # For now, send stub final transcript
                        await websocket.send_json({
                            "type": "stt_final",
                            "text": "[final transcription...]",
                            "confidence": 0.92
                        })
                        
                        # TODO: Send transcript to LLM and stream response
                        # For now, send stub LLM response
                        await websocket.send_json({
                            "type": "llm_token",
                            "delta": "Hello! "
                        })
                        await asyncio.sleep(0.1)
                        await websocket.send_json({
                            "type": "llm_token",
                            "delta": "How can I "
                        })
                        await asyncio.sleep(0.1)
                        await websocket.send_json({
                            "type": "llm_token",
                            "delta": "help you?"
                        })
                        await asyncio.sleep(0.1)
                        await websocket.send_json({
                            "type": "llm_done",
                            "full_response": "Hello! How can I help you?"
                        })
                        
                        # TODO: Send LLM response to TTS and stream audio
                        # For now, send stub TTS audio chunk
                        await websocket.send_bytes(b"[TTS audio chunk placeholder]")
                        
                        audio_buffer.clear()
                    
                    elif msg_type == "config":
                        # Update configuration
                        await websocket.send_json({
                            "type": "config_updated",
                            "config": data.get("config", {})
                        })
                    
                    elif msg_type == "ping":
                        # Keep-alive
                        await websocket.send_json({"type": "pong"})
                    
                except json.JSONDecodeError:
                    logger.warning(f"Invalid JSON received: {message['text']}")
                    await websocket.send_json({
                        "type": "error",
                        "error": "Invalid JSON"
                    })
    
    except WebSocketDisconnect:
        logger.info("Voice assistant WebSocket disconnected")
    except Exception as e:
        logger.error(f"Voice assistant WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "error": str(e)
            })
        except:
            pass
    finally:
        logger.info("Voice assistant WebSocket closed")

