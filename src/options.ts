import { ParseOptions, createCommand, Command as CommanderCommand } from "commander";
const myPackageJson = require("../package.json");

export type Command = { command: 'check', files: string[], bom?: string, allowConflicts?: string[] }
    | { command: 'fix', files: string[], bom?: string, allowConflicts?: string[] }
    | { command: 'merge', files: string[], bom?: string, allowConflicts?: string[] }
    | { command: 'prune', files: string[], bom?: string };

export function parseOptions(args: readonly string[]): Command | undefined {
    return parseOptions_(args)
}

export function parseOptionsWithOutput(args: readonly string[]): [Command | undefined, string] {
    const buffer: string[] = []
    const command = parseOptions_(args, (text: string) => buffer.push(text))
    return [command, buffer.join("\n")]
}

function parseOptions_(args: readonly string[], writeOut?: (text: string) => void): Command | undefined {
    const configure = (command: CommanderCommand) => {
        command.exitOverride()
        command.showHelpAfterError(true)
        writeOut && command.configureOutput({ writeOut, writeErr: writeOut })
        return command
    }
    const checkCommand = configure(
        createCommand('check')
            .description("Checks package dependencies against BOM")
            .option("--allow-conflicts <dependencies>]", "Allow conflicts for the dependencies (comma-separated)")
            .argument("[<file...>]", "package.json file(s) to be processed", "package.json")
    )

    const fixCommand = configure(
        createCommand('fix')
            .description("Fixes package dependencies against BOM")
            .option("--allow-conflicts <dependencies>]", "Allow conflicts for the dependencies (comma-separated)")
            .argument("[<file...>]", "package.json file(s) to be processed", "package.json")
    )

    const mergeCommand = configure(
        createCommand('merge')
            .description("Merges package dependencies into BOM")
            .option("--allow-conflicts <dependencies>]", "Allow conflicts for the dependencies (comma-separated)")
            .argument("[<file...>]", "package.json file(s) to be processed", "package.json")
    )

    const pruneCommand = configure(
        createCommand('prune')
            .description("Prune package dependencies from BOM")
            .argument("[<file...>]", "package.json file(s) to be processed", "package.json")
    )

    const program1 = configure(
        createCommand()
            .name("bomlint")
            .version(myPackageJson.version)
            .description("Align package dependencies with Bill of Materials (BOM).")
            .option("--bom <bomfile>", "Path to BOM file")
            .addCommand(checkCommand)
            .addCommand(fixCommand)
            .addCommand(mergeCommand)
            .addCommand(pruneCommand)
    )

    try {
        program1.parse(args)
    } catch (err) {
        return undefined;
    }
    
    const command = program1.args[0]
    const bom: string = program1.opts().bom

    switch (command) {
        case 'check': {
            const files = checkCommand.args
            const allowConflicts: string[] = checkCommand.opts().allowConflicts?.split(",")
            return { command: 'check', files, bom, allowConflicts };
        }
        case 'fix': {
            const files = fixCommand.args
            const allowConflicts = fixCommand.opts().allowConflicts?.split(",")
            return { command: 'fix', files, bom, allowConflicts };
        }
        case 'merge': {
            const files = mergeCommand.args
            const allowConflicts = mergeCommand.opts().allowConflicts?.split(",")
            return { command: 'merge', files, bom, allowConflicts };
        }
        case 'prune': {
            const files = pruneCommand.args
            return { command: 'prune', files, bom };
        }
    }
    return undefined;
}
