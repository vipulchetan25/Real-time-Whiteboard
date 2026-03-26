import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("https://real-time-whiteboard-vbb7.onrender.com");

function App() {
  const canvasRef = useRef(null);
  const prevX = useRef(null);
  const prevY = useRef(null);

  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(3);
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);

  const [strokes, setStrokes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);

  const joinRoom = () => {
    if (!roomId) return;
    socket.emit("join-room", roomId);
    setJoined(true);
  };

  // Setup canvas
  useEffect(() => {
    if (!joined) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 90;

    socket.on("canvas-update", ({ strokes }) => {
      setStrokes(strokes);
    });

    return () => socket.off("canvas-update");
  }, [joined]);

  // Redraw
useEffect(() => {
  if (!joined) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 90;

  socket.on("canvas-update", ({ strokes }) => {
    setStrokes(strokes);
  });

  return () => socket.off("canvas-update");
}, [joined]); // ✅ FIXED;

  const drawLine = (ctx, line) => {
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.size;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(line.x0, line.y0);
    ctx.lineTo(line.x1, line.y1);
    ctx.stroke();
  };

  const handleMouseDown = (e) => {
    setDrawing(true);
    setCurrentStroke([]);

    const rect = canvasRef.current.getBoundingClientRect();
    prevX.current = e.clientX - rect.left;
    prevY.current = e.clientY - rect.top;
  };

  const handleMouseMove = (e) => {
    if (!drawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const line = {
      x0: prevX.current,
      y0: prevY.current,
      x1: x,
      y1: y,
      color,
      size: brushSize,
    };

    setCurrentStroke((prev) => [...prev, line]);

    prevX.current = x;
    prevY.current = y;
  };

  const handleMouseUp = () => {
    setDrawing(false);

    if (currentStroke.length > 0) {
      const updated = [...strokes, currentStroke];

      setStrokes(updated);
      setRedoStack([]);

      socket.emit("canvas-update", {
        roomId,
        strokes: updated,
      });
    }
  };

  // 🔥 PERFECT UNDO
  const undo = () => {
    if (strokes.length === 0) return;

    const updated = strokes.slice(0, -1);

    setRedoStack((prev) => [...prev, strokes[strokes.length - 1]]);
    setStrokes(updated);

    socket.emit("canvas-update", {
      roomId,
      strokes: updated,
    });
  };

  // 🔥 PERFECT REDO
  const redo = () => {
    if (redoStack.length === 0) return;

    const stroke = redoStack[redoStack.length - 1];
    const updated = [...strokes, stroke];

    setRedoStack((prev) => prev.slice(0, -1));
    setStrokes(updated);

    socket.emit("canvas-update", {
      roomId,
      strokes: updated,
    });
  };

  const clearBoard = () => {
    setStrokes([]);
    setRedoStack([]);

    socket.emit("canvas-update", {
      roomId,
      strokes: [],
    });
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;

    const temp = document.createElement("canvas");
    temp.width = canvas.width;
    temp.height = canvas.height;

    const ctx = temp.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, temp.width, temp.height);
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = temp.toDataURL();
    link.click();
  };

  if (!joined) {
    return (
      <div className="join">
        <h1>🧠 Whiteboard</h1>
        <input
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="toolbar">
        <h2>Room: {roomId}</h2>

        <div className="controls">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            type="range"
            min="1"
            max="10"
            value={brushSize}
            onChange={(e) => setBrushSize(e.target.value)}
          />

          <button onClick={undo}>Undo</button>
          <button onClick={redo}>Redo</button>
          <button onClick={clearBoard}>Clear</button>
          <button onClick={downloadImage}>Download</button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className="canvas"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}

export default App;
