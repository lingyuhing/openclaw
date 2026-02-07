import { Command } from "commander";
import { i18nRuntime } from "../i18n-runtime.js";
import { registerProgramCommands } from "./command-registry.js";
import { createProgramContext } from "./context.js";
import { configureProgramHelp } from "./help.js";
import { registerPreActionHooks } from "./preaction.js";

export function buildProgram() {
  const program = new Command();
  const ctx = createProgramContext();
  const argv = process.argv;

  configureProgramHelp(program, ctx);
  registerPreActionHooks(program, ctx.programVersion);

  program.option("--lang <code>", "Set language (en, zh, zh-CN, etc.)");

  program.hook("preAction", async (thisCommand, actionCommand) => {
    const opts = actionCommand.opts();
    if (opts.lang) {
      await i18nRuntime.setLanguage(opts.lang);
    }
  });

  registerProgramCommands(program, ctx, argv);

  return program;
}
