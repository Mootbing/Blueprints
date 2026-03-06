import type { Action } from "../types";
import type { RuntimeStore } from "./useRuntimeStore";
import { evaluate } from "./evaluate";
import { safeOpenUrl } from "../utils/safeUrl";

export function executeActions(
  actions: Action[],
  store: RuntimeStore,
  navigation: { navigate: (id: string) => void; resetAndBuild?: () => void }
) {
  const context = { variables: store.variables };

  for (const action of actions) {
    switch (action.type) {
      case "SET_VARIABLE": {
        const value = evaluate(action.value, context);
        store.setVariable(action.key, value);
        // Update context for subsequent actions in the same batch
        context.variables = { ...context.variables, [action.key]: value };
        break;
      }
      case "TOGGLE_VARIABLE":
        store.toggleVariable(action.key);
        context.variables = {
          ...context.variables,
          [action.key]: !context.variables[action.key],
        };
        break;
      case "NAVIGATE":
        navigation.navigate(action.target);
        break;
      case "OPEN_URL": {
        const url = String(evaluate(action.url, context) ?? action.url);
        safeOpenUrl(url);
        break;
      }
      case "RESET_CANVAS":
        navigation.resetAndBuild?.();
        break;
      case "CONDITIONAL": {
        const result = evaluate(action.condition, context);
        if (result) {
          executeActions(action.then, store, navigation);
        } else if (action.else) {
          executeActions(action.else, store, navigation);
        }
        break;
      }
    }
  }
}
