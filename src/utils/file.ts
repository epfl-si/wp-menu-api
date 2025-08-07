import fs from "fs";
import {error, getErrorMessage, info} from "./logger";

export function writeFile(path: string, content: string) {
    let fileCreated = false;
    try {
        fs.writeFileSync(path, content);
        fileCreated = true;
    } catch (e) {
        error("File not written: " + getErrorMessage(e), { url: path });
    }
    return fileCreated;
}

export function readFile(path: string) {
    try {
        return fs.readFileSync(path);
    } catch (e) {
        error("File not found: " + getErrorMessage(e), { url: path });
        return "File not found";
    }
}
