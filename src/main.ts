#!/usr/bin/env node

// Align versions in a package.json file with versions in a .bomlint.json file.

import {
    checkForConflictingDeps,
    checkForUpdatesFromBom,
    findBomPath,
    mergeIntoBom,
    PackageToCheck,
    pruneFromBom,
    StringDict
} from "./bomlint";
const { Command } = require("commander");
const program = new Command();
const myPackageJson = require("../package.json");
const fs = require('fs')
const path = require('path');

program
    .name("bomlint")
    .version(myPackageJson.version)
    .description("Checks package dependencies against BOM")
    .option("--allow-conflicts <dependencies>]", "Allow conflicts for the dependencies (comma-separated)")
    .option("--fix", "Apply bom file to package dependencies")
    .option("--merge", "Add package dependencies to BOM file")
    .option("--prune", "Remove redundant dependencies from BOM file")
    .option("--bom <bomfile>", "Path to BOM file")
    .argument("[<file...>]", "package.json file(s) to be checked/fixed", "package.json")

program.parse(process.argv)

const options = program.opts();

const merge = options.merge ?? false; //process.argv.includes("--merge")
const fix = options.fix ?? false; // process.argv.includes("--fix")
const prune = options.prune ?? false;


if ([merge, fix, prune].filter(f => f).length === 1) {
    console.log("can use only one of merge, fix or prune");
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

const allowConflicts: Set<string> = new Set();
if (options.allowConflicts) {
    options.allowConflicts.split(",").forEach((ac: string) => allowConflicts.add(ac));
    console.log("Allowing conflicts", Array.from(allowConflicts).sort());
}

const pathsArg: string[] = program.args ?? ["package.json"];

if (prune) {
    const packageJsons = pathsArg.map(arg => path.relative(cwd, arg))
    console.log(`Pruning from BOM ${bomPath}, considering ${packageJsons.join(", ")}.`)
    const r = pruneFromBom(bom, packageJsons)
    if (r.count > 0) {
        fs.writeFileSync(bomPath, JSON.stringify(r.patchedBom, null, 2))
        console.log(`Pruned BOM written to ${bomPath}.`)
    } else {
        console.log(`No update needed.`)
    }
    process.exit(0)
}

let exitCode = 0;

let packagesToCheck: PackageToCheck[] = [];

pathsArg.forEach(pathArg => {
    const packageJsonPath = path.relative(cwd, pathArg)

    if (!fs.existsSync(packageJsonPath)) {
        console.log(`No package file ${packageJsonPath}.`)
        process.exit(1)
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath))

    packagesToCheck.push({
        path: pathArg,
        packageJson: packageJson
    });

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
});

const conflictingDeps = checkForConflictingDeps(packagesToCheck, allowConflicts);
if (conflictingDeps.length > 0) {
    console.log(`${conflictingDeps.length} conflicting dep(s) found :`);
    conflictingDeps.forEach(conflictingDep => {
        console.log(conflictingDep.dependency, conflictingDep.conflicts.map(c => [c.version, c.pkg.path]));
    });
    exitCode = 1;
}

process.exit(exitCode);