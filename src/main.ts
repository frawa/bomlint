#!/usr/bin/env node

// Align versions in a package.json file with versions in a .bomlint.json file.

import {checkForUpdatesFromBom, findBomPath, mergeIntoBom, StringDict} from "./bomlint";
const { Command } = require("commander");
const program = new Command();
const myPackageJson  = require("../package.json");
const fs = require('fs')
const path = require('path');

program
    .name("bomlint")
    .version(myPackageJson.version)
    .description("Checks package dependencies against BOM")
    .option("--fix", "Apply bom file to package dependencies")
    .option("--merge", "Add package dependencies to BOM file")
    .option("--bom <bomfile>", "Path to BOM file")
    .argument("[<file...>]", "package.json file(s) to be checked/fixed", "package.json")

program.parse(process.argv)

const options = program.opts();

const merge = options.merge ?? false; //process.argv.includes("--merge")
const fix = options.fix ?? false; // process.argv.includes("--fix")

if (merge && fix) {
    console.log("merge and fix cannot be used together");
    process.exit(1)
}

const cwd = process.cwd()
const bomPath = options.bom ?? path.relative(cwd, findBomPath(cwd))

if (!fs.existsSync(bomPath)) {
    console.log(`No BOM file ${bomPath}.`)
    process.exit(1)
}

console.log("Using BOM file " + bomPath);
const bom = JSON.parse(fs.readFileSync(bomPath))

const pathsArg: string[] = program.args[0] ?? ["package.json"];

let exitCode = 0;

pathsArg.forEach(pathArg => {
    const packageJsonPath = path.relative(cwd, pathArg)

    if (!fs.existsSync(packageJsonPath)) {
        console.log(`No package file ${packageJsonPath}.`)
        process.exit(1)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

    if (merge) {
        console.log(`Merging ${packageJsonPath} into BOM ${bomPath}.`)
        const r = mergeIntoBom(packageJson, bom);
        if (r.count > 0) {
            fs.writeFileSync(bomPath, JSON.stringify(r.patchedBom, null, 2))
            console.log(`Merges written to BOM ${bomPath}.`)
        } else {
            console.log(`No merges needed.`)
        }
    } else {
        console.log(`Linting ${packageJsonPath}`)
        const { updates, patchedPackageJson } = checkForUpdatesFromBom(bom, packageJson)

        if (updates.length > 0) {
            if (fix) {
                fs.writeFileSync(packageJsonPath, JSON.stringify(patchedPackageJson, null, 2))
                console.log(`Updates written to ${packageJsonPath}.`, updates)
            } else {
                console.log(`Updates needed in ${packageJsonPath}.`, updates)
                exitCode = 1;
            }
        }
    }
})

process.exit(exitCode);