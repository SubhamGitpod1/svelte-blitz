/// <reference types="@sveltejs/kit" />

import type { Ctx } from "@blitzjs/next";

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace App {
	interface Locals {
		userid: string;
	}

	// interface Platform {}

	interface Session {
		BlitzContext: Ctx
	}

	// interface Stuff {}
}
