import { useEffect, useRef, useState } from "react";
import { Move } from "lucide-react";
import { movement } from "../lib/controls";

export default function TouchJoystick({ active }) {
  const pointer = useRef(null);
  const origin = useRef(null);
  const looking = useRef(false);
  const [anchor, setAnchor] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    let dragged = false;
    let suppressClick = false;
    const reset = () => {
      pointer.current = null;
      origin.current = null;
      looking.current = false;
      setAnchor(null);
      setOffset({ x: 0, y: 0 });
      for (const direction of Object.keys(movement)) movement[direction] = 0;
    };
    reset();
    if (!active) return;
    const down = (event) => {
      suppressClick = false;
      if (
        event.pointerType !== "touch" ||
        !matchMedia("(pointer: coarse)").matches ||
        !event.target.matches?.('canvas[data-testid="store-canvas"]') ||
        pointer.current !== null
      )
        return;
      pointer.current = event.pointerId;
      origin.current = { x: event.clientX, y: event.clientY };
      dragged = false;
      const bounds = event.target.getBoundingClientRect();
      looking.current = event.clientY < bounds.top + bounds.height / 2;
      if (!looking.current) setAnchor(origin.current);
      event.target.setPointerCapture(event.pointerId);
    };
    const move = (event) => {
      if (event.pointerId !== pointer.current || !origin.current) return;
      event.preventDefault();
      if (!looking.current) event.stopPropagation();
      const x = event.clientX - origin.current.x;
      const y = event.clientY - origin.current.y;
      const distance = Math.hypot(x, y);
      if (distance > 6) dragged = true;
      // Upper-half drags continue to the camera handler; never walk.
      if (looking.current) return;
      const scale = Math.min(1, 38 / (distance || 1));
      setOffset({ x: x * scale, y: y * scale });
      const strength = Math.max(0, (Math.min(distance / 38, 1) - 0.16) / 0.84);
      const length = distance || 1;
      movement.forward = Math.max(0, -y / length) * strength;
      movement.back = Math.max(0, y / length) * strength;
      movement.left = Math.max(0, -x / length) * strength;
      movement.right = Math.max(0, x / length) * strength;
    };
    const up = (event) => {
      if (event.pointerId !== pointer.current) return;
      suppressClick = dragged;
      reset();
    };
    const click = (event) => {
      if (
        suppressClick &&
        event.target.matches?.('canvas[data-testid="store-canvas"]')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("pointermove", move, {
      capture: true,
      passive: false,
    });
    document.addEventListener("pointerup", up, true);
    document.addEventListener("pointercancel", up, true);
    document.addEventListener("lostpointercapture", up, true);
    document.addEventListener("click", click, true);
    window.addEventListener("blur", reset);
    return () => {
      reset();
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("pointermove", move, true);
      document.removeEventListener("pointerup", up, true);
      document.removeEventListener("pointercancel", up, true);
      document.removeEventListener("lostpointercapture", up, true);
      document.removeEventListener("click", click, true);
      window.removeEventListener("blur", reset);
    };
  }, [active]);
  if (!active || !anchor) return null;
  return (
    <div className="floating-joystick-layer" aria-hidden="true">
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
    </div>
  );
}
