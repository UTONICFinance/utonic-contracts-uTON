
export const loadIni = (path: string, mode="UTF-8") => {
    const fs = require("fs");
    const ini = require("ini");
    const cfg = ini.parse(fs.readFileSync(path, mode))
    return cfg;
}