#!/usr/bin/env node

// Align versions in a package.json file with versions in a .bomlint.json file.

import {
    checkForConflictingDeps,
    checkForUpdatesFromBom,
    findBomPath,
    mergeIntoBom,
    MissingPackagePath,
    PackageToCheck,
    pruneFromBom,
    StringDict
} from "./bomlint";
import { CheckCommand, MergeCommand, parseOptions, PruneCommand } from "./options";

const { Command } = require("commander");
const program = new Command();
const myPackageJson = require("../package.json");
const fs = require('fs')
const path = require('path');

const command = parseOptions(process.argv)

if (!command) {
    process.exit(1)
}

const cwd = process.cwd()

switch (command.command) {
    case "check":
        process.exit(doCheck(command))
    case "merge":
        process.exit(doMerge(command))
    case "prune":
        process.exit(doPrune(command))
}

function doCheck(check: CheckCommand): number {
    const [bomPath, bomContent] = readBom(check.bom)

    const allowed: Set<string> = new Set();
    if (check.allowConflicts) {
        check.allowConflicts.forEach((ac: string) => allowed.add(ac));
        console.log("Allowing conflicts", Array.from(allowed).sort());
    }

    const [packages, missing] = buildPackagesToCheck(check.files)

    let exitCode = missing.length
    packages.forEach(({ path, packageJson }) => {
        if (!packageJson) {
            exitCode += 1
            return
        }
        console.log(`Linting ${path}`)
        const { updates, patchedPackageJson } = checkForUpdatesFromBom(bomContent, packageJson)
        if (updates.length > 0) {
            if (check.fix ?? false) {
                fs.writeFileSync(path, JSON.stringify(patchedPackageJson, null, 2))
                console.log(`Updates written to ${path}.`, updates)
            } else {
                console.log(`Updates needed in ${path}.`, updates)
                exitCode += 1
            }
        }
    })

    const conflictingDeps = checkForConflictingDeps(packages, allowed)
    if (conflictingDeps.length > 0) {
        console.log(`${conflictingDeps.length} conflicting dep(s) found :`)
        conflictingDeps.forEach(conflictingDep => {
            console.log(conflictingDep.dependency, conflictingDep.conflicts.map(c => [c.version, c.pkg.path]))
        });
        exitCode += 1
    }

    return exitCode > 0 ? 1 : 0
}

function doMerge(merge: MergeCommand): number {
    const [bomPath, bomContent] = readBom(merge.bom)
    const [packages, missing] = buildPackagesToCheck(merge.files)
    const r = mergeIntoBom(packages, bomContent);
    if (r.count > 0) {
        fs.writeFileSync(bomPath, JSON.stringify(r.patchedBom, null, 2))
        console.log(`Merges written to BOM ${bomPath}.`)
    } else {
        console.log(`No merges needed.`)
    }
    return missing.length > 0 ? 1 : 0
}

function doPrune(prune: PruneCommand): number {
    const [bomPath, bomContent] = readBom(prune.bom)
    const packageJsons = prune.files.map(arg => path.relative(cwd, arg))
    console.log(`Pruning from BOM ${bomPath}, considering ${packageJsons.join(", ")}.`)
    const r = pruneFromBom(bomContent, packageJsons)
    if (r.count > 0) {
        fs.writeFileSync(bomPath, JSON.stringify(r.patchedBom, null, 2))
        console.log(`Pruned BOM written to ${bomPath}.`)
    } else {
        console.log(`No update needed.`)
    }
    return 0
}

function readBom(bom?: string): [string, StringDict] {
    const bomPath = bom ?? path.relative(cwd, findBomPath(cwd))
    if (!fs.existsSync(bomPath)) {
        console.log(`No BOM file ${bomPath}.`)
        process.exit(1)
    }
    console.log("Using BOM file " + bomPath)
    return [bomPath, JSON.parse(fs.readFileSync(bomPath))]
}

function buildPackagesToCheck(files: string[]): [PackageToCheck[], MissingPackagePath[]] {
    const missing: MissingPackagePath[] = []
    const packages: PackageToCheck[] = []
    files.forEach(file => {
        const packagePath = path.relative(cwd, file)
        if (!fs.existsSync(packagePath)) {
            console.log(`No package file ${packagePath}.`)
            missing.push(packagePath)
        } else {
            packages.push(<PackageToCheck>{
                path: packagePath,
                packageJson: JSON.parse(fs.readFileSync(packagePath))
            })
        }
    })
    return [packages, missing]
}
