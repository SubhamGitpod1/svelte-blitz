import createHandler from "createHandler"
export const get = createHandler((req, res) => res.send("<h1>this works</h1>"))