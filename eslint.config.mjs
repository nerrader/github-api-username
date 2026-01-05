// @ts-check

import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";

export default defineConfig(
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	{
		ignores: ["/dist**", "/node_modules**"],
	},
	eslint.configs.recommended,
	tseslint.configs.recommended
);
