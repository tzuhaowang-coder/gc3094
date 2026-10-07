# Cocos Reference Finder 0.2.2

Cocos Creator 3.8.8 extension for finding static references to an Asset inside Scene and Prefab files.

## Usage

1. Install this extension under the project's `extensions/cocos-reference-finder` folder.
2. In the Assets panel, right-click an asset.
3. Choose **Find References (Console)**.
4. Open Cocos Creator's Console/Developer Tools console to inspect the results.

The output includes:
- Scene / Prefab file
- Node hierarchy path when resolvable
- Component type
- Property path containing the asset UUID
- Node ID when available
- resolved/unresolved state

This version does not open the Reference Finder panel for asset searches.

The scanner searches serialized `.scene` and `.prefab` files under `assets/`. It finds static serialized UUID references; runtime/dynamic references such as `resources.load('textures/' + name)` are outside the current scope.
