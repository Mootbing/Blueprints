# Database Integration Plan

## Current Setup

Persistence uses `AsyncStorageProvider` (local device storage via `@react-native-async-storage/async-storage`).

All storage goes through the `StorageProvider` interface:

```ts
interface StorageProvider {
  loadBlueprint(): Promise<AppBlueprint | null>;
  saveBlueprint(blueprint: AppBlueprint): Promise<void>;
}
```

## Swapping to a DB

1. Create a new class implementing `StorageProvider` (e.g., `NeonStorageProvider`, `SupabaseStorageProvider`).
2. Change one line in `App.tsx`:

```ts
const storage: StorageProvider = new YourDbProvider();
```

## Notes

- Loaded data is validated against the Zod `AppBlueprintSchema`. Invalid/corrupt data returns `null`, falling back to the default blueprint.
- Saves are debounced (500ms) to avoid excessive writes during drag/edit operations.
- The existing `useBlueprint.ts` hook has a Supabase fetch example that can be referenced when building the DB provider.
