import { useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";
import { movement } from "../lib/controls";

export default function TouchJoystick({ active }) {
  const pointer = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const reset = () => {
    pointer.current = null;
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
    const box = event.currentTarget.getBoundingClientRect();
    const radius = box.width * 0.3;
    let x = event.clientX - (box.left + box.width / 2);
    let y = event.clientY - (box.top + box.height / 2);
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
      id="movement-pad"
      className="touch-joystick"
      aria-label="Movement joystick"
      aria-describedby="joystick-help"
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        update(event);
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
      <span
        className="joystick-knob"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <Move size={23} />
      </span>
      <span id="joystick-help" className="joystick-help">
        Drag to walk · Release to stop
      </span>
    </button>
  );
}
