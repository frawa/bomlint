import { ParseOptions, createCommand } from "commander";
const myPackageJson = require("../package.json");

export type Command = { command: 'check', files: string[] }
    | { command: 'fix', files: string[] }
    | { command: 'merge', files: string[], bom?: string }
    | { command: 'prune', files: string[], bom?: string };

export type Help = string



export function parseOptions(args: readonly string[]): Command | Help {
    const program1 = createCommand()
    program1
        .name("bomlint")
        .version(myPackageJson.version)
        .description("Checks package dependencies against BOM")
        .option("--allow-conflicts <dependencies>]", "Allow conflicts for the dependencies (comma-separated)")
        .option("--fix", "Apply bom file to package dependencies")
        .option("--merge", "Add package dependencies to BOM file")
        .option("--prune", "Remove redundant dependencies from BOM file")
        .option("--bom <bomfile>", "Path to BOM file")
        .argument("[<file...>]", "package.json file(s) to be checked/fixed", "package.json")
        .action(args => {
            console.log('FW args', args)
        })
        // .exitOverride((err) => console.log('FW err', err));
        .exitOverride();
    try {
        program1.parse(args)
    } catch (err) {
        // console.log('FW err2', err)
        // program1.outputHelp() 
        return program1.helpInformation();
    }
    const opts1 = program1.opts()
    const args1 = program1.args
    console.log('FW', args, opts1, args1)

    if (opts1.fix) {
        return { command: 'fix', files: args1 };
    } else if (opts1.merge) {
        return { command: 'merge', bom: opts1.bom, files: args1 };
    } else if (opts1.prune) {
        return { command: 'prune', bom: opts1.bom, files: args1 };
    }

    return { command: 'check', files: args1 };
}
