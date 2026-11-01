import z from "zod";
import { SharedConfig } from '../config'

export function configZod() {
    z.setErrorMap((issue, ctx) => {
        // Ловим undefined / null
        if (issue.code === 'invalid_type' && (issue.received === 'undefined' || issue.received === 'null')) {
            return { message: SharedConfig.get().labels.required };
        }

        return { message: ctx.defaultError };
    });
}

