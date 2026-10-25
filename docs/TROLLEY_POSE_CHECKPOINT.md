# Trolley-pushing pose — resumed and rebuilt

The owner resumed work on 25 October 2026. Both local quality variants were rebuilt from the latest repair helper and reviewed in the actual store. The raised hand is lowered; both hands reach the trolley handle. Walking remains driven by the existing lower-body animation.

The original static scan has fused hand/hair and hand/thigh geometry. Repairs include a reconstructed left sleeve/inner forearm and a simplified denim contact patch. These areas are approximate; fingers are static and this is not a full humanoid IK rig. Creator attribution and CC BY 4.0 license remain intact.

## Rebuilding

Run `blender -b -t 4 --python scripts/prepare-jeans-shopper.py -- .workbench/shopper-trolley-pose/original-model.glb .workbench/shopper-trolley-pose/rebuilt`, then copy the two GLBs to the selected model directory and refresh actual triangle/byte counts in both attribution.json and index.json. Normal builds use committed GLBs and need no Blender.

The ignored .workbench/shopper-trolley-pose directory retains original-model.glb, normalized.blend and earlier review scenes. A fresh checkout needs the original owner-supplied official archive; the archive SHA-256 remains in attribution.json. Do not scrape or bypass Sketchfab downloads.

The candidate preview is docs/shopper-trolley-pose.png. The live site remains unchanged until this branch is published with owner authorization.

Validation: 35 unit/backend tests passed. Six focused browser checks passed on the first run; the mobile cart/reload check passed after waiting for scene loading and rerunning with an isolated test server (seven focused checks total). Production and Pages Functions builds passed. The in-store preview reported no JavaScript errors. Physical-device performance is not verified.
