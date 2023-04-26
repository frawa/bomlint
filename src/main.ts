#!/usr/bin/env node

// Align versions in a package.json file with versions in a .bomlint.json file.

import {checkForUpdatesFromBom, StringDict} from "./bomlint";
const { Command } = require("commander");

const program = new Command();

const myPackageJson  = require("../package.json");

program
    .name("bomlint")
    .version(myPackageJson.version)
    .description("Checks package dependencies against BOM")
    .option("--fix", "Apply bom file to package dependencies")
    .option("--merge", "Add package dependencies to BOM file")
    // .argument("[<file...>]", "package.json file(s) to be checked/fixed", "package.json")
    .parse(process.argv)

const options = program.opts();

const merge = options.merge ?? false; //process.argv.includes("--merge")
const fix = options.fix ?? false; // process.argv.includes("--fix")

if (merge && fix) {
    console.log("merge and fix cannot be used together");
    process.exit(1)
}

const pathArg = program.args[0] ?? "package.json";

const fs = require('fs')
const path = require('path');
const cwd = process.cwd()

const packageJsonPath = path.relative(cwd, pathArg)

if (!fs.existsSync(packageJsonPath)) {
    console.log(`No package file ${packageJsonPath}.`)
    process.exit(1)
}

const homePath = require('os').homedir();
const bomPath = path.relative(cwd, findBomPath(cwd))

if (!fs.existsSync(bomPath)) {
    console.log(`No BOM file ${bomPath}.`)
    process.exit(1)
}

const bom = JSON.parse(fs.readFileSync(bomPath))
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

if (merge) {
    mergeIntoBom(packageJson, bom)
    process.exit(1)
}

console.log(`Linting ${packageJsonPath} using BOM ${bomPath}.`)
const { updates, patchedPackageJson } = checkForUpdatesFromBom(bom, packageJson)

if (updates.length > 0) {
    updates.forEach(update => {
        console.log(update)
    })
    if (fix) {
        fs.writeFileSync(packageJsonPath, JSON.stringify(patchedPackageJson, null, 2))
        console.log(`Updates written to ${packageJsonPath}.`, updates)
    } else {
        console.log(`Updates needed in ${packageJsonPath}.`, updates)
        process.exit(1)
    }
}


// ---

function mergeIntoBom(packageJson: any, bom: StringDict): void {
    console.log(`Merging ${packageJsonPath} into BOM ${bomPath}.`)

    const all: StringDict = {
        ...packageJson.dependencies,
        ...packageJson.peerDependencies,
        ...packageJson.devDependencies,
    }

    const merged: StringDict = Object.assign({}, bom);
    let count = 0
    for (let [pkg, version] of Object.entries(all)) {
        const bomVersion = merged[pkg]
        if (bomVersion && bomVersion !== version) {
            merged[pkg] = `${bomVersion} || ${version}`
            count++
        } else {
            merged[pkg] = version
        }
    }

    if (count > 0) {
        fs.writeFileSync(bomPath, JSON.stringify(merged, null, 2))
        console.log(`Merges written to BOM ${bomPath}.`)
    } else {
        console.log(`No merges needed.`)
    }
}


function findBomPath(dir: string): string {
    const candidate = path.join(dir, ".bomlint.json")
    if (fs.existsSync(candidate)) {
        return candidate
    }
    if (dir === homePath) {
        return ".bomlint.json"
    }
    return findBomPath(path.dirname(dir))
}