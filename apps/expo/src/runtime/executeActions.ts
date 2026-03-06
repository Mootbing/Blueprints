import type { Action } from "../types";
import type { RuntimeStore } from "./useRuntimeStore";
import { evaluate } from "./evaluate";
import { safeOpenUrl } from "../utils/safeUrl";

function interpolateTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
    const val = evaluate(expr.trim(), { variables });
    return val != null ? String(val) : "";
  });
}

export async function executeActions(
  actions: Action[],
  store: RuntimeStore,
  navigation: { navigate: (id: string) => void; resetAndBuild?: () => void; openAgent?: (prompt: string) => void },
) {
  const context = { variables: { ...store.variables } };

  for (const action of actions) {
    switch (action.type) {
      case "SET_VARIABLE": {
        const value = evaluate(action.value, context);
        store.setVariable(action.key, value);
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
      case "OPEN_AGENT": {
        const prompt = String(context.variables[action.promptVariable] ?? "");
        if (prompt.trim()) navigation.openAgent?.(prompt.trim());
        break;
      }
      case "FETCH": {
        const url = interpolateTemplate(action.url, context.variables);
        const method = action.method ?? "GET";
        const headers: Record<string, string> = action.headers
          ? Object.fromEntries(
              Object.entries(action.headers).map(([k, v]: [string, string]) => [
                k,
                interpolateTemplate(v, context.variables),
              ]),
            )
          : {};
        let body: string | undefined;
        if (action.body) {
          const evaluated = evaluate(action.body, context);
          body =
            typeof evaluated === "string"
              ? evaluated
              : JSON.stringify(evaluated);
        }

        try {
          const res = await fetch(url, {
            method,
            headers: {
              "Content-Type": "application/json",
              ...headers,
            },
            ...(body && method !== "GET" ? { body } : {}),
          });
          const data = await res.json().catch(() => res.text());
          store.setVariable(action.resultVariable, data);
          context.variables = {
            ...context.variables,
            [action.resultVariable]: data,
          };
          if (action.errorVariable) {
            store.setVariable(action.errorVariable, null);
            context.variables = {
              ...context.variables,
              [action.errorVariable]: null,
            };
          }
          if (action.onSuccess) {
            await executeActions(action.onSuccess, store, navigation);
          }
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : "Fetch failed";
          if (action.errorVariable) {
            store.setVariable(action.errorVariable, errorMsg);
            context.variables = {
              ...context.variables,
              [action.errorVariable]: errorMsg,
            };
          }
          if (action.onError) {
            await executeActions(action.onError, store, navigation);
          }
        }
        break;
      }
      case "RUN_CODE": {
        try {
          const setVariable = (key: string, value: unknown) => {
            store.setVariable(key, value);
            context.variables = { ...context.variables, [key]: value };
          };
          const toggleVariable = (key: string) => {
            store.toggleVariable(key);
            context.variables = {
              ...context.variables,
              [key]: !context.variables[key],
            };
          };
          const navigateTo = (screenId: string) =>
            navigation.navigate(screenId);

          const fn = new Function(
            "variables",
            "setVariable",
            "toggleVariable",
            "navigate",
            "fetch",
            `"use strict";\nreturn (async () => {\n${action.code}\n})();`,
          );
          await fn(
            { ...context.variables },
            setVariable,
            toggleVariable,
            navigateTo,
            fetch,
          );
        } catch (err) {
          console.warn("[RUN_CODE] Error:", err);
        }
        break;
      }
      case "CONDITIONAL": {
        const result = evaluate(action.condition, context);
        if (result) {
          await executeActions(action.then, store, navigation);
        } else if (action.else) {
          await executeActions(action.else, store, navigation);
        }
        break;
      }
    }
  }
}
