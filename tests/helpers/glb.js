// Deliberately simple synthetic triangle for transport/loader tests, not AI output.
export function fixtureGlb(change = {}) {
  const document = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 0],
      },
    ],
    ...change,
  };
  let json = JSON.stringify(document);
  while (json.length % 4) json += " ";
  const jsonBytes = new TextEncoder().encode(json),
    bytes = new Uint8Array(28 + jsonBytes.length + 36),
    view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set(jsonBytes, 20);
  const offset = 20 + jsonBytes.length;
  view.setUint32(offset, 36, true);
  view.setUint32(offset + 4, 0x004e4942, true);
  bytes.set(
    new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer),
    offset + 8,
  );
  return bytes;
}
