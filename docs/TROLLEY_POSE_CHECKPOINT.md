# Paused checkpoint — both hands on trolley

The owner explicitly requested saving and stopping. **Do not continue, merge or publish until the owner asks to resume.** The live site remains at the previously published model/pose, commit fb1aade. This branch is an unfinished experiment, not a release-ready replacement.

## Goal and current state

Lower the raised hand and put both hands on the trolley handle while keeping the selected Grauwolf model, walking, license credits and normal shopping behavior.

- Source model: https://sketchfab.com/3d-models/d81314a29e3943d88a6ee1426021a177 , Grauwolf, CC BY 4.0. Owner supplied `model-an-jeans.zip`, containing `source/model.glb`. Original archive hash remains in the attribution records.
- The source is a fixed, unrigged mesh with touching/fused hand/hair and hand/thigh geometry. Simple deformation caused stretched hair, sleeve defects and a residual thigh imprint. Do not treat geometry proximity tests as proof of good visual quality.
- `scripts/shopper_pose.py` is the current Blender-only reposing/repair experiment. `prepare-jeans-shopper.py` calls it before decimation, resizing and lower-body animation export.
- Current proposed grips in Three coordinates: X ±0.205, Y 1.04, Z 0.28. Cart uses full scale with wrapper Z -0.15; its center offset is 0.71. Matching collider values are staged.
- `shopper-push.glb` / `shopper-push-low.glb` and runtime URLs are staged instead of the previous files. **These bundled GLBs are from an earlier script iteration, not the latest repair.** They still show visible sleeve/contact defects. Do not publish them.
- Earlier staged exports passed 35 unit/backend tests and seven focused browser tests, including model loading, walking, grip proximity, production texture policy, fallback, quality switching and shopping interactions. Visual review then found defects. Later sleeve/forearm/head-contact repairs in the scripts have not been exported to the bundled GLBs or tested. Those earlier passes do not validate the latest script.
- `docs/shopper-trolley-pose.png` is an earlier in-store WIP screenshot showing the sleeve issue, not an approved final preview.

## Local files preserved for resuming

Ignored `.workbench/shopper-trolley-pose/` contains:

- `original-model.glb`: the exact original source with embedded textures.
- `normalized.blend`: original normalized figure before arm editing.
- `latest-pose.blend`: the latest repaired pose, including review handle and materials.
- `latest-front.png` and `latest-side.png`: latest Blender review renders.

These large local work files are retained in this workspace, not committed to Git. A fresh checkout without this workspace needs the owner's original archive/source again. The code, earlier draft GLBs, credits and this checkpoint are committed to the feature branch.

## Resume checklist — only after owner instruction

1. Inspect the latest front/side renders and Blender scene. Check face/hair integrity, left sleeve/forearm continuity, both palm contacts, denim patch edges and silhouette from the customer camera. The latest attempt reconstructs part of the sleeve/inner forearm and contact surface; it is not a professional full humanoid rig or finger IK setup.
2. Fix remaining visual defects before regenerating anything for publication. If the source cannot be reposed cleanly, say so instead of presenting broken geometry as finished.
3. To rebuild candidate files from the preserved source:

   ```sh
   blender -b -t 4 --python scripts/prepare-jeans-shopper.py -- .workbench/shopper-trolley-pose/original-model.glb .workbench/shopper-trolley-pose/rebuilt
   ```

4. After visual approval of the candidate, replace the two staged runtime GLBs, refresh manifest file sizes/triangle counts and modification/credit records, and inspect actual walking in desktop and Lightweight views. Preserve embedded CC BY copyright notices and the Help credit link.
5. Run `npm test`, `npm run build` and focused Playwright tests for jeans-model, visitors and merchandising. Actual Three geometry tests check both grip positions; visual review remains necessary. Capture an honest final in-store preview with no errors.
6. Commit/push a finished change for review. Do not deploy without owner authorization. No Sketchfab Admin UI or new authentication/account work is requested.
