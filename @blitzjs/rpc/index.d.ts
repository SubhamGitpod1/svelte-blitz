import {Ctx} from "blitz/dist/index-browser"
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