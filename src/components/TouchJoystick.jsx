import { useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";
import { movement } from "../lib/controls";

export default function TouchJoystick({ active }) {
  const pointer = useRef(null);
  const origin = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reset = () => {
    pointer.current = null;
    origin.current = null;
    setAnchor(null);
    for (const direction of Object.keys(movement)) movement[direction] = 0;
    setOffset({ x: 0, y: 0 });
  };
  useEffect(() => {
    reset();
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("blur", reset);
      for (const direction of Object.keys(movement)) movement[direction] = 0;
    };
  }, [active]);
  const update = (event) => {
    const radius = 38;
    let x = event.clientX - origin.current.x;
    let y = event.clientY - origin.current.y;
    const distance = Math.hypot(x, y);
    const scale = distance > radius ? radius / distance : 1;
    x *= scale;
    y *= scale;
    setOffset({ x, y });
    // A small dead zone avoids drift; farther from center means faster walking.
    const strength = Math.max(
      0,
      (Math.min(distance / radius, 1) - 0.12) / 0.88,
    );
    const length = Math.hypot(x, y) || 1;
    movement.forward = Math.max(0, -y / length) * strength;
    movement.back = Math.max(0, y / length) * strength;
    movement.left = Math.max(0, -x / length) * strength;
    movement.right = Math.max(0, x / length) * strength;
  };
  if (!active) return null;
  return (
    <button
      className="touch-movement-area"
      aria-label="Touch movement area"
      aria-describedby="joystick-help"
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        origin.current = { x: event.clientX, y: event.clientY };
        const box = event.currentTarget.getBoundingClientRect();
        setAnchor({ x: event.clientX - box.left, y: event.clientY - box.top });
        setOffset({ x: 0, y: 0 });
      }}
      onPointerMove={(event) => {
        if (pointer.current === event.pointerId) update(event);
      }}
      onPointerUp={(event) => {
        if (pointer.current === event.pointerId) reset();
      }}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onBlur={reset}
    >
      {anchor && (
        <span
          className="touch-joystick"
          data-testid="touch-joystick"
          style={{ left: anchor.x, top: anchor.y }}
        >
          <span
            className="joystick-knob"
            style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          >
            <Move size={23} />
          </span>
        </span>
      )}
      <span id="joystick-help" className="joystick-help">
        Drag to walk · Release to stop
      </span>
    </button>
  );
}
